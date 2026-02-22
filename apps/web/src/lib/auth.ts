const TOKEN_KEY = 'marketplace_access_token';

/**
 * Retrieve the stored access token.
 * Returns null if no token exists or if running on the server.
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Persist a new access token.
 * The refresh token is handled as an httpOnly cookie by the backend.
 */
export function setTokens(accessToken: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TOKEN_KEY, accessToken);
  } catch {
    // Storage is full or unavailable -- fail silently
  }
}

/**
 * Clear stored tokens and local auth state.
 */
export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Quick synchronous check for whether a token exists.
 * This does NOT validate the token -- use the auth store for verified state.
 */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}
