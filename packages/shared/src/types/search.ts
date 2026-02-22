import type { ItemCondition, ListingSummary } from './listing.js';

export type SearchSortBy = 'distance' | 'newest' | 'price_asc' | 'price_desc';

export interface SearchListingsParams {
  /** Latitude of search center */
  lat: number;
  /** Longitude of search center */
  lng: number;
  /** Radius in miles (default: 25, max: 100) */
  radius?: number;
  /** Category slug filter */
  category?: string;
  /** Text search query */
  q?: string;
  /** Minimum price */
  priceMin?: number;
  /** Maximum price */
  priceMax?: number;
  /** Condition filter (multiple allowed) */
  condition?: ItemCondition[];
  /** Category-specific custom field filters */
  customFields?: Record<string, unknown>;
  /** Sort order */
  sort?: SearchSortBy;
  /** Page number (1-indexed) */
  page?: number;
  /** Results per page (default: 20, max: 100) */
  limit?: number;
}

export interface SearchFacets {
  categories: Array<{ slug: string; name: string; count: number }>;
  conditions: Array<{ value: ItemCondition; count: number }>;
  priceRange: { min: number; max: number };
}

export interface SearchResults {
  listings: ListingSummary[];
  /** Promoted listings to inject at specified positions */
  promoted: Array<ListingSummary & { position: number; isSponsored: true }>;
  facets: SearchFacets;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  categoryId: string | null;
  filters: Record<string, unknown>;
  sortBy: SearchSortBy | null;
  notifyEnabled: boolean;
  lastNotifiedAt: string | null;
  createdAt: string;
}

export interface SaveSearchPayload {
  name: string;
  latitude: number;
  longitude: number;
  radiusMiles: number;
  categoryId?: string;
  filters?: Record<string, unknown>;
  sortBy?: SearchSortBy;
  notifyEnabled?: boolean;
}
