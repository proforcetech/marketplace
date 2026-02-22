'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, ArrowLeft, Zap, Star, Crown } from 'lucide-react';
import api from '@/lib/api';

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPriceCents: number;
  dailyListingLimit: number;
  monthlyListingLimit: number;
  monthlyPromoBudgetCents: number;
  features: string[];
}

interface ActiveSubscription {
  id: string;
  tier: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

const TIER_ICONS: Record<string, React.ReactNode> = {
  basic: <Zap className="w-5 h-5" />,
  pro: <Star className="w-5 h-5" />,
  unlimited: <Crown className="w-5 h-5" />,
};

const TIER_COLORS: Record<string, string> = {
  basic: 'blue',
  pro: 'violet',
  unlimited: 'amber',
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function SubscriptionPage(): JSX.Element {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');

  const [plans, setPlans] = useState<Plan[]>([]);
  const [current, setCurrent] = useState<ActiveSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [plansRes, currentRes] = await Promise.all([
          api.subscriptions.getPlans(),
          api.subscriptions.getCurrent(),
        ]);
        setPlans((plansRes as unknown as { data: Plan[] }).data ?? []);
        setCurrent((currentRes as unknown as { data: ActiveSubscription | null }).data ?? null);
      } catch {
        // Not logged in or error — show plans as guest
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleSubscribe = async (tier: string) => {
    setCheckoutLoading(tier);
    try {
      const res = await api.subscriptions.createCheckout(tier);
      const { url } = (res as unknown as { data: { url: string } }).data;
      window.location.href = url;
    } catch {
      setCheckoutLoading(null);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await api.subscriptions.cancel();
      window.location.reload();
    } catch {
      setIsCancelling(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/profile" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Seller Plans</h1>
      </div>
      <p className="text-gray-500 ml-8 mb-8">
        Upgrade for more daily listings, promotional credits, and priority support.
      </p>

      {statusParam === 'success' && (
        <div className="mb-6 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          Your subscription is now active. Welcome aboard!
        </div>
      )}
      {statusParam === 'cancelled' && (
        <div className="mb-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 text-sm">
          Checkout cancelled — your plan was not changed.
        </div>
      )}

      {/* Active subscription banner */}
      {current && !cancelConfirm && (
        <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-blue-800 capitalize">
              {current.tier} plan — {current.status}
            </p>
            <p className="text-sm text-blue-600 mt-0.5">
              {current.cancelAtPeriodEnd
                ? `Cancels on ${new Date(current.currentPeriodEnd).toLocaleDateString()}`
                : `Renews on ${new Date(current.currentPeriodEnd).toLocaleDateString()}`}
            </p>
          </div>
          {!current.cancelAtPeriodEnd && (
            <button
              onClick={() => setCancelConfirm(true)}
              className="text-xs text-red-500 hover:text-red-700 font-medium shrink-0"
            >
              Cancel plan
            </button>
          )}
        </div>
      )}

      {cancelConfirm && (
        <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl">
          <p className="font-semibold text-red-800 mb-2">Cancel your subscription?</p>
          <p className="text-sm text-red-600 mb-4">
            You&apos;ll keep your benefits until the end of the billing period. This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => void handleCancel()}
              disabled={isCancelling}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {isCancelling ? 'Cancelling…' : 'Yes, cancel'}
            </button>
            <button
              onClick={() => setCancelConfirm(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Keep my plan
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const color = TIER_COLORS[plan.id] ?? 'blue';
            const isCurrentTier = current?.tier === plan.id && current.status === 'active';

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border-2 p-6 flex flex-col ${
                  isCurrentTier
                    ? `border-${color}-400 bg-${color}-50`
                    : 'border-gray-100 bg-white hover:border-gray-200'
                } transition-colors`}
              >
                {isCurrentTier && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 bg-${color}-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full`}>
                    Current plan
                  </span>
                )}

                <div className={`inline-flex items-center gap-2 text-${color}-600 mb-3`}>
                  {TIER_ICONS[plan.id]}
                  <span className="font-semibold">{plan.name}</span>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(plan.monthlyPriceCents)}
                  </span>
                  <span className="text-gray-400 text-sm">/mo</span>
                </div>

                <p className="text-sm text-gray-500 mb-5">{plan.description}</p>

                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className={`w-4 h-4 text-${color}-500 shrink-0 mt-0.5`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => void handleSubscribe(plan.id)}
                  disabled={isCurrentTier || !!checkoutLoading}
                  className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                    isCurrentTier
                      ? 'bg-gray-100 text-gray-400 cursor-default'
                      : `bg-${color}-600 text-white hover:bg-${color}-700 disabled:opacity-50`
                  }`}
                >
                  {checkoutLoading === plan.id
                    ? 'Redirecting…'
                    : isCurrentTier
                    ? 'Current plan'
                    : 'Subscribe'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center mt-8">
        Subscriptions are billed monthly. Cancel anytime — you keep access until the period ends.
        Payments processed securely by Stripe.
      </p>
    </div>
  );
}
