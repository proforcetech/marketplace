'use client';

import Link from 'next/link';
import { useState } from 'react';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';

export default function PayoutsRefreshPage(): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRestart = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.connect.onboard();
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch {
      setError('Unable to generate a new setup link. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <RefreshCw className="w-8 h-8 text-amber-600" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Link expired</h1>
      <p className="text-gray-500 text-sm mb-8">
        The Stripe setup link has expired. This happens if the link was open for too long or was
        already used. Generate a fresh link to continue setting up your payout account.
      </p>

      {error && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => void handleRestart()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Generating link…' : 'Get a new setup link'}
        </button>

        <Link
          href="/settings/payouts"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Payouts
        </Link>
      </div>
    </div>
  );
}
