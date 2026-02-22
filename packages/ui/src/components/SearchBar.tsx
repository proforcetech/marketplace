'use client';

import { useState, type FormEvent } from 'react';
import { cn } from '../lib/cn.js';

export interface SearchBarValues {
  query: string;
  location: string;
  radius: number;
}

export interface SearchBarProps {
  /** Initial values. */
  defaultValues?: Partial<SearchBarValues>;
  /** Called when the user submits the search. */
  onSearch: (values: SearchBarValues) => void;
  /** Whether a search is in progress. */
  isLoading?: boolean;
  className?: string;
}

const RADIUS_OPTIONS = [
  { value: 5, label: '5 mi' },
  { value: 10, label: '10 mi' },
  { value: 25, label: '25 mi' },
  { value: 50, label: '50 mi' },
  { value: 100, label: '100 mi' },
];

export function SearchBar({
  defaultValues,
  onSearch,
  isLoading = false,
  className,
}: SearchBarProps): JSX.Element {
  const [query, setQuery] = useState(defaultValues?.query ?? '');
  const [location, setLocation] = useState(defaultValues?.location ?? '');
  const [radius, setRadius] = useState(defaultValues?.radius ?? 25);

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    onSearch({ query, location, radius });
  }

  return (
    <form
      role="search"
      aria-label="Search marketplace listings"
      onSubmit={handleSubmit}
      className={cn(
        'w-full bg-white rounded-lg shadow-sm border border-neutral-200',
        'flex flex-col sm:flex-row sm:items-center gap-2 p-2 sm:p-2',
        className,
      )}
    >
      {/* Location input */}
      <div className="relative flex-1 min-w-0">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </span>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City or ZIP code"
          className="w-full h-10 pl-10 pr-3 rounded-md border-0 bg-neutral-50 text-body-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:bg-primary-50"
          aria-label="Location"
        />
      </div>

      {/* Radius selector */}
      <div className="relative shrink-0">
        <select
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="h-10 appearance-none rounded-md border-0 bg-neutral-50 pl-3 pr-8 text-body-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:bg-primary-50"
          aria-label="Search radius"
        >
          {RADIUS_OPTIONS.map((opt) => (
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

      {/* Keyword input */}
      <div className="relative flex-[2] min-w-0">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cars, furniture, jobs..."
          className="w-full h-10 pl-10 pr-3 rounded-md border-0 bg-neutral-50 text-body-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:bg-primary-50"
          aria-label="Search keywords"
        />
      </div>

      {/* Search button */}
      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          'h-10 px-6 rounded-md bg-primary-500 text-white text-label font-medium',
          'hover:bg-primary-600 active:bg-primary-700 transition-colors duration-fast',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          'shrink-0',
        )}
      >
        {isLoading ? (
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          'Search'
        )}
      </button>
    </form>
  );
}
