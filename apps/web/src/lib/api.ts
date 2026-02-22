import type {
  ApiResponse,
  ApiErrorResponse,
  AuthTokens,
  LoginPayload,
  SignupPayload,
  OtpSendPayload,
  OtpVerifyPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  User,
  PublicUser,
  UpdateProfilePayload,
  Listing,
  ListingSummary,
  CreateListingPayload,
  UpdateListingPayload,
  ListingStatus,
  PresignedUploadResponse,
  SearchListingsParams,
  SearchResults,
  Category,
  CategoryTree,
  Conversation,
  Message,
  StartConversationPayload,
  SendMessagePayload,
  Rating,
  SubmitRatingPayload,
  Promotion,
  PromotionAnalytics,
  CreatePromotionCheckoutPayload,
  Report,
  SubmitReportPayload,
} from '@marketplace/shared';
import { getAccessToken, setTokens, clearTokens } from './auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Array<{ field?: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      clearTokens();
      return null;
    }
    const body = (await res.json()) as ApiResponse<AuthTokens>;
    setTokens(body.data.accessToken);
    return body.data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

async function request<T>(
  method: RequestMethod,
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...options?.headers,
  };

  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const init: RequestInit = {
    method,
    headers,
    credentials: 'include',
    signal: options?.signal,
  };

  if (body !== undefined && method !== 'GET') {
    init.body = JSON.stringify(body);
  }

  let res = await fetch(url, init);

  // Handle 401 with automatic token refresh
  if (res.status === 401 && token) {
    // Deduplicate concurrent refresh requests
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken();
    }
    const newToken = await refreshPromise;
    refreshPromise = null;

    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, { ...init, headers });
    }
  }

  if (!res.ok) {
    let errorBody: ApiErrorResponse | undefined;
    try {
      errorBody = (await res.json()) as ApiErrorResponse;
    } catch {
      // Response body is not JSON
    }
    const firstError = errorBody?.errors?.[0];
    throw new ApiError(
      res.status,
      firstError?.code ?? 'UNKNOWN_ERROR',
      firstError?.message ?? `Request failed with status ${res.status}`,
      errorBody?.errors?.map((e) => ({ field: e.field, message: e.message })),
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        searchParams.append(key, String(v));
      }
    } else {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

// ----------------------------------------------------------------
// Auth
// ----------------------------------------------------------------

export const auth = {
  signup(payload: SignupPayload, opts?: RequestOptions): Promise<ApiResponse<{ user: User; accessToken: string }>> {
    return request('POST', '/auth/signup', payload, opts);
  },
  login(payload: LoginPayload, opts?: RequestOptions): Promise<ApiResponse<{ user: User; accessToken: string }>> {
    return request('POST', '/auth/login', payload, opts);
  },
  logout(opts?: RequestOptions): Promise<void> {
    return request('POST', '/auth/logout', undefined, opts);
  },
  refresh(opts?: RequestOptions): Promise<ApiResponse<AuthTokens>> {
    return request('POST', '/auth/refresh', undefined, opts);
  },
  sendOtp(payload: OtpSendPayload, opts?: RequestOptions): Promise<ApiResponse<{ message: string }>> {
    return request('POST', '/auth/send-otp', payload, opts);
  },
  verifyOtp(payload: OtpVerifyPayload, opts?: RequestOptions): Promise<ApiResponse<{ verified: boolean }>> {
    return request('POST', '/auth/verify-otp', payload, opts);
  },
  forgotPassword(payload: ForgotPasswordPayload, opts?: RequestOptions): Promise<ApiResponse<{ message: string }>> {
    return request('POST', '/auth/forgot-password', payload, opts);
  },
  resetPassword(payload: ResetPasswordPayload, opts?: RequestOptions): Promise<ApiResponse<{ message: string }>> {
    return request('POST', '/auth/reset-password', payload, opts);
  },
};

// ----------------------------------------------------------------
// Users
// ----------------------------------------------------------------

export const users = {
  getMe(opts?: RequestOptions): Promise<ApiResponse<User>> {
    return request('GET', '/users/me', undefined, opts);
  },
  updateProfile(id: string, payload: UpdateProfilePayload, opts?: RequestOptions): Promise<ApiResponse<User>> {
    return request('PATCH', `/users/${encodeURIComponent(id)}`, payload, opts);
  },
  getPublicProfile(id: string, opts?: RequestOptions): Promise<ApiResponse<PublicUser>> {
    return request('GET', `/users/${encodeURIComponent(id)}`, undefined, opts);
  },
  getUserListings(
    id: string,
    params?: { cursor?: string; limit?: number },
    opts?: RequestOptions,
  ): Promise<ApiResponse<ListingSummary[]>> {
    const qs = buildQueryString(params ?? {});
    return request('GET', `/users/${encodeURIComponent(id)}/listings${qs}`, undefined, opts);
  },
};

// ----------------------------------------------------------------
// Listings
// ----------------------------------------------------------------

export const listings = {
  getById(id: string, opts?: RequestOptions): Promise<ApiResponse<Listing & { seller: PublicUser }>> {
    return request('GET', `/listings/${encodeURIComponent(id)}`, undefined, opts);
  },
  create(payload: CreateListingPayload, opts?: RequestOptions): Promise<ApiResponse<Listing>> {
    return request('POST', '/listings', payload, opts);
  },
  update(id: string, payload: UpdateListingPayload, opts?: RequestOptions): Promise<ApiResponse<Listing>> {
    return request('PATCH', `/listings/${encodeURIComponent(id)}`, payload, opts);
  },
  delete(id: string, opts?: RequestOptions): Promise<void> {
    return request('DELETE', `/listings/${encodeURIComponent(id)}`, undefined, opts);
  },
  uploadMedia(
    id: string,
    file: File,
    opts?: RequestOptions,
  ): Promise<ApiResponse<PresignedUploadResponse>> {
    return request(
      'POST',
      `/listings/${encodeURIComponent(id)}/media`,
      { fileName: file.name, contentType: file.type, fileSize: file.size },
      opts,
    );
  },
  changeStatus(
    id: string,
    status: ListingStatus,
    opts?: RequestOptions,
  ): Promise<ApiResponse<Listing>> {
    return request('PATCH', `/listings/${encodeURIComponent(id)}/status`, { status }, opts);
  },
  renew(id: string, opts?: RequestOptions): Promise<ApiResponse<Listing>> {
    return request('POST', `/listings/${encodeURIComponent(id)}/renew`, undefined, opts);
  },
  getMyListings(
    params?: { status?: string; cursor?: string; limit?: number },
    opts?: RequestOptions,
  ): Promise<ApiResponse<ListingSummary[]>> {
    const qs = buildQueryString(params ?? {});
    return request('GET', `/users/me/listings${qs}`, undefined, opts);
  },
};

// ----------------------------------------------------------------
// Search
// ----------------------------------------------------------------

export const search = {
  search(params: SearchListingsParams, opts?: RequestOptions): Promise<ApiResponse<SearchResults>> {
    const qs = buildQueryString(params as unknown as Record<string, unknown>);
    return request('GET', `/search${qs}`, undefined, opts);
  },
  getSuggestions(
    q: string,
    opts?: RequestOptions,
  ): Promise<ApiResponse<Array<{ text: string; type: string }>>> {
    const qs = buildQueryString({ q });
    return request('GET', `/search/suggestions${qs}`, undefined, opts);
  },
  getCategories(opts?: RequestOptions): Promise<ApiResponse<CategoryTree[]>> {
    return request('GET', '/categories', undefined, opts);
  },
  getCategoryById(id: string, opts?: RequestOptions): Promise<ApiResponse<Category>> {
    return request('GET', `/categories/${encodeURIComponent(id)}`, undefined, opts);
  },
};

// ----------------------------------------------------------------
// Conversations & Messages
// ----------------------------------------------------------------

export const conversations = {
  list(
    params?: { cursor?: string; limit?: number },
    opts?: RequestOptions,
  ): Promise<ApiResponse<Conversation[]>> {
    const qs = buildQueryString(params ?? {});
    return request('GET', `/conversations${qs}`, undefined, opts);
  },
  getById(id: string, opts?: RequestOptions): Promise<ApiResponse<Conversation>> {
    return request('GET', `/conversations/${encodeURIComponent(id)}`, undefined, opts);
  },
  create(
    payload: StartConversationPayload,
    opts?: RequestOptions,
  ): Promise<ApiResponse<Conversation>> {
    return request('POST', '/conversations', payload, opts);
  },
  getMessages(
    id: string,
    params?: { cursor?: string; limit?: number },
    opts?: RequestOptions,
  ): Promise<ApiResponse<Message[]>> {
    const qs = buildQueryString(params ?? {});
    return request('GET', `/conversations/${encodeURIComponent(id)}/messages${qs}`, undefined, opts);
  },
  sendMessage(
    id: string,
    payload: SendMessagePayload,
    opts?: RequestOptions,
  ): Promise<ApiResponse<Message>> {
    return request('POST', `/conversations/${encodeURIComponent(id)}/messages`, payload, opts);
  },
  markRead(id: string, opts?: RequestOptions): Promise<void> {
    return request('PATCH', `/conversations/${encodeURIComponent(id)}/read`, undefined, opts);
  },
  block(id: string, opts?: RequestOptions): Promise<void> {
    return request('POST', `/conversations/${encodeURIComponent(id)}/block`, undefined, opts);
  },
};

// ----------------------------------------------------------------
// Ratings
// ----------------------------------------------------------------

export const ratings = {
  submit(payload: SubmitRatingPayload, opts?: RequestOptions): Promise<ApiResponse<Rating>> {
    return request('POST', '/ratings', payload, opts);
  },
  getForUser(
    userId: string,
    params?: { cursor?: string; limit?: number },
    opts?: RequestOptions,
  ): Promise<ApiResponse<Rating[]>> {
    const qs = buildQueryString(params ?? {});
    return request('GET', `/users/${encodeURIComponent(userId)}/ratings${qs}`, undefined, opts);
  },
};

// ----------------------------------------------------------------
// Promotions
// ----------------------------------------------------------------

export const promotions = {
  getPlans(opts?: RequestOptions): Promise<ApiResponse<Array<{ id: string; name: string; price: number; durationDays: number; type: string }>>> {
    return request('GET', '/promotions/plans', undefined, opts);
  },
  purchase(
    payload: CreatePromotionCheckoutPayload,
    opts?: RequestOptions,
  ): Promise<ApiResponse<Promotion>> {
    return request('POST', '/promotions/purchase', payload, opts);
  },
  getMyPromotions(
    params?: { cursor?: string; limit?: number },
    opts?: RequestOptions,
  ): Promise<ApiResponse<Promotion[]>> {
    const qs = buildQueryString(params ?? {});
    return request('GET', `/promotions${qs}`, undefined, opts);
  },
  getAnalytics(
    id: string,
    opts?: RequestOptions,
  ): Promise<ApiResponse<PromotionAnalytics>> {
    return request('GET', `/promotions/${encodeURIComponent(id)}`, undefined, opts);
  },
};

// ----------------------------------------------------------------
// Reports
// ----------------------------------------------------------------

export const reports = {
  submit(payload: SubmitReportPayload, opts?: RequestOptions): Promise<ApiResponse<Report>> {
    return request('POST', '/reports', payload, opts);
  },
};

// ----------------------------------------------------------------
// Admin
// ----------------------------------------------------------------

export const admin = {
  getStats(opts?: RequestOptions): Promise<ApiResponse<{
    totalUsers: number;
    activeListings: number;
    pendingModeration: number;
    openReports: number;
    newListingsToday: number;
    newUsersToday: number;
  }>> {
    return request('GET', '/admin/stats', undefined, opts);
  },
  getModerationQueue(
    params?: { cursor?: string; limit?: number },
    opts?: RequestOptions,
  ): Promise<ApiResponse<Array<{
    id: string;
    title: string;
    thumbnailUrl: string | null;
    riskScore: number;
    createdAt: string;
    userId: string;
    userDisplayName: string;
  }>>> {
    const qs = buildQueryString(params ?? {});
    return request('GET', `/admin/moderation-queue${qs}`, undefined, opts);
  },
  moderateListing(
    id: string,
    payload: { action: string; reason?: string; notifyUser?: boolean },
    opts?: RequestOptions,
  ): Promise<ApiResponse<Listing>> {
    return request('PATCH', `/admin/listings/${encodeURIComponent(id)}/moderate`, payload, opts);
  },
  getReports(
    params?: { status?: string; cursor?: string; limit?: number },
    opts?: RequestOptions,
  ): Promise<ApiResponse<Report[]>> {
    const qs = buildQueryString(params ?? {});
    return request('GET', `/admin/reports${qs}`, undefined, opts);
  },
  resolveReport(
    id: string,
    payload: { status: string; resolution: string },
    opts?: RequestOptions,
  ): Promise<ApiResponse<Report>> {
    return request('PATCH', `/admin/reports/${encodeURIComponent(id)}`, payload, opts);
  },
  searchUsers(
    params: { q?: string; cursor?: string; limit?: number },
    opts?: RequestOptions,
  ): Promise<ApiResponse<User[]>> {
    const qs = buildQueryString(params);
    return request('GET', `/admin/users${qs}`, undefined, opts);
  },
};

// ----------------------------------------------------------------
// Offers
// ----------------------------------------------------------------

export const offers = {
  create(
    payload: { listingId: string; conversationId: string; amountCents: number; message?: string },
    opts?: RequestOptions,
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return request('POST', '/offers', payload, opts);
  },
  getForListing(listingId: string, opts?: RequestOptions): Promise<ApiResponse<Record<string, unknown>[]>> {
    return request('GET', `/offers?listingId=${encodeURIComponent(listingId)}`, undefined, opts);
  },
  getMyOffers(opts?: RequestOptions): Promise<ApiResponse<Record<string, unknown>[]>> {
    return request('GET', '/offers/me', undefined, opts);
  },
  respond(
    id: string,
    payload: { action: 'accepted' | 'declined' | 'countered'; counterAmountCents?: number; message?: string },
    opts?: RequestOptions,
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return request('PATCH', `/offers/${encodeURIComponent(id)}/respond`, payload, opts);
  },
  withdraw(id: string, opts?: RequestOptions): Promise<void> {
    return request('DELETE', `/offers/${encodeURIComponent(id)}`, undefined, opts);
  },
};

// ----------------------------------------------------------------
// Saved Searches
// ----------------------------------------------------------------

export const savedSearches = {
  list(opts?: RequestOptions): Promise<ApiResponse<Record<string, unknown>[]>> {
    return request('GET', '/saved-searches', undefined, opts);
  },
  create(
    payload: { name?: string; query: Record<string, unknown>; notify?: boolean },
    opts?: RequestOptions,
  ): Promise<ApiResponse<Record<string, unknown>>> {
    return request('POST', '/saved-searches', payload, opts);
  },
  delete(id: string, opts?: RequestOptions): Promise<void> {
    return request('DELETE', `/saved-searches/${encodeURIComponent(id)}`, undefined, opts);
  },
  toggleNotify(id: string, notify: boolean, opts?: RequestOptions): Promise<ApiResponse<Record<string, unknown>>> {
    return request('PATCH', `/saved-searches/${encodeURIComponent(id)}/notify`, { notify }, opts);
  },
};

// ----------------------------------------------------------------
// Subscriptions
// ----------------------------------------------------------------

export const subscriptions = {
  getPlans(opts?: RequestOptions): Promise<ApiResponse<Array<{
    id: string;
    name: string;
    description: string;
    monthlyPriceCents: number;
    dailyListingLimit: number;
    monthlyListingLimit: number;
    monthlyPromoBudgetCents: number;
    features: string[];
  }>>> {
    return request('GET', '/subscriptions/plans', undefined, opts);
  },
  getCurrent(opts?: RequestOptions): Promise<ApiResponse<Record<string, unknown> | null>> {
    return request('GET', '/subscriptions/me', undefined, opts);
  },
  createCheckout(tier: string, opts?: RequestOptions): Promise<ApiResponse<{ url: string }>> {
    return request('POST', '/subscriptions/checkout', { tier }, opts);
  },
  cancel(opts?: RequestOptions): Promise<void> {
    return request('DELETE', '/subscriptions/me', undefined, opts);
  },
};

// ----------------------------------------------------------------
// Identity Verification
// ----------------------------------------------------------------

export const identity = {
  startVerification(opts?: RequestOptions): Promise<ApiResponse<{ url: string }>> {
    return request('POST', '/users/me/verify-identity', undefined, opts);
  },
};

// ----------------------------------------------------------------
// Notifications
// ----------------------------------------------------------------

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export const notifications = {
  list(
    params?: { page?: number; limit?: number },
    opts?: RequestOptions,
  ): Promise<ApiResponse<{
    notifications: NotificationItem[];
    unreadCount: number;
  }>> {
    const qs = buildQueryString(params ?? {});
    return request('GET', `/users/me/notifications${qs}`, undefined, opts);
  },
  markRead(id: string, opts?: RequestOptions): Promise<ApiResponse<{ message: string }>> {
    return request('PATCH', `/users/me/notifications/${encodeURIComponent(id)}/read`, undefined, opts);
  },
  markAllRead(opts?: RequestOptions): Promise<ApiResponse<{ updated: number }>> {
    return request('PATCH', '/users/me/notifications/read-all', undefined, opts);
  },
};

const api = { auth, users, listings, search, conversations, ratings, promotions, reports, admin, offers, savedSearches, subscriptions, identity, notifications };
export default api;
