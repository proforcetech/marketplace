export enum ListingStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  ACTIVE = 'active',
  SOLD = 'sold',
  CLOSED = 'closed',
  REMOVED = 'removed',
}

export enum PriceType {
  FIXED = 'fixed',
  OBO = 'obo',
  FREE = 'free',
  HOURLY = 'hourly',
  MONTHLY = 'monthly',
}

export enum ItemCondition {
  NEW = 'new',
  LIKE_NEW = 'like_new',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  NOT_APPLICABLE = 'na',
}

export enum ListingVisibility {
  PUBLIC = 'public',
  FOLLOWERS = 'followers',
  PRIVATE_LINK = 'private_link',
}

export enum LocationPrecision {
  EXACT = 'exact',
  AREA = 'area',
  CITY = 'city',
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface ListingMedia {
  id: string;
  type: 'image' | 'video';
  originalUrl: string;
  processedUrl: string | null;
  thumbnailUrl: string | null;
  mediumUrl: string | null;
  largeUrl: string | null;
  width: number | null;
  height: number | null;
  blurhash: string | null;
  sortOrder: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface Listing {
  id: string;
  userId: string;
  categoryId: string;
  title: string;
  description: string;
  price: number | null;
  priceType: PriceType;
  condition: ItemCondition;
  location: GeoPoint;
  locationText: string;
  locationPrecision: LocationPrecision;
  customFields: Record<string, unknown>;
  visibility: ListingVisibility;
  status: ListingStatus;
  viewCount: number;
  messageCount: number;
  isPromoted: boolean;
  expiresAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  media?: ListingMedia[];
}

export interface ListingSummary {
  id: string;
  title: string;
  price: number | null;
  priceType: PriceType;
  condition: ItemCondition;
  locationText: string;
  thumbnailUrl: string | null;
  isPromoted: boolean;
  publishedAt: string | null;
  /** Distance in meters from search center (present in search results) */
  distance?: number;
  /** Coordinates — present in search results for map rendering */
  latitude?: number;
  longitude?: number;
}

export interface CreateListingPayload {
  categoryId: string;
  title: string;
  description: string;
  price?: number | null;
  priceType: PriceType;
  condition: ItemCondition;
  latitude: number;
  longitude: number;
  locationText: string;
  locationPrecision?: LocationPrecision;
  customFields?: Record<string, unknown>;
  visibility?: ListingVisibility;
}

export interface UpdateListingPayload {
  title?: string;
  description?: string;
  price?: number | null;
  priceType?: PriceType;
  condition?: ItemCondition;
  latitude?: number;
  longitude?: number;
  locationText?: string;
  locationPrecision?: LocationPrecision;
  customFields?: Record<string, unknown>;
  visibility?: ListingVisibility;
}
