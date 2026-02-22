import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SUBSCRIPTION_PLANS,
  TIER_DAILY_LISTING_LIMITS,
  DEFAULT_DAILY_LISTING_LIMIT,
  SubscriptionPlan,
} from './subscription-plans';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      this.logger.warn('STRIPE_SECRET_KEY not set. Subscription operations will fail.');
    }
    this.stripe = new Stripe(stripeKey ?? '', {
      apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
    });
    this.webhookSecret =
      this.configService.get<string>('STRIPE_SUBSCRIPTION_WEBHOOK_SECRET') ?? '';
  }

  /**
   * Return all available subscription plans as an array.
   */
  getPlans(): SubscriptionPlan[] {
    return Object.values(SUBSCRIPTION_PLANS);
  }

  /**
   * Get the current active or trialing subscription for a user.
   * Returns null if the user has no active subscription.
   */
  async getCurrentSubscription(
    userId: string,
  ): Promise<Record<string, unknown> | null> {
    const subscription = await this.prisma.sellerSubscription.findFirst({
      where: {
        userId,
        status: { in: ['active', 'trialing'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    return subscription as unknown as Record<string, unknown> | null;
  }

  /**
   * Create a Stripe Checkout Session in subscription mode for the given tier.
   * Returns the checkout URL for the client to redirect to.
   */
  async createCheckoutSession(
    userId: string,
    tier: string,
  ): Promise<{ url: string }> {
    const plan = SUBSCRIPTION_PLANS[tier];
    if (!plan) {
      throw new BadRequestException(`Invalid subscription tier: ${tier}`);
    }

    if (!plan.stripeMonthlyPriceId) {
      throw new BadRequestException(
        'Subscription plan is not configured. Please contact support.',
      );
    }

    // Check for existing active subscription
    const existing = await this.prisma.sellerSubscription.findFirst({
      where: {
        userId,
        status: { in: ['active', 'trialing'] },
      },
    });

    if (existing) {
      throw new BadRequestException(
        'You already have an active subscription. Please cancel it first or manage it from your account settings.',
      );
    }

    const webUrl = this.configService.get<string>('WEB_URL') ?? 'http://localhost:3000';

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripeMonthlyPriceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        tier,
      },
      subscription_data: {
        metadata: {
          userId,
          tier,
        },
      },
      success_url: `${webUrl}/settings/subscription?status=success`,
      cancel_url: `${webUrl}/settings/subscription?status=cancelled`,
    });

    if (!session.url) {
      throw new BadRequestException('Failed to create checkout session');
    }

    return { url: session.url };
  }

  /**
   * Handle incoming Stripe webhook events for subscription lifecycle.
   * Verifies the webhook signature before processing.
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
      this.logger.warn(
        `Stripe subscription webhook signature verification failed: ${(error as Error).message}`,
      );
      throw new BadRequestException('Invalid webhook signature');
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await this.handleSubscriptionUpsert(
          event.data.object as Stripe.Subscription,
        );
        break;
      }
      case 'customer.subscription.deleted': {
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      }
      case 'invoice.payment_failed': {
        await this.handlePaymentFailed(
          event.data.object as Stripe.Invoice,
        );
        break;
      }
      default:
        this.logger.log(`Unhandled subscription webhook event: ${event.type}`);
    }
  }

  /**
   * Cancel the user's active subscription at the end of the current billing period.
   * Does not immediately revoke access -- the subscription remains active until period end.
   */
  async cancelSubscription(userId: string): Promise<void> {
    const subscription = await this.prisma.sellerSubscription.findFirst({
      where: {
        userId,
        status: { in: ['active', 'trialing'] },
      },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    if (!subscription.stripeSubscriptionId) {
      throw new BadRequestException(
        'Subscription has no associated Stripe subscription',
      );
    }

    // Tell Stripe to cancel at period end rather than immediately
    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Mark in our database
    await this.prisma.sellerSubscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: true },
    });

    this.logger.log(
      `Subscription cancel-at-period-end set: userId=${userId}, subId=${subscription.stripeSubscriptionId}`,
    );
  }

  // ─── Private Webhook Handlers ─────────────────────────────────

  private async handleSubscriptionUpsert(
    stripeSubscription: Stripe.Subscription,
  ): Promise<void> {
    const userId = stripeSubscription.metadata?.userId;
    const tier = stripeSubscription.metadata?.tier;

    if (!userId || !tier) {
      this.logger.warn(
        `Subscription event missing metadata: subId=${stripeSubscription.id}`,
      );
      return;
    }

    const plan = SUBSCRIPTION_PLANS[tier];
    if (!plan) {
      this.logger.warn(`Unknown subscription tier in metadata: ${tier}`);
      return;
    }

    const status = this.mapStripeStatus(stripeSubscription.status);

    // Upsert the SellerSubscription record
    await this.prisma.sellerSubscription.upsert({
      where: {
        stripeSubscriptionId: stripeSubscription.id,
      },
      create: {
        userId,
        tier,
        status,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId:
          typeof stripeSubscription.customer === 'string'
            ? stripeSubscription.customer
            : stripeSubscription.customer.id,
        currentPeriodStart: new Date(
          stripeSubscription.current_period_start * 1000,
        ),
        currentPeriodEnd: new Date(
          stripeSubscription.current_period_end * 1000,
        ),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        monthlyListingLimit: plan.monthlyListingLimit,
        monthlyPromoBudgetCents: plan.monthlyPromoBudgetCents,
      },
      update: {
        tier,
        status,
        currentPeriodStart: new Date(
          stripeSubscription.current_period_start * 1000,
        ),
        currentPeriodEnd: new Date(
          stripeSubscription.current_period_end * 1000,
        ),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        monthlyListingLimit: plan.monthlyListingLimit,
        monthlyPromoBudgetCents: plan.monthlyPromoBudgetCents,
      },
    });

    // Update user's daily listing limit based on tier
    const dailyLimit = TIER_DAILY_LISTING_LIMITS[tier] ?? DEFAULT_DAILY_LISTING_LIMIT;
    await this.prisma.user.update({
      where: { id: userId },
      data: { dailyListingLimit: dailyLimit },
    });

    this.logger.log(
      `Subscription upserted: userId=${userId}, tier=${tier}, status=${status}`,
    );
  }

  private async handleSubscriptionDeleted(
    stripeSubscription: Stripe.Subscription,
  ): Promise<void> {
    const existing = await this.prisma.sellerSubscription.findUnique({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!existing) {
      this.logger.warn(
        `No local subscription found for deleted Stripe subscription: ${stripeSubscription.id}`,
      );
      return;
    }

    await this.prisma.sellerSubscription.update({
      where: { id: existing.id },
      data: { status: 'cancelled' },
    });

    // Reset user to default listing limit
    await this.prisma.user.update({
      where: { id: existing.userId },
      data: { dailyListingLimit: DEFAULT_DAILY_LISTING_LIMIT },
    });

    this.logger.log(
      `Subscription cancelled: userId=${existing.userId}, subId=${stripeSubscription.id}`,
    );
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId =
      typeof invoice.subscription === 'string'
        ? invoice.subscription
        : invoice.subscription?.id;

    if (!subscriptionId) {
      this.logger.warn('Payment failed event without subscription ID');
      return;
    }

    const existing = await this.prisma.sellerSubscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!existing) {
      this.logger.warn(
        `No local subscription found for failed payment: subId=${subscriptionId}`,
      );
      return;
    }

    await this.prisma.sellerSubscription.update({
      where: { id: existing.id },
      data: { status: 'past_due' },
    });

    // Create a notification for the user about the failed payment
    await this.prisma.notification
      .create({
        data: {
          userId: existing.userId,
          type: 'payment_failed',
          title: 'Payment Failed',
          body: 'Your subscription payment failed. Please update your payment method to avoid service interruption.',
          isRead: false,
        },
      })
      .catch((err: Error) => {
        this.logger.warn(`Failed to create payment-failed notification: ${err.message}`);
      });

    this.logger.log(
      `Subscription marked past_due: userId=${existing.userId}, subId=${subscriptionId}`,
    );
  }

  /**
   * Map Stripe subscription status to our internal status string.
   */
  private mapStripeStatus(stripeStatus: Stripe.Subscription.Status): string {
    switch (stripeStatus) {
      case 'active':
        return 'active';
      case 'trialing':
        return 'trialing';
      case 'past_due':
        return 'past_due';
      case 'canceled':
      case 'unpaid':
        return 'cancelled';
      case 'incomplete':
      case 'incomplete_expired':
        return 'incomplete';
      case 'paused':
        return 'paused';
      default:
        return 'unknown';
    }
  }
}
