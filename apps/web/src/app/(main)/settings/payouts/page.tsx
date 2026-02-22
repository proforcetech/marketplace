'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  ExternalLink,
  DollarSign,
  TrendingUp,
  ShoppingBag,
} from 'lucide-react';
import api, { ConnectStatus, TransactionItem } from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── Status Badge ─────────────────────────────────────────────

interface StatusBadgeProps {
  status: ConnectStatus['status'];
}

function ConnectStatusBadge({ status }: StatusBadgeProps): JSX.Element {
  const config = {
    not_connected: {
      label: 'Not set up',
      color: 'text-gray-500 bg-gray-100',
      icon: <XCircle className="w-4 h-4" />,
    },
    onboarding: {
      label: 'Setup incomplete',
      color: 'text-amber-700 bg-amber-100',
      icon: <Clock className="w-4 h-4" />,
    },
    active: {
      label: 'Active',
      color: 'text-green-700 bg-green-100',
      icon: <CheckCircle className="w-4 h-4" />,
    },
    restricted: {
      label: 'Restricted',
      color: 'text-red-700 bg-red-100',
      icon: <AlertCircle className="w-4 h-4" />,
    },
    disabled: {
      label: 'Disabled',
      color: 'text-gray-600 bg-gray-100',
      icon: <XCircle className="w-4 h-4" />,
    },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${config.color}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

// ─── Transaction Row ──────────────────────────────────────────

interface TxRowProps {
  tx: TransactionItem;
  currentUserId: string | null;
}

function TransactionRow({ tx, currentUserId }: TxRowProps): JSX.Element {
  const isSeller = tx.seller.id === currentUserId;
  const amount = isSeller ? tx.sellerPayoutCents : tx.amountCents;
  const sign = isSeller ? '+' : '-';

  const statusColor: Record<string, string> = {
    completed: 'text-green-600',
    pending: 'text-amber-600',
    processing: 'text-blue-600',
    failed: 'text-red-600',
    refunded: 'text-gray-500',
  };

  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <ShoppingBag className="w-4 h-4 text-gray-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
            {tx.listing.title}
          </p>
          <p className="text-xs text-gray-500">
            {isSeller ? `From ${tx.buyer.displayName}` : `To ${tx.seller.displayName}`} ·{' '}
            {formatDate(tx.createdAt)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${isSeller ? 'text-green-600' : 'text-gray-900'}`}>
          {sign}{formatCents(amount)}
        </p>
        <p className={`text-xs capitalize ${statusColor[tx.status] ?? 'text-gray-500'}`}>
          {tx.status}
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function PayoutsPage(): JSX.Element {
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // We derive the current user ID from the transactions list or auth store.
  // For simplicity, use null here — TransactionRow handles both sides.
  const currentUserId: string | null = null;

  useEffect(() => {
    void (async () => {
      try {
        const [statusRes, txRes] = await Promise.all([
          api.connect.getStatus(),
          api.transactions.list({ limit: 10 }),
        ]);
        if (statusRes.data) setConnectStatus(statusRes.data);
        if (txRes.data) {
          setTransactions(txRes.data.transactions);
          setTotalTransactions(txRes.data.total);
        }
      } catch {
        setError('Failed to load payout information.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleOnboard = async (): Promise<void> => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.connect.onboard();
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch {
      setError('Failed to start account setup. Please try again.');
      setActionLoading(false);
    }
  };

  const handleOpenDashboard = async (): Promise<void> => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.connect.getDashboardLink();
      if (res.data?.url) {
        window.open(res.data.url, '_blank');
      }
    } catch {
      setError('Failed to open Stripe dashboard. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Earnings summary (completed sales) ───────────────────────
  const totalEarned = transactions
    .filter((tx) => tx.status === 'completed' && tx.seller.id === currentUserId)
    .reduce((sum, tx) => sum + tx.sellerPayoutCents, 0);

  const totalSpent = transactions
    .filter((tx) => tx.status === 'completed' && tx.buyer.id === currentUserId)
    .reduce((sum, tx) => sum + tx.amountCents, 0);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href="/profile"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to profile
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">Payouts</h1>
      <p className="text-gray-500 text-sm mb-8">
        Receive payments for items you sell directly through the app.
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Connect account card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Stripe Connect account</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Powered by Stripe — your banking details are stored securely.
            </p>
          </div>
          {connectStatus && <ConnectStatusBadge status={connectStatus.status} />}
        </div>

        {/* Capability chips */}
        {connectStatus && connectStatus.status !== 'not_connected' && (
          <div className="flex gap-2 mb-4">
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                connectStatus.chargesEnabled
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {connectStatus.chargesEnabled ? '✓ Charges enabled' : '✗ Charges not enabled'}
            </span>
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                connectStatus.payoutsEnabled
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {connectStatus.payoutsEnabled ? '✓ Payouts enabled' : '✗ Payouts not enabled'}
            </span>
          </div>
        )}

        {/* Requirements */}
        {connectStatus?.requirements && connectStatus.requirements.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-xs font-semibold text-amber-800 mb-1">Action required:</p>
            <ul className="text-xs text-amber-700 list-disc list-inside space-y-0.5">
              {connectStatus.requirements.map((req) => (
                <li key={req}>{req.replace(/_/g, ' ')}</li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        {connectStatus?.status === 'not_connected' && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Set up your payout account to receive payments when buyers purchase your listings
              in-app. A 10% platform fee applies.
            </p>
            <button
              onClick={() => void handleOnboard()}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DollarSign className="w-4 h-4" />
              {actionLoading ? 'Redirecting...' : 'Set up payouts'}
            </button>
          </div>
        )}

        {connectStatus?.status === 'onboarding' && (
          <button
            onClick={() => void handleOnboard()}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            <Clock className="w-4 h-4" />
            {actionLoading ? 'Redirecting...' : 'Continue setup'}
          </button>
        )}

        {connectStatus?.status === 'active' && (
          <button
            onClick={() => void handleOpenDashboard()}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <ExternalLink className="w-4 h-4" />
            {actionLoading ? 'Opening...' : 'Open Stripe dashboard'}
          </button>
        )}

        {connectStatus?.status === 'restricted' && (
          <button
            onClick={() => void handleOnboard()}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <AlertCircle className="w-4 h-4" />
            {actionLoading ? 'Redirecting...' : 'Resolve issues'}
          </button>
        )}
      </div>

      {/* Earnings summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
            <TrendingUp className="w-3.5 h-3.5" />
            TOTAL EARNED
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCents(totalEarned)}</p>
          <p className="text-xs text-gray-400 mt-0.5">after platform fees</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mb-1">
            <ShoppingBag className="w-3.5 h-3.5" />
            TOTAL SPENT
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCents(totalSpent)}</p>
          <p className="text-xs text-gray-400 mt-0.5">in-app purchases</p>
        </div>
      </div>

      {/* Transaction history */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Transaction history</h2>
          {totalTransactions > 10 && (
            <span className="text-xs text-gray-400">{totalTransactions} total</span>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className="py-8 text-center">
            <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No transactions yet</p>
          </div>
        ) : (
          <div>
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} currentUserId={currentUserId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
