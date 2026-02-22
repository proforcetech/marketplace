export enum PromotionType {
  FEATURED = 'featured',
  TOP_OF_RESULTS = 'top_of_results',
  CATEGORY_SPOTLIGHT = 'category_spotlight',
}

export enum PromotionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export interface Promotion {
  id: string;
  listingId: string;
  userId: string;
  type: PromotionType;
  amountPaid: number;
  currency: string;
  impressions: number;
  clicks: number;
  messagesReceived: number;
  startsAt: string;
  endsAt: string;
  status: PromotionStatus;
  createdAt: string;
}

export interface CreatePromotionCheckoutPayload {
  listingId: string;
  type: PromotionType;
  durationDays: number;
}

export interface PromotionAnalytics {
  totalImpressions: number;
  totalClicks: number;
  totalMessages: number;
  clickThroughRate: number;
  messageRate: number;
}
