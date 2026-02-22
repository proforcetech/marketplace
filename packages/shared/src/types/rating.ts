export enum RatingRole {
  BUYER = 'buyer',
  SELLER = 'seller',
}

export interface Rating {
  id: string;
  listingId: string;
  conversationId: string;
  raterId: string;
  ratedId: string;
  role: RatingRole;
  score: number;
  comment: string | null;
  createdAt: string;
  /** Denormalized for display */
  raterDisplayName?: string;
  raterAvatarUrl?: string | null;
  listingTitle?: string;
}

export interface SubmitRatingPayload {
  conversationId: string;
  score: number;
  comment?: string;
}
