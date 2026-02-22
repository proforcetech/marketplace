export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

export interface User {
  id: string;
  email: string;
  phone: string | null;
  phoneVerified: boolean;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  locationText: string | null;
  identityVerified: boolean;
  role: UserRole;
  status: UserStatus;
  reputationScore: number | null;
  responseRate: number | null;
  listingCount: number;
  createdAt: string;
  lastActiveAt: string | null;
}

/** Public-facing user profile (no email/phone) */
export interface PublicUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  locationText: string | null;
  identityVerified: boolean;
  reputationScore: number | null;
  responseRate: number | null;
  listingCount: number;
  createdAt: string;
  lastActiveAt: string | null;
}

export interface UpdateProfilePayload {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface UpdateLocationPayload {
  latitude: number;
  longitude: number;
  locationText: string;
}
