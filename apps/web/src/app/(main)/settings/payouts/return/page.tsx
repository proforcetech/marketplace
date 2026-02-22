'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import api from '@/lib/api';

export default function PayoutsReturnPage(): JSX.Element {
  const [status, setStatus] = useState<'loading' | 'active' | 'incomplete'>('loading');

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.connect.getStatus();
        if (res.data?.status === 'active') {
          setStatus('active');
        } else {
          setStatus('incomplete');
        }
      } catch {
        setStatus('incomplete');
      }
    })();
  }, []);

  if (status === 'loading') {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-500">Checking your account status…</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      {status === 'active' ? (
        <>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re all set!</h1>
          <p className="text-gray-500 text-sm mb-8">
            Your payout account is active. You can now receive payments when buyers purchase your
            listings in-app.
          </p>
        </>
      ) : (
        <>
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Setup in progress</h1>
          <p className="text-gray-500 text-sm mb-8">
            Stripe is reviewing your information. This usually takes a few minutes. Check back
            shortly — we&apos;ll update your account status automatically.
          </p>
        </>
      )}

      <Link
        href="/settings/payouts"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
      >
        Go to Payouts
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
