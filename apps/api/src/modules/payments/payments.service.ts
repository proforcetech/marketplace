import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { PurchasePromotionDto, PlanType } from './dto/purchase-promotion.dto';
import { InitiatePurchaseDto } from './dto/initiate-purchase.dto';
import { PaginationDto } from '../../common/pipes/validation.pipe';

// ─── Connect Account Helpers ──────────────────────────────────

function deriveConnectStatus(
  account: Stripe.Account,
): 'onboarding' | 'active' | 'restricted' {
  if (!account.details_submitted) return 'onboarding';
  if (account.charges_enabled && account.payouts_enabled) return 'active';
  return 'restricted';
}

// ─── Promotion Plan Definitions ──────────────────────────────

interface PromotionPlan {
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  priceDisplay: string;
  durationHours: number;
  placement: string;
  features: string[];
}

const PROMOTION_PLANS: Record<PlanType, PromotionPlan> = {
  [PlanType.BUMP]: {
    name: 'Bump',
    slug: 'bump',
    description: 'Move your listing to the top of search results for 24 hours',
    priceCents: 299,
    priceDisplay: '$2.99',
    durationHours: 24,
    placement: 'bump',
    features: ['Top of search results for 24 hours', 'Increased visibility'],
  },
  [PlanType.FEATURED]: {
    name: 'Featured',
    slug: 'featured',
    description: 'Featured badge and priority placement for 7 days',
    priceCents: 999,
    priceDisplay: '$9.99',
    durationHours: 168, // 7 days
    placement: 'featured',
    features: [
      'Featured badge on listing',
      'Priority in search results for 7 days',
      'Highlighted in category pages',
    ],
  },
  [PlanType.SPOTLIGHT]: {
    name: 'Spotlight',
    slug: 'spotlight',
    description: 'Category spotlight placement with featured badge for 7 days',
    priceCents: 1999,
    priceDisplay: '$19.99',
    durationHours: 168, // 7 days
    placement: 'spotlight',
    features: [
      'Category page spotlight placement',
      'Featured badge on listing',
      'Priority in search results for 7 days',
      'Maximum visibility',
    ],
  },
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly platformFeePercent: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      this.logger.warn('STRIPE_SECRET_KEY not set. Payment operations will fail.');
    }
    this.stripe = new Stripe(stripeKey ?? '', {
      apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
    });
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    this.platformFeePercent = Number(
      this.configService.get<string>('PLATFORM_FEE_PERCENT') ?? '10',
    );
  }

  /**
   * Return the available promotion plans with pricing.
   */
  getPlans(): PromotionPlan[] {
    return Object.values(PROMOTION_PLANS);
  }

  /**
   * Create a Stripe Checkout session for promoting a listing.
   * Server-side price enforcement: client never determines the charge amount.
   */
  async createCheckoutSession(
    userId: string,
    dto: PurchasePromotionDto,
  ): Promise<{ sessionId: string; url: string }> {
    const plan = PROMOTION_PLANS[dto.planType];
    if (!plan) {
      throw new BadRequestException('Invalid promotion plan');
    }

    // Validate listing exists and belongs to user
    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
      select: { id: true, userId: true, title: true, status: true },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.userId !== userId) {
      throw new ForbiddenException('You do not own this listing');
    }

    if (listing.status !== 'active') {
      throw new BadRequestException('Only active listings can be promoted');
    }

    // Check for existing active promotion on this listing
    const existingPromo = await this.prisma.promotionPurchase.findFirst({
      where: {
        listingId: dto.listingId,
        status: 'active',
        endsAt: { gt: new Date() },
      },
    });

    if (existingPromo) {
      throw new ConflictException('This listing already has an active promotion');
    }

    // Find or create the promotion plan record
    let promotion = await this.prisma.promotion.findUnique({
      where: { slug: plan.slug },
    });

    if (!promotion) {
      promotion = await this.prisma.promotion.create({
        data: {
          name: plan.name,
          slug: plan.slug,
          description: plan.description,
          durationHours: plan.durationHours,
          priceCents: plan.priceCents,
          placement: plan.placement as 'bump' | 'featured' | 'spotlight',
          isActive: true,
        },
      });
    }

    // Create a pending purchase record
    const purchase = await this.prisma.promotionPurchase.create({
      data: {
        userId,
        listingId: dto.listingId,
        promotionId: promotion.id,
        status: 'pending',
        amountCents: plan.priceCents,
      },
    });

    // Create Stripe Checkout session
    const successUrl = this.configService.get<string>('APP_URL') ?? 'http://localhost:3000';
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${plan.name} Promotion - ${listing.title}`,
              description: plan.description,
            },
            unit_amount: plan.priceCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        purchaseId: purchase.id,
        listingId: dto.listingId,
        planType: dto.planType,
        userId,
      },
      success_url: `${successUrl}/listings/${dto.listingId}?promotion=success`,
      cancel_url: `${successUrl}/listings/${dto.listingId}?promotion=cancelled`,
    });

    // Store the Stripe session ID on the purchase
    await this.prisma.promotionPurchase.update({
      where: { id: purchase.id },
      data: { stripePaymentId: session.id },
    });

    return {
      sessionId: session.id,
      url: session.url ?? '',
    };
  }

  /**
   * Handle Stripe webhook events.
   * Verifies signature and processes checkout.session.completed events.
   */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
    } catch (error) {
      this.logger.warn(`Stripe webhook signature verification failed: ${(error as Error).message}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }
      case 'account.updated': {
        await this.handleConnectAccountUpdated(event.data.object as Stripe.Account);
        break;
      }
      case 'payment_intent.succeeded': {
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      }
      case 'payment_intent.payment_failed': {
        await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      }
      default:
        this.logger.log(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  /**
   * Get a user's promotions (active + past, paginated).
   */
  async getUserPromotions(
    userId: string,
    pagination: PaginationDto,
  ): Promise<{ promotions: Record<string, unknown>[]; total: number }> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;

    const where = { userId };

    const [promotions, total] = await Promise.all([
      this.prisma.promotionPurchase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          listing: { select: { id: true, title: true, slug: true } },
          promotion: { select: { name: true, slug: true, placement: true } },
        },
      }),
      this.prisma.promotionPurchase.count({ where }),
    ]);

    return { promotions, total };
  }

  /**
   * Get analytics for a specific promotion purchase.
   */
  async getPromotionAnalytics(
    userId: string,
    promotionPurchaseId: string,
  ): Promise<Record<string, unknown>> {
    const purchase = await this.prisma.promotionPurchase.findUnique({
      where: { id: promotionPurchaseId },
      include: {
        listing: { select: { id: true, title: true } },
        promotion: { select: { name: true, placement: true } },
      },
    });

    if (!purchase) {
      throw new NotFoundException('Promotion not found');
    }

    if (purchase.userId !== userId) {
      throw new ForbiddenException('You do not own this promotion');
    }

    const clickThroughRate =
      purchase.impressions > 0
        ? Number(((purchase.clicks / purchase.impressions) * 100).toFixed(2))
        : 0;

    const messageRate =
      purchase.impressions > 0
        ? Number(
            ((purchase.messagesReceived / purchase.impressions) * 100).toFixed(2),
          )
        : 0;

    return {
      ...purchase,
      analytics: {
        impressions: purchase.impressions,
        clicks: purchase.clicks,
        messagesReceived: purchase.messagesReceived,
        clickThroughRate,
        messageRate,
      },
    };
  }

  /**
   * Increment analytics counters for a promotion.
   * Called by listing view/click/message handlers.
   */
  async trackAnalytics(
    listingId: string,
    type: 'impression' | 'click' | 'message',
  ): Promise<void> {
    const activePromo = await this.prisma.promotionPurchase.findFirst({
      where: {
        listingId,
        status: 'active',
        endsAt: { gt: new Date() },
      },
    });

    if (!activePromo) {
      return;
    }

    const updateData: Record<string, { increment: number }> = {};
    switch (type) {
      case 'impression':
        updateData['impressions'] = { increment: 1 };
        break;
      case 'click':
        updateData['clicks'] = { increment: 1 };
        break;
      case 'message':
        updateData['messagesReceived'] = { increment: 1 };
        break;
    }

    await this.prisma.promotionPurchase
      .update({
        where: { id: activePromo.id },
        data: updateData,
      })
      .catch((err: Error) => {
        this.logger.warn(`Failed to track promotion analytics: ${err.message}`);
      });
  }

  // ─── Stripe Connect ───────────────────────────────────────────

  /**
   * Create (or retrieve) a Stripe Express Connect account for the seller
   * and return a one-time onboarding link URL.
   */
  async onboardConnectAccount(userId: string): Promise<{ url: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, stripeConnectAccountId: true },
    });

    if (!user) throw new NotFoundException('User not found');

    let accountId = user.stripeConnectAccountId;

    if (!accountId) {
      const account = await this.stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          stripeConnectAccountId: accountId,
          connectAccountStatus: 'onboarding',
        },
      });
    }

    const appUrl = this.configService.get<string>('APP_URL') ?? 'http://localhost:3000';
    const accountLink = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/settings/payouts/refresh`,
      return_url: `${appUrl}/settings/payouts/return`,
      type: 'account_onboarding',
    });

    this.logger.log(`Connect onboarding link created for user ${userId}`);
    return { url: accountLink.url };
  }

  /**
   * Return the current Connect account status for a seller.
   */
  async getConnectStatus(userId: string): Promise<{
    status: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
    requirements: string[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeConnectAccountId: true, connectAccountStatus: true },
    });

    if (!user) throw new NotFoundException('User not found');

    if (!user.stripeConnectAccountId) {
      return {
        status: 'not_connected',
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        requirements: [],
      };
    }

    const account = await this.stripe.accounts.retrieve(
      user.stripeConnectAccountId,
    );

    return {
      status: user.connectAccountStatus,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
      requirements: account.requirements?.currently_due ?? [],
    };
  }

  /**
   * Generate a Stripe Express dashboard login link for an active seller.
   */
  async generateDashboardLink(userId: string): Promise<{ url: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeConnectAccountId: true, connectAccountStatus: true },
    });

    if (!user) throw new NotFoundException('User not found');

    if (!user.stripeConnectAccountId) {
      throw new BadRequestException('No Connect account set up yet');
    }

    if (user.connectAccountStatus !== 'active') {
      throw new BadRequestException(
        'Connect account is not fully active yet. Complete onboarding first.',
      );
    }

    const loginLink = await this.stripe.accounts.createLoginLink(
      user.stripeConnectAccountId,
    );

    return { url: loginLink.url };
  }

  // ─── In-App Checkout ──────────────────────────────────────────

  /**
   * Create a PaymentIntent that routes funds through the platform to the
   * seller's Connect account. Returns a client secret for Stripe.js.
   */
  async createPurchaseIntent(
    buyerId: string,
    dto: InitiatePurchaseDto,
  ): Promise<{ clientSecret: string; publishableKey: string; transactionId: string }> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
      select: {
        id: true,
        title: true,
        userId: true,
        status: true,
        price: true,
        priceType: true,
        user: {
          select: {
            id: true,
            stripeConnectAccountId: true,
            connectAccountStatus: true,
          },
        },
      },
    });

    if (!listing) throw new NotFoundException('Listing not found');
    if (listing.status !== 'active') {
      throw new BadRequestException('Listing is not available for purchase');
    }
    if (listing.userId === buyerId) {
      throw new BadRequestException('You cannot purchase your own listing');
    }
    if (listing.priceType !== 'fixed' || !listing.price) {
      throw new BadRequestException('This listing does not have a fixed price');
    }
    if (listing.user.connectAccountStatus !== 'active') {
      throw new BadRequestException(
        'The seller has not completed payment setup yet',
      );
    }
    if (!listing.user.stripeConnectAccountId) {
      throw new InternalServerErrorException('Seller payment account not found');
    }

    const amountCents = listing.price;
    const platformFeeCents = Math.round(
      (amountCents * this.platformFeePercent) / 100,
    );
    const sellerPayoutCents = amountCents - platformFeeCents;

    // Persist a pending transaction record first
    const transaction = await this.prisma.transaction.create({
      data: {
        listingId: listing.id,
        buyerId,
        sellerId: listing.userId,
        amountCents,
        platformFeeCents,
        sellerPayoutCents,
        status: 'pending',
      },
    });

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: listing.user.stripeConnectAccountId,
      },
      metadata: {
        transactionId: transaction.id,
        listingId: listing.id,
        buyerId,
        sellerId: listing.userId,
      },
    });

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        stripePaymentIntentId: paymentIntent.id,
        status: 'processing',
      },
    });

    const publishableKey =
      this.configService.get<string>('STRIPE_PUBLISHABLE_KEY') ?? '';

    this.logger.log(
      `Purchase intent created: transaction=${transaction.id}, listing=${listing.id}, ` +
        `amount=${amountCents}¢, fee=${platformFeeCents}¢`,
    );

    return {
      clientSecret: paymentIntent.client_secret!,
      publishableKey,
      transactionId: transaction.id,
    };
  }

  /**
   * Return paginated transactions for a user (as buyer or seller).
   */
  async getTransactions(
    userId: string,
    pagination: PaginationDto,
  ): Promise<{ transactions: Record<string, unknown>[]; total: number }> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;

    const where = {
      OR: [{ buyerId: userId }, { sellerId: userId }],
    };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          listing: { select: { id: true, title: true, slug: true } },
          buyer: { select: { id: true, displayName: true, avatarUrl: true } },
          seller: { select: { id: true, displayName: true, avatarUrl: true } },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return { transactions, total };
  }

  /**
   * Expire promotions that have passed their end date.
   * Designed to be called by a cron job.
   */
  async expirePromotions(): Promise<number> {
    const now = new Date();

    const expired = await this.prisma.promotionPurchase.updateMany({
      where: {
        status: 'active',
        endsAt: { lte: now },
      },
      data: { status: 'expired' },
    });

    if (expired.count > 0) {
      this.logger.log(`Expired ${expired.count} promotions`);

      // Also update the listing isPromoted flag for expired promotions
      // This is a best-effort denormalization update
      const expiredPurchases = await this.prisma.promotionPurchase.findMany({
        where: {
          status: 'expired',
          endsAt: { lte: now, gte: new Date(now.getTime() - 60000) }, // last minute
        },
        select: { listingId: true },
      });

      for (const p of expiredPurchases) {
        // Only set isPromoted=false if no other active promo exists for this listing
        const otherActive = await this.prisma.promotionPurchase.findFirst({
          where: {
            listingId: p.listingId,
            status: 'active',
            endsAt: { gt: now },
          },
        });

        if (!otherActive) {
          await this.prisma.listing
            .update({
              where: { id: p.listingId },
              data: { isPromoted: false },
            })
            .catch((err: Error) => {
              this.logger.warn(`Failed to update listing promotion status: ${err.message}`);
            });
        }
      }
    }

    return expired.count;
  }

  // ─── Private Webhook Handlers ─────────────────────────────────

  private async handleConnectAccountUpdated(account: Stripe.Account): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { stripeConnectAccountId: account.id },
      select: { id: true },
    });

    if (!user) {
      this.logger.warn(`account.updated: no user found for Connect account ${account.id}`);
      return;
    }

    const connectAccountStatus = deriveConnectStatus(account);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { connectAccountStatus },
    });

    this.logger.log(
      `Connect account ${account.id} status → ${connectAccountStatus} (user ${user.id})`,
    );
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (!transaction) return;

    // Retrieve transfer ID from the payment intent charges if available
    const transferId =
      typeof paymentIntent.transfer_data?.destination === 'string'
        ? paymentIntent.transfer_data.destination
        : undefined;

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'completed',
        ...(transferId ? { stripeTransferId: transferId } : {}),
      },
    });

    this.logger.log(
      `Transaction ${transaction.id} completed (payment_intent=${paymentIntent.id})`,
    );
  }

  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });

    if (!transaction) return;

    await this.prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'failed' },
    });

    this.logger.log(
      `Transaction ${transaction.id} failed (payment_intent=${paymentIntent.id})`,
    );
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const purchaseId = session.metadata?.purchaseId;
    if (!purchaseId) {
      this.logger.warn('Checkout session completed without purchaseId metadata');
      return;
    }

    const purchase = await this.prisma.promotionPurchase.findUnique({
      where: { id: purchaseId },
      include: { promotion: true },
    });

    if (!purchase) {
      this.logger.warn(`Purchase not found for checkout session: ${purchaseId}`);
      return;
    }

    if (purchase.status !== 'pending') {
      this.logger.log(`Purchase ${purchaseId} already processed (status: ${purchase.status})`);
      return;
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + purchase.promotion.durationHours * 60 * 60 * 1000);

    // Activate the promotion
    await this.prisma.promotionPurchase.update({
      where: { id: purchaseId },
      data: {
        status: 'active',
        stripePaymentId: session.payment_intent as string,
        startsAt: now,
        endsAt,
      },
    });

    // Set listing as promoted
    await this.prisma.listing.update({
      where: { id: purchase.listingId },
      data: { isPromoted: true },
    });

    this.logger.log(
      `Promotion activated: purchase=${purchaseId}, listing=${purchase.listingId}, ` +
        `plan=${purchase.promotion.slug}, endsAt=${endsAt.toISOString()}`,
    );
  }
}
