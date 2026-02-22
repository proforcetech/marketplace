'use client';

import { useState } from 'react';
import { DollarSign, X, Check } from 'lucide-react';
import api from '@/lib/api';

interface OfferButtonProps {
  listingId: string;
  listingTitle: string;
  sellerId: string;
  /** The existing conversation ID (if buyer has already messaged the seller) */
  conversationId?: string;
}

type Step = 'closed' | 'amount' | 'confirm' | 'success';

export default function OfferButton({
  listingId,
  conversationId,
}: OfferButtonProps): JSX.Element {
  const [step, setStep] = useState<Step>('closed');
  const [amountStr, setAmountStr] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amountCents = Math.round(parseFloat(amountStr || '0') * 100);
  const isValid = amountCents >= 1 && !Number.isNaN(amountCents);

  const handleSubmit = async () => {
    if (!isValid) return;

    if (!conversationId) {
      setError('Start a conversation with the seller first, then make an offer.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await api.offers.create({
        listingId,
        conversationId,
        amountCents,
        message: message || undefined,
      });
      setStep('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send offer. Please try again.');
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setStep('closed');
    setAmountStr('');
    setMessage('');
    setError('');
    setIsSubmitting(false);
  };

  if (step === 'success') {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
        <Check className="w-4 h-4 shrink-0" />
        Offer sent! The seller will be notified.
      </div>
    );
  }

  return (
    <div className="mt-2">
      {step === 'closed' ? (
        <button
          onClick={() => setStep('amount')}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <DollarSign className="w-4 h-4" />
          Make an offer
        </button>
      ) : (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900 text-sm">Make an offer</h4>
            <button onClick={reset} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Your offer amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Message (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note to your offer..."
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            onClick={() => void handleSubmit()}
            disabled={!isValid || isSubmitting}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Sending…' : `Send offer · $${isValid ? (amountCents / 100).toFixed(2) : '0.00'}`}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Offers expire after 48 hours if not responded to.
          </p>
        </div>
      )}
    </div>
  );
}
