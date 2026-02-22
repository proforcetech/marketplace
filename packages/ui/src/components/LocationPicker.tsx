'use client';

import { useState, useId } from 'react';
import { cn } from '../lib/cn.js';
import { Button } from './Button.js';

export interface LocationPickerValue {
  address: string;
  latitude: number | null;
  longitude: number | null;
  radius: number;
}

export interface LocationPickerProps {
  /** Current value. */
  value: LocationPickerValue;
  /** Called when the location changes. */
  onChange: (value: LocationPickerValue) => void;
  /** Error message. */
  error?: string;
  /** Label. */
  label?: string;
  className?: string;
}

export function LocationPicker({
  value,
  onChange,
  error,
  label,
  className,
}: LocationPickerProps): JSX.Element {
  const id = useId();
  const errorId = `${id}-error`;
  const [isLocating, setIsLocating] = useState(false);
  const hasError = Boolean(error);

  function handleUseMyLocation(): void {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          ...value,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          address: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
        });
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
    );
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {label && (
        <label htmlFor={id} className="text-label text-neutral-800">
          {label}
        </label>
      )}

      {/* Address input + GPS button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </span>
          <input
            id={id}
            type="text"
            value={value.address}
            onChange={(e) => onChange({ ...value, address: e.target.value })}
            placeholder="Enter address or city"
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? errorId : undefined}
            className={cn(
              'w-full h-10 pl-10 pr-3 rounded-md border bg-white text-body-sm transition-colors duration-fast',
              'placeholder:text-neutral-400',
              'focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:border-primary-500',
              hasError ? 'border-error-500' : 'border-neutral-200',
            )}
          />
        </div>
        <Button
          variant="outline"
          size="md"
          onClick={handleUseMyLocation}
          isLoading={isLocating}
          leftIcon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
          }
          aria-label="Use my current location"
        >
          <span className="hidden sm:inline">Use my location</span>
        </Button>
      </div>

      {/* Radius slider */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor={`${id}-radius`} className="text-body-sm text-neutral-600">
            Search radius
          </label>
          <span className="text-body-sm font-medium text-primary-600">
            {value.radius} miles
          </span>
        </div>
        <input
          id={`${id}-radius`}
          type="range"
          min={1}
          max={100}
          step={1}
          value={value.radius}
          onChange={(e) => onChange({ ...value, radius: Number(e.target.value) })}
          className="w-full h-2 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-primary-500 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-sm"
          aria-label="Search radius in miles"
        />
        <div className="flex justify-between text-caption text-neutral-400">
          <span>1 mi</span>
          <span>100 mi</span>
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
