import { Config } from '@/constants/config';
import { getAccessToken, getRefreshToken, storeTokens } from '@/stores/auth-store';

/**
 * Typed API client for the marketplace backend.
 *
 * Features:
 * - Automatic token attachment
 * - Token refresh on 401
 * - Request/response typing
 * - Error normalization
 */

export class APIError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'APIError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: Record<string, unknown> | FormData;
  skipAuth?: boolean;
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${Config.apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    await storeTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function ensureValidToken(): Promise<string | null> {
  const token = await getAccessToken();
  if (token) return token;

  // If already refreshing, wait for that to complete
  if (isRefreshing && refreshPromise) {
    const success = await refreshPromise;
    if (success) return getAccessToken();
    return null;
  }

  isRefreshing = true;
  refreshPromise = refreshAccessToken();
  const success = await refreshPromise;
  isRefreshing = false;
  refreshPromise = null;

  if (success) return getAccessToken();
  return null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuth, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = await ensureValidToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${Config.apiUrl}${path}`, {
    ...fetchOptions,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && !skipAuth) {
    // Token expired, attempt refresh
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry the original request with the new token
      return request(path, options);
    }
    // Refresh failed, throw to trigger logout
    throw new APIError(401, 'UNAUTHORIZED', 'Session expired. Please log in again.');
  }

  if (!response.ok) {
    let errorBody: { code?: string; message?: string; details?: Record<string, unknown> };
    try {
      errorBody = await response.json();
    } catch {
      errorBody = { code: 'UNKNOWN', message: response.statusText };
    }
    throw new APIError(
      response.status,
      errorBody.code ?? 'UNKNOWN',
      errorBody.message ?? 'An unexpected error occurred',
      errorBody.details
    );
  }

  // 204 No Content
  if (response.status === 204) return undefined as T;

  return response.json();
}

// ---- API Namespaces ----

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ user: any; accessToken: string; refreshToken: string }>('/auth/login', {
        method: 'POST',
        body: { email, password },
        skipAuth: true,
      }),

    register: (data: { email: string; password: string; displayName: string }) =>
      request<{ user: any; accessToken: string; refreshToken: string }>('/auth/register', {
        method: 'POST',
        body: data,
        skipAuth: true,
      }),

    verifyPhone: (code: string) =>
      request<{ verified: boolean }>('/auth/verify-phone', {
        method: 'POST',
        body: { code },
      }),

    refresh: (data: { refreshToken: string }) =>
      request<{ user: any; accessToken: string; refreshToken: string }>('/auth/refresh', {
        method: 'POST',
        body: data,
        skipAuth: true,
      }),
  },

  listings: {
    search: (params: {
      latitude?: number;
      longitude?: number;
      radiusMiles?: number;
      category?: string;
      query?: string;
      minPrice?: number;
      maxPrice?: number;
      condition?: string;
      sortBy?: 'distance' | 'newest' | 'price_asc' | 'price_desc';
      cursor?: string;
      limit?: number;
    }) => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      });
      return request<{
        items: any[];
        nextCursor: string | null;
        total: number;
      }>(`/listings?${searchParams.toString()}`);
    },

    get: (id: string) => request<any>(`/listings/${id}`),

    create: (data: any) =>
      request<any>('/listings', { method: 'POST', body: data }),

    update: (id: string, data: any) =>
      request<any>(`/listings/${id}`, { method: 'PATCH', body: data }),

    delete: (id: string) =>
      request<void>(`/listings/${id}`, { method: 'DELETE' }),

    getByUser: (userId: string, cursor?: string) => {
      const params = new URLSearchParams({ userId });
      if (cursor) params.set('cursor', cursor);
      return request<{ items: any[]; nextCursor: string | null; total: number }>(
        `/listings?${params.toString()}`
      );
    },

    getUploadUrl: (params: { filename: string; contentType: string }) =>
      request<{ uploadUrl: string; imageUrl: string }>('/listings/upload-url', {
        method: 'POST',
        body: params,
      }),

    addMedia: (listingId: string, params: { imageUrl: string; position: number }) =>
      request<{ id: string }>(`/listings/${listingId}/media`, {
        method: 'POST',
        body: params,
      }),
  },

  messages: {
    getConversations: (cursor?: string) =>
      request<{ items: any[]; nextCursor: string | null }>(
        `/messages/conversations${cursor ? `?cursor=${cursor}` : ''}`
      ),

    getThread: (conversationId: string, cursor?: string) =>
      request<{ items: any[]; nextCursor: string | null }>(
        `/messages/${conversationId}${cursor ? `?cursor=${cursor}` : ''}`
      ),

    send: (conversationId: string, content: string) =>
      request<any>(`/messages/${conversationId}`, {
        method: 'POST',
        body: { content },
      }),

    startConversation: (listingId: string, message: string) =>
      request<any>('/messages/conversations', {
        method: 'POST',
        body: { listingId, message },
      }),
  },

  users: {
    getProfile: (id: string) => request<any>(`/users/${id}`),
    getMyProfile: () => request<any>('/users/me'),
    updateProfile: (data: any) =>
      request<any>('/users/me', { method: 'PATCH', body: data }),
  },

  notifications: {
    registerToken: (data: { token: string; platform: 'ios' | 'android' }) =>
      request<void>('/users/push-token', { method: 'POST', body: data }),
  },

  exchange: {
    generateQR: (conversationId: string) =>
      request<{ token: string; expiresAt: string }>(
        `/conversations/${conversationId}/exchange-qr`,
        { method: 'POST' },
      ),
    confirm: (token: string) =>
      request<{ success: boolean; conversationId: string; listingId: string }>(
        '/exchange-tokens/confirm',
        { method: 'POST', body: { token } },
      ),
  },

  payments: {
    initiatePurchase: (listingId: string) =>
      request<{ data: { clientSecret: string; publishableKey: string; transactionId: string } }>(
        '/purchase',
        { method: 'POST', body: { listingId } },
      ),

    getTransactions: (params?: { limit?: number; page?: number }) => {
      const query = new URLSearchParams();
      if (params?.limit) query.set('limit', String(params.limit));
      if (params?.page) query.set('page', String(params.page));
      return request<{
        data: Record<string, unknown>[];
        pagination: { total: number; page: number; limit: number };
      }>(`/transactions?${query.toString()}`);
    },
  },
} as const;
