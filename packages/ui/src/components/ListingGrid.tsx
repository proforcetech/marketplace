'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { ListingCard, type ListingCardProps } from './ListingCard';
import { SkeletonCard } from './SkeletonCard';
import { EmptyState } from './EmptyState';
import type { ListingSummary } from '@marketplace/shared';

export type ListingGridLayout = 'grid' | 'list';

export interface ListingGridProps {
  /** Array of listings to render. */
  listings: ListingSummary[];
  /** Whether the grid is in a loading state (shows skeletons). */
  isLoading?: boolean;
  /** Whether there are more listings available to load. */
  hasMore?: boolean;
  /** Called when the sentinel element enters the viewport. */
  onLoadMore?: () => void;
  /** Grid or list layout. */
  layout?: ListingGridLayout;
  /** Custom empty state message. */
  emptyMessage?: string;
  /** Custom empty state icon. */
  emptyIcon?: ReactNode;
  /** Custom empty state action. */
  emptyAction?: { label: string; onClick: () => void };
  /** Called when a listing card is clicked. */
  onListingClick?: (id: string) => void;
  /** Called when a listing is favorited. */
  onFavorite?: (id: string) => void;
  /** Set of favorited listing IDs. */
  favoritedIds?: Set<string>;
  /** Callback to toggle between grid and list layout. */
  onLayoutChange?: (layout: ListingGridLayout) => void;
  className?: string;
}

function LayoutToggle({
  layout,
  onLayoutChange,
}: {
  layout: ListingGridLayout;
  onLayoutChange: (layout: ListingGridLayout) => void;
}): JSX.Element {
  return (
    <div
      className="inline-flex items-center rounded-md border border-neutral-200 p-0.5"
      role="radiogroup"
      aria-label="Layout view"
    >
      <button
        type="button"
        role="radio"
        aria-checked={layout === 'grid'}
        aria-label="Grid view"
        onClick={() => onLayoutChange('grid')}
        className={cn(
          'p-1.5 rounded transition-colors duration-fast',
          layout === 'grid'
            ? 'bg-primary-50 text-primary-600'
            : 'text-neutral-400 hover:text-neutral-600',
        )}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={layout === 'list'}
        aria-label="List view"
        onClick={() => onLayoutChange('list')}
        className={cn(
          'p-1.5 rounded transition-colors duration-fast',
          layout === 'list'
            ? 'bg-primary-50 text-primary-600'
            : 'text-neutral-400 hover:text-neutral-600',
        )}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </button>
    </div>
  );
}

const SKELETON_COUNT = 8;

export function ListingGrid({
  listings,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  layout = 'grid',
  emptyMessage = 'No listings found',
  emptyIcon,
  emptyAction,
  onListingClick,
  onFavorite,
  favoritedIds,
  onLayoutChange,
  className,
}: ListingGridProps): JSX.Element {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!hasMore || !onLoadMore || isLoading) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '200% 0px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, isLoading]);

  // Initial loading state with no existing listings
  if (isLoading && listings.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        {onLayoutChange && (
          <div className="flex items-center justify-end">
            <LayoutToggle layout={layout} onLayoutChange={onLayoutChange} />
          </div>
        )}
        <div
          className={cn(
            layout === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4'
              : 'flex flex-col gap-3',
          )}
        >
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <SkeletonCard key={`skeleton-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (!isLoading && listings.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        {onLayoutChange && (
          <div className="flex items-center justify-end">
            <LayoutToggle layout={layout} onLayoutChange={onLayoutChange} />
          </div>
        )}
        <EmptyState
          icon={
            emptyIcon ?? (
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            )
          }
          title={emptyMessage}
          description="Try expanding your search radius or adjusting your filters."
          action={emptyAction}
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {onLayoutChange && (
        <div className="flex items-center justify-end">
          <LayoutToggle layout={layout} onLayoutChange={onLayoutChange} />
        </div>
      )}

      {/* Listing cards */}
      <div
        className={cn(
          layout === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4'
            : 'flex flex-col gap-3',
        )}
      >
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            onClick={onListingClick}
            onFavorite={onFavorite}
            isFavorited={favoritedIds?.has(listing.id) ?? false}
          />
        ))}

        {/* Loading skeletons appended during load-more */}
        {isLoading &&
          Array.from({ length: 4 }, (_, i) => (
            <SkeletonCard key={`loading-skeleton-${i}`} />
          ))}
      </div>

      {/* Sentinel element for infinite scroll */}
      {hasMore && !isLoading && (
        <div ref={sentinelRef} className="h-1" aria-hidden="true" />
      )}

      {/* Screen reader announcement for loaded content */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {listings.length} listing{listings.length !== 1 ? 's' : ''} displayed
      </div>
    </div>
  );
}
