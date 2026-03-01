import { cn } from '../lib/cn';

export interface SkeletonCardProps {
  className?: string;
}

/**
 * Loading placeholder card matching ListingCard dimensions.
 * Uses the shared `.skeleton` shimmer animation from globals.css.
 */
export function SkeletonCard({ className }: SkeletonCardProps): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-lg border border-neutral-200 bg-white overflow-hidden',
        className,
      )}
      aria-hidden="true"
    >
      {/* Image placeholder - 4:3 aspect ratio matching ListingCard */}
      <div className="aspect-[4/3] skeleton" />

      {/* Content placeholder matching ListingCard content area */}
      <div className="p-3 space-y-2">
        {/* Title bar */}
        <div className="h-4 w-3/4 skeleton" />
        {/* Price bar */}
        <div className="h-5 w-1/3 skeleton" />
        {/* Location bar */}
        <div className="h-3 w-1/2 skeleton" />
        {/* Metadata bar */}
        <div className="h-4 w-1/4 skeleton" />
      </div>
    </div>
  );
}
