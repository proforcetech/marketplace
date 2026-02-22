'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, Star, Zap, Check } from 'lucide-react';
import { api } from '@/lib/api';

interface PageProps {
  params: { id: string };
}

type PromotionTier = 'bump' | 'featured' | 'spotlight';

interface PlanConfig {
  tier: PromotionTier;
  icon: typeof TrendingUp;
  title: string;
  price: string;
  duration: string;
  description: string;
  features: string[];
  buttonLabel: string;
  highlighted: boolean;
  badge: string | null;
  borderColor: string;
  buttonColor: string;
}

const PLANS: PlanConfig[] = [
  {
    tier: 'bump',
    icon: TrendingUp,
    title: 'Bump',
    price: '$2.99',
    duration: '24 hours',
    description: 'Reset your listing to the top of search results for 24 hours',
    features: [
      'Resets recency rank',
      'Appears as refreshed to buyers',
      'No badge shown',
    ],
    buttonLabel: 'Buy Bump',
    highlighted: false,
    badge: null,
    borderColor: 'border-gray-200',
    buttonColor: 'bg-gray-900 hover:bg-gray-800',
  },
  {
    tier: 'featured',
    icon: Star,
    title: 'Featured',
    price: '$9.99',
    duration: '7 days',
    description: 'Appear in featured slots at positions 1, 4, 7 on search results pages',
    features: [
      'Featured badge on listing card',
      'Priority placement in search',
      'Up to 3x more views',
      '7 days of promotion',
    ],
    buttonLabel: 'Buy Featured',
    highlighted: true,
    badge: 'Most Popular',
    borderColor: 'border-blue-500',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    tier: 'spotlight',
    icon: Zap,
    title: 'Spotlight',
    price: '$19.99',
    duration: '7 days',
    description: 'Exclusive position 0 slot above all results on page 1',
    features: [
      'Top of all search results',
      'Spotlight badge on listing card',
      'Maximum exposure',
      '7 days of promotion',
    ],
    buttonLabel: 'Buy Spotlight',
    highlighted: false,
    badge: null,
    borderColor: 'border-gray-200',
    buttonColor: 'bg-purple-600 hover:bg-purple-700',
  },
];

const TIER_TO_TYPE: Record<PromotionTier, string> = {
  bump: 'top_of_results',
  featured: 'featured',
  spotlight: 'category_spotlight',
};

const TIER_TO_DAYS: Record<PromotionTier, number> = {
  bump: 1,
  featured: 7,
  spotlight: 7,
};

export default function PromotePage({ params }: PageProps): JSX.Element {
  const router = useRouter();
  const listingId = params.id;

  const [listingTitle, setListingTitle] = useState<string | null>(null);
  const [isLoadingListing, setIsLoadingListing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingListing(true);
    api.listings
      .getById(listingId)
      .then((result) => {
        if (cancelled) return;
        const listing = result as unknown as { data: { title: string } };
        setListingTitle(listing.data?.title ?? (result as unknown as { title: string }).title);
      })
      .catch(() => {
        if (!cancelled) setListingTitle(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingListing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const handlePurchase = async (tier: PromotionTier): Promise<void> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await api.promotions.purchase({
        listingId,
        type: TIER_TO_TYPE[tier] as 'featured' | 'top_of_results' | 'category_spotlight',
        durationDays: TIER_TO_DAYS[tier],
      });

      // The API may return a Stripe checkout URL or a promotion object
      const response = result as unknown as {
        data: { checkoutUrl?: string; id?: string };
      };
      const checkoutUrl = response.data?.checkoutUrl;

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        // Fallback: redirect back to listing
        router.push(`/listings/${listingId}`);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to start checkout. Please try again.';
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href={`/listings/${listingId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to listing
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Promote your listing</h1>
        {isLoadingListing ? (
          <div className="mt-1 h-5 w-64 bg-gray-200 rounded animate-pulse" />
        ) : listingTitle ? (
          <p className="text-gray-500 mt-1">{listingTitle}</p>
        ) : null}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          return (
            <div
              key={plan.tier}
              className={`relative flex flex-col rounded-xl border-2 ${plan.borderColor} bg-white p-6 transition-shadow hover:shadow-lg ${
                plan.highlighted ? 'ring-2 ring-blue-500/20' : ''
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {plan.badge}
                </span>
              )}

              {/* Icon */}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  plan.tier === 'bump'
                    ? 'bg-gray-100 text-gray-600'
                    : plan.tier === 'featured'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-purple-100 text-purple-600'
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>

              {/* Title + price */}
              <h3 className="text-lg font-bold text-gray-900">{plan.title}</h3>
              <div className="mt-1 mb-3">
                <span className="text-2xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-sm text-gray-500"> / {plan.duration}</span>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-500 mb-5">{plan.description}</p>

              {/* Features */}
              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Button */}
              <button
                onClick={() => handlePurchase(plan.tier)}
                disabled={isSubmitting}
                className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${plan.buttonColor}`}
              >
                {isSubmitting ? 'Processing...' : plan.buttonLabel}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
