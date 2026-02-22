'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Star } from 'lucide-react';
import { api } from '@/lib/api';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  otherUserId: string;
  otherUserName: string;
  onSuccess?: () => void;
}

export default function RatingModal({
  isOpen,
  onClose,
  listingId,
  listingTitle,
  otherUserId,
  otherUserName,
  onSuccess,
}: RatingModalProps): JSX.Element | null {
  const [selectedScore, setSelectedScore] = useState(0);
  const [hoveredScore, setHoveredScore] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedScore(0);
      setHoveredScore(0);
      setComment('');
      setError(null);
      setShowSuccess(false);
    }
  }, [isOpen]);

  // Keyboard: Escape closes
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    },
    [isOpen, isSubmitting, onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (): Promise<void> => {
    if (selectedScore === 0) {
      setError('Please select a rating.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.ratings.submit({
        conversationId: listingId, // The API expects conversationId per the shared type
        score: selectedScore,
        comment: comment.trim() || undefined,
      });

      setShowSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to submit rating. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayScore = hoveredScore || selectedScore;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />

      {/* Modal card */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 z-10">
        {/* Close button */}
        <button
          onClick={() => {
            if (!isSubmitting) onClose();
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {showSuccess ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="w-7 h-7 text-green-600 fill-green-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900">Thanks for your review!</p>
          </div>
        ) : (
          <>
            {/* Title */}
            <h2 className="text-lg font-bold text-gray-900 mb-1 pr-8">Rate your experience</h2>
            <p className="text-sm text-gray-500 mb-6">
              How was your transaction with{' '}
              <span className="font-medium text-gray-700">{otherUserName}</span> for{' '}
              <span className="font-medium text-gray-700">{listingTitle}</span>?
            </p>

            {/* Star rating */}
            <div className="flex items-center gap-1 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedScore(star)}
                  onMouseEnter={() => setHoveredScore(star)}
                  onMouseLeave={() => setHoveredScore(0)}
                  className="p-1 transition-transform hover:scale-110"
                  aria-label={`${star} star${star !== 1 ? 's' : ''}`}
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= displayScore
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              {displayScore > 0 && (
                <span className="text-sm text-gray-500 ml-2">
                  {displayScore} / 5
                </span>
              )}
            </div>

            {/* Comment */}
            <div className="mb-6">
              <label htmlFor="rating-comment" className="block text-sm font-medium text-gray-700 mb-1">
                Comment (optional)
              </label>
              <textarea
                id="rating-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share details about your experience..."
                rows={3}
                maxLength={1000}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">{error}</p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedScore === 0}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
