import { MILES_TO_METERS } from '../constants/limits.js';

/**
 * Convert miles to meters.
 */
export function milesToMeters(miles: number): number {
  return miles * MILES_TO_METERS;
}

/**
 * Convert meters to miles.
 */
export function metersToMiles(meters: number): number {
  return meters / MILES_TO_METERS;
}

/**
 * Format distance for display.
 * Under 0.1 miles shows "Nearby", otherwise shows rounded miles.
 */
export function formatDistance(meters: number): string {
  const miles = metersToMiles(meters);
  if (miles < 0.1) {
    return 'Nearby';
  }
  if (miles < 10) {
    return `${miles.toFixed(1)} mi`;
  }
  return `${Math.round(miles)} mi`;
}

/**
 * Format price for display.
 */
export function formatPrice(
  price: number | null | undefined,
  priceType: string,
  currency = 'USD',
): string {
  if (priceType === 'free') {
    return 'Free';
  }
  if (price == null) {
    return 'Contact for price';
  }

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);

  switch (priceType) {
    case 'obo':
      return `${formatted} OBO`;
    case 'hourly':
      return `${formatted}/hr`;
    case 'monthly':
      return `${formatted}/mo`;
    default:
      return formatted;
  }
}

/**
 * Generate a URL-safe slug from a string.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Truncate text to a maximum length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3).trimEnd() + '...';
}

/**
 * Calculate time ago string from a date.
 */
export function timeAgo(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
  return `${Math.floor(seconds / 31536000)}y ago`;
}
