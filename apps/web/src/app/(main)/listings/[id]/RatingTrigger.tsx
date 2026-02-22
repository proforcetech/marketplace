'use client';

import { useState } from 'react';
import RatingModal from '@/components/RatingModal';

interface RatingTriggerProps {
  listingId: string;
  listingTitle: string;
  sellerId: string;
  sellerName: string;
  listingStatus: string;
}

export default function RatingTrigger({
  listingId,
  listingTitle,
  sellerId,
  sellerName,
  listingStatus,
}: RatingTriggerProps): JSX.Element | null {
  const [open, setOpen] = useState(false);

  if (listingStatus !== 'sold') return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full mt-3 py-2 px-4 border border-amber-300 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
      >
        ★ Rate your experience with {sellerName}
      </button>
      <RatingModal
        isOpen={open}
        onClose={() => setOpen(false)}
        listingId={listingId}
        listingTitle={listingTitle}
        otherUserId={sellerId}
        otherUserName={sellerName}
        onSuccess={() => setOpen(false)}
      />
    </>
  );
}
