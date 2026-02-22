'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TrendingUp, Star, Zap, Eye, MousePointerClick, MessageCircle, Plus } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';

type PromotionTab = 'active' | 'expired';

interface PromotionItem {
  id: string;
  type: string;
  listingId: string;
  listingTitle?: string;
  status: string;
  endsAt: string;
  startsAt: string;
  impressions: number;
  clicks: number;
  messagesReceived: number;
}

const TIER_CONFIG: Record<string, { label: string; icon: typeof Star; badgeClass: string }> = {
  top_of_results: {
    label: 'Bump',
    icon: TrendingUp,
    badgeClass: 'bg-gray-100 text-gray-700',
  },
  featured: {
    label: 'Featured',
    icon: Star,
    badgeClass: 'bg-blue-100 text-blue-700',
  },
  category_spotlight: {
    label: 'Spotlight',
    icon: Zap,
    badgeClass: 'bg-purple-100 text-purple-700',
  },
};

function getTierConfig(type: string): { label: string; icon: typeof Star; badgeClass: string } {
  return (
    TIER_CONFIG[type] ?? {
      label: type,
      icon: Star,
      badgeClass: 'bg-gray-100 text-gray-700',
    }
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PromotionsPage(): JSX.Element {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [tab, setTab] = useState<PromotionTab>('active');
  const [promotions, setPromotions] = useState<PromotionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setIsLoading(true);

    api.promotions
      .getMyPromotions()
      .then((result) => {
        if (cancelled) return;
        const data = result as unknown as { data: PromotionItem[] };
        const items = Array.isArray(data.data) ? data.data : [];
        setPromotions(items);
      })
      .catch(() => {
        if (!cancelled) setPromotions([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const filtered = promotions.filter((p) => {
    if (tab === 'active') return p.status === 'active' || p.status === 'pending';
    return p.status === 'expired' || p.status === 'cancelled' || p.status === 'refunded';
  });

  if (!isAuthenticated) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Redirecting...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Promotions</h1>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {(['active', 'expired'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse border border-gray-100 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-20 h-6 bg-gray-200 rounded" />
                <div className="w-48 h-5 bg-gray-200 rounded" />
              </div>
              <div className="flex gap-6">
                <div className="w-32 h-4 bg-gray-200 rounded" />
                <div className="w-32 h-4 bg-gray-200 rounded" />
                <div className="w-32 h-4 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-lg font-medium text-gray-900 mb-1">
            {tab === 'active' ? 'No active promotions' : 'No expired promotions'}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {tab === 'active'
              ? 'Promote a listing to get more visibility and reach more buyers.'
              : 'Your past promotions will appear here.'}
          </p>
          {tab === 'active' && (
            <Link
              href="/listings/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create a listing
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((promo) => {
            const config = getTierConfig(promo.type);
            const Icon = config.icon;
            const isActive = promo.status === 'active' || promo.status === 'pending';
            const expiryLabel = isActive
              ? `Expires ${formatDate(promo.endsAt)}`
              : `Expired ${formatDate(promo.endsAt)}`;

            return (
              <div
                key={promo.id}
                className="border border-gray-100 rounded-xl p-5 hover:shadow-sm transition-shadow bg-white"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    {/* Tier badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.badgeClass}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {config.label}
                    </span>

                    {/* Listing title */}
                    <Link
                      href={`/listings/${promo.listingId}`}
                      className="font-medium text-gray-900 hover:text-blue-600 transition-colors truncate max-w-xs"
                    >
                      {promo.listingTitle ?? 'Untitled listing'}
                    </Link>
                  </div>

                  {/* Expiry */}
                  <span
                    className={`text-xs font-medium ${
                      isActive ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    {expiryLabel}
                  </span>
                </div>

                {/* Analytics row */}
                <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-gray-400" />
                    <strong className="text-gray-900">{promo.impressions.toLocaleString()}</strong>{' '}
                    impressions
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MousePointerClick className="w-4 h-4 text-gray-400" />
                    <strong className="text-gray-900">{promo.clicks.toLocaleString()}</strong> clicks
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-gray-400" />
                    <strong className="text-gray-900">
                      {promo.messagesReceived.toLocaleString()}
                    </strong>{' '}
                    messages
                  </span>
                </div>

                {/* Promote again CTA for active tab */}
                {isActive && (
                  <div className="mt-4 pt-4 border-t border-gray-50">
                    <Link
                      href={`/listings/${promo.listingId}/promote`}
                      className="text-sm text-blue-600 font-medium hover:underline"
                    >
                      Promote again
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
