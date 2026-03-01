'use client';

import { useState } from 'react';
import { cn } from '../lib/cn';

export type RatingStarsSize = 'sm' | 'md';

export interface RatingStarsDisplayProps {
  /** Rating value (0-5, supports half increments). */
  rating: number;
  /** Total number of reviews. */
  count?: number;
  /** Size preset. */
  size?: RatingStarsSize;
  /** Show the numeric rating value. */
  showValue?: boolean;
  className?: string;
}

export interface RatingStarsInputProps {
  /** Current selected value. */
  value: number;
  /** Called when a star is clicked. */
  onChange: (value: number) => void;
  /** Size preset. */
  size?: RatingStarsSize;
  className?: string;
}

const sizeConfig: Record<RatingStarsSize, { star: number; text: string }> = {
  sm: { star: 16, text: 'text-caption' },
  md: { star: 20, text: 'text-body-sm' },
};

function StarIcon({
  fill,
  size,
}: {
  fill: 'full' | 'half' | 'empty';
  size: number;
}): JSX.Element {
  if (fill === 'full') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="text-accent-300">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  }
  if (fill === 'half') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className="text-accent-300">
        <defs>
          <linearGradient id="half-star">
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="#E4E4E7" />
          </linearGradient>
        </defs>
        <path fill="url(#half-star)" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#E4E4E7">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function renderStars(rating: number, starSize: number): JSX.Element[] {
  const stars: JSX.Element[] = [];
  for (let i = 1; i <= 5; i++) {
    let fill: 'full' | 'half' | 'empty' = 'empty';
    if (rating >= i) fill = 'full';
    else if (rating >= i - 0.5) fill = 'half';
    stars.push(<StarIcon key={i} fill={fill} size={starSize} />);
  }
  return stars;
}

/** Read-only star rating display. */
export function RatingStars({
  rating,
  count,
  size = 'md',
  showValue = true,
  className,
}: RatingStarsDisplayProps): JSX.Element {
  const config = sizeConfig[size];

  return (
    <div
      className={cn('inline-flex items-center gap-1', className)}
      aria-label={`Rating: ${rating.toFixed(1)} out of 5${count != null ? `, ${count} reviews` : ''}`}
    >
      <div className="flex items-center gap-0.5">
        {renderStars(rating, config.star)}
      </div>
      {showValue && (
        <span className={cn('font-medium text-neutral-700', config.text)}>
          {rating.toFixed(1)}
        </span>
      )}
      {count != null && (
        <span className={cn('text-neutral-500', config.text)}>
          ({count.toLocaleString()})
        </span>
      )}
    </div>
  );
}

/** Interactive star rating input. */
export function RatingStarsInput({
  value,
  onChange,
  size = 'md',
  className,
}: RatingStarsInputProps): JSX.Element {
  const [hoverValue, setHoverValue] = useState(0);
  const config = sizeConfig[size];
  const displayValue = hoverValue || value;

  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      role="radiogroup"
      aria-label="Rating"
      onMouseLeave={() => setHoverValue(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`Rate ${star} out of 5 stars`}
          onMouseEnter={() => setHoverValue(star)}
          onClick={() => onChange(star)}
          className="p-0.5 rounded transition-transform duration-fast hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/50"
        >
          <StarIcon
            fill={displayValue >= star ? 'full' : 'empty'}
            size={config.star}
          />
        </button>
      ))}
    </div>
  );
}
