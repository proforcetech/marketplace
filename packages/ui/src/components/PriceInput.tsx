'use client';

import { useId, type ChangeEvent } from 'react';
import { cn } from '../lib/cn.js';
import type { PriceType } from '@marketplace/shared';

export interface PriceInputProps {
  /** Current price value in cents or whole dollars. */
  value: number | null;
  /** Called when the price changes. */
  onValueChange: (value: number | null) => void;
  /** Current price type. */
  priceType: PriceType;
  /** Called when the price type changes. */
  onPriceTypeChange: (type: PriceType) => void;
  /** Error message. */
  error?: string;
  /** Optional label. */
  label?: string;
  className?: string;
}

const PRICE_TYPES: { value: PriceType; label: string }[] = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'obo', label: 'OBO' },
  { value: 'free', label: 'Free' },
  { value: 'hourly', label: 'Hourly' },
];

function formatWithCommas(value: string): string {
  const num = value.replace(/[^\d]/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('en-US');
}

export function PriceInput({
  value,
  onValueChange,
  priceType,
  onPriceTypeChange,
  error,
  label,
  className,
}: PriceInputProps): JSX.Element {
  const id = useId();
  const errorId = `${id}-error`;
  const hasError = Boolean(error);
  const isFree = priceType === 'free';

  const displayValue = value != null ? formatWithCommas(String(value)) : '';

  function handlePriceChange(e: ChangeEvent<HTMLInputElement>): void {
    const raw = e.target.value.replace(/[^\d]/g, '');
    if (raw === '') {
      onValueChange(null);
    } else {
      onValueChange(Number(raw));
    }
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-label text-neutral-800">
          {label}
        </label>
      )}
      <div className="flex gap-2">
        {/* Price input */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-body-md font-medium pointer-events-none">
            $
          </span>
          <input
            id={id}
            type="text"
            inputMode="numeric"
            value={isFree ? '' : displayValue}
            onChange={handlePriceChange}
            disabled={isFree}
            placeholder={isFree ? 'Free' : '0'}
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? errorId : undefined}
            className={cn(
              'w-full h-10 pl-7 pr-3 rounded-md border bg-white text-body-md font-medium transition-colors duration-fast',
              'placeholder:text-neutral-400',
              'focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:border-primary-500',
              'disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed',
              hasError ? 'border-error-500' : 'border-neutral-200',
            )}
          />
        </div>

        {/* Price type selector */}
        <div className="relative shrink-0">
          <select
            value={priceType}
            onChange={(e) => onPriceTypeChange(e.target.value as PriceType)}
            className="h-10 appearance-none rounded-md border border-neutral-200 bg-white pl-3 pr-8 text-body-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:border-primary-500"
            aria-label="Price type"
          >
            {PRICE_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>
      </div>
      {hasError && (
        <p id={errorId} className="text-caption text-error-500" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
