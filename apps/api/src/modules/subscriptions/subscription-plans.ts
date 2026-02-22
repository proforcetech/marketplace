/**
 * Seller subscription plan definitions.
 *
 * Stripe price IDs are loaded from environment variables at module evaluation time.
 * This is acceptable for constants files (not services) per project conventions.
 */

export interface SubscriptionPlan {
  tier: string;
  name: string;
  priceMonthly: number; // cents
  monthlyListingLimit: number; // -1 = unlimited
  monthlyPromoBudgetCents: number;
  features: string[];
  stripeMonthlyPriceId: string;
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  basic: {
    tier: 'basic',
    name: 'Basic Seller',
    priceMonthly: 999,
    monthlyListingLimit: 50,
    monthlyPromoBudgetCents: 0,
    features: [
      '50 listings/month',
      'Priority search ranking',
      'Analytics dashboard',
    ],
    stripeMonthlyPriceId: process.env['STRIPE_PRICE_BASIC_MONTHLY'] ?? '',
  },
  pro: {
    tier: 'pro',
    name: 'Pro Seller',
    priceMonthly: 2499,
    monthlyListingLimit: 200,
    monthlyPromoBudgetCents: 2000,
    features: [
      '200 listings/month',
      '$20 monthly promo credit',
      'Featured seller badge',
      'Advanced analytics',
    ],
    stripeMonthlyPriceId: process.env['STRIPE_PRICE_PRO_MONTHLY'] ?? '',
  },
  unlimited: {
    tier: 'unlimited',
    name: 'Unlimited Seller',
    priceMonthly: 4999,
    monthlyListingLimit: -1,
    monthlyPromoBudgetCents: 5000,
    features: [
      'Unlimited listings',
      '$50 monthly promo credit',
      'Spotlight badge',
      'Dedicated support',
      'Storefront customization',
    ],
    stripeMonthlyPriceId: process.env['STRIPE_PRICE_UNLIMITED_MONTHLY'] ?? '',
  },
} as const;

/**
 * Map tier names to daily listing limits applied on the user record.
 * The free/default tier gets 10 (phone-verified default).
 */
export const TIER_DAILY_LISTING_LIMITS: Record<string, number> = {
  basic: 50,
  pro: 200,
  unlimited: 9999,
};

export const DEFAULT_DAILY_LISTING_LIMIT = 10;
