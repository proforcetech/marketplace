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
import { PaginationDto } from '../../common/pipes/validation.pipe';

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

  // ─── Private Helpers ──────────────────────────────────────────

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
