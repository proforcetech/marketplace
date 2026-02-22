'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import api from '@/lib/api';

export default function VerificationPage(): JSX.Element {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  useEffect(() => {
    api.users.getMe().then((res) => {
      const user = (res as unknown as { data?: { identityVerified: boolean }; identityVerified?: boolean });
      setIsVerified(user.data?.identityVerified ?? user.identityVerified ?? false);
    }).catch(() => setIsVerified(false));
  }, []);

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const res = await api.identity.startVerification();
      const { url } = (res as unknown as { data: { url: string } }).data;
      window.location.href = url;
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/profile" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Identity Verification</h1>
      </div>

      {statusParam === 'complete' && (
        <div className="mb-6 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          Verification submitted. Your badge will appear once approved (usually within 1 business day).
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
        {isVerified ? (
          <>
            <ShieldCheck className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">You&apos;re verified!</h2>
            <p className="text-gray-500 text-sm">
              Your identity has been verified. A blue checkmark badge appears on your profile and listings,
              helping buyers trust you more.
            </p>
          </>
        ) : (
          <>
            <ShieldAlert className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-2">Verify your identity</h2>
            <p className="text-gray-500 text-sm mb-6">
              Identity verification helps build trust with buyers. Verified sellers get a blue checkmark badge,
              higher search ranking, and increased daily listing limits.
            </p>

            <div className="text-left space-y-3 mb-6 bg-gray-50 rounded-xl p-4">
              {[
                'Blue verified badge on your profile',
                'Higher visibility in search results',
                'Increased daily listing limit',
                'Greater buyer confidence',
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-2 text-sm text-gray-700">
                  <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                  {benefit}
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 mb-4">
              Powered by Stripe Identity. You&apos;ll need a government-issued ID. Takes about 2 minutes.
            </p>

            <button
              onClick={() => void handleStart()}
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting…
                </>
              ) : (
                'Start verification'
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
