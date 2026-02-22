import { MMKV } from 'react-native-mmkv';

/**
 * Fast synchronous cache backed by react-native-mmkv.
 *
 * Used for offline-first patterns: cache API responses so the user
 * sees stale data immediately while fresh data loads in the background.
 * Entries auto-expire after CACHE_TTL_MS.
 */

const storage = new MMKV({ id: 'listing-cache' });

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

/**
 * Store a value in the cache. Automatically timestamps the entry.
 */
export function setCached<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = { data, cachedAt: Date.now() };
  storage.set(key, JSON.stringify(entry));
}

/**
 * Retrieve a cached value. Returns null if the key is missing,
 * the entry has expired, or the stored data cannot be parsed.
 */
export function getCached<T>(key: string): T | null {
  const raw = storage.getString(key);
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      storage.delete(key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Remove all cached entries.
 */
export function clearCache(): void {
  storage.clearAll();
}

/**
 * Build a deterministic cache key from multiple path segments.
 * Filters out undefined/null values before joining with ':'.
 */
export function cacheKey(...parts: (string | number | undefined)[]): string {
  return parts.filter(Boolean).join(':');
}
