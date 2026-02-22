'use client';

import { useState, type MouseEvent } from 'react';
import { cn } from '../lib/cn.js';
import { Badge } from './Badge.js';
import type { ListingSummary, ItemCondition } from '@marketplace/shared';

export interface ListingCardProps {
  listing: ListingSummary;
  /** Called when the card is clicked (navigation). */
  onClick?: (id: string) => void;
  /** Called when the favorite button is toggled. */
  onFavorite?: (id: string) => void;
  /** Whether the listing is in the user's favorites. */
  isFavorited?: boolean;
  className?: string;
}

const conditionLabels: Record<ItemCondition, string> = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  na: '',
};

function formatPrice(price: number | null, priceType: string): string {
  if (priceType === 'free' || price === null || price === 0) return 'Free';
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
  if (priceType === 'obo') return `${formatted} OBO`;
  if (priceType === 'hourly') return `${formatted}/hr`;
  if (priceType === 'monthly') return `${formatted}/mo`;
  return formatted;
}

function formatDistance(distanceMeters?: number): string | null {
  if (distanceMeters == null) return null;
  const miles = distanceMeters / 1609.34;
  if (miles < 0.1) return 'Nearby';
  if (miles < 1) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function ListingCard({
  listing,
  onClick,
  onFavorite,
  isFavorited = false,
  className,
}: ListingCardProps): JSX.Element {
  const [imgLoaded, setImgLoaded] = useState(false);

  const handleFavoriteClick = (e: MouseEvent): void => {
    e.stopPropagation();
    e.preventDefault();
    onFavorite?.(listing.id);
  };

  const distanceText = formatDistance(listing.distance);
  const conditionLabel = conditionLabels[listing.condition];
  const priceText = formatPrice(listing.price, listing.priceType);
  const isFree = listing.priceType === 'free' || listing.price === null || listing.price === 0;

  return (
    <a
      href={`/listings/${listing.id}`}
      onClick={(e) => {
        if (onClick) {
          e.preventDefault();
          onClick(listing.id);
        }
      }}
      className={cn(
        'group block rounded-lg border border-neutral-200 bg-white shadow-xs overflow-hidden',
        'transition-all duration-fast hover:shadow-md hover:-translate-y-0.5',
        'active:scale-[0.98] active:duration-100',
        className,
      )}
      aria-label={`${listing.title}, ${priceText}`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-neutral-100 overflow-hidden">
        {listing.thumbnailUrl ? (
          <>
            {!imgLoaded && (
              <div className="absolute inset-0 skeleton" />
            )}
            <img
              src={listing.thumbnailUrl}
              alt={listing.title}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              className={cn(
                'w-full h-full object-cover transition-transform duration-fast group-hover:scale-[1.02]',
                !imgLoaded && 'opacity-0',
              )}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-300">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}

        {/* Promoted badge */}
        {listing.isPromoted && (
          <span className="absolute top-2 left-2">
            <Badge variant="sponsored" size="sm">Sponsored</Badge>
          </span>
        )}

        {/* Favorite button */}
        {onFavorite && (
          <button
            type="button"
            onClick={handleFavoriteClick}
            className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-colors duration-fast touch-target"
            aria-label={`${isFavorited ? 'Remove from' : 'Save to'} favorites: ${listing.title}`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={isFavorited ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isFavorited ? 'text-error-500' : 'text-neutral-600'}
            >
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Title */}
        <h3 className="text-heading-sm text-neutral-900 truncate-1">{listing.title}</h3>

        {/* Price */}
        <p className={cn('mt-1 text-heading-md', isFree ? 'text-success-600' : 'text-primary-700')}>
          {priceText}
        </p>

        {/* Location + distance */}
        <div className="flex items-center gap-1 mt-1.5 text-body-sm text-neutral-500">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="truncate">{listing.locationText}</span>
          {distanceText && (
            <>
              <span className="text-neutral-300">|</span>
              <span className="shrink-0">{distanceText}</span>
            </>
          )}
        </div>

        {/* Metadata row */}
        <div className="flex items-center gap-2 mt-2">
          {conditionLabel && (
            <Badge variant="default" size="sm">{conditionLabel}</Badge>
          )}
          <span className="text-caption text-neutral-400">
            {timeAgo(listing.publishedAt)}
          </span>
        </div>
      </div>
    </a>
  );
}

/** Skeleton placeholder for loading state. */
export function ListingCardSkeleton(): JSX.Element {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
      <div className="aspect-[4/3] skeleton" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-3/4 skeleton" />
        <div className="h-5 w-1/3 skeleton" />
        <div className="h-3 w-1/2 skeleton" />
        <div className="h-4 w-1/4 skeleton" />
      </div>
    </div>
  );
}
