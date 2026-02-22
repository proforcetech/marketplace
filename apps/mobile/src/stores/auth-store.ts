import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

/**
 * Authentication state.
 *
 * Tokens are stored in expo-secure-store (Keychain/Keystore) for security.
 * Only non-sensitive user profile data is persisted in the Zustand store
 * via MMKV. The tokens themselves are read from SecureStore on demand.
 */

export interface User {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  isVerified: boolean;
  joinedAt: string;
  locationCity?: string;
  locationState?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;

  // Actions
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  setOnboardingComplete: () => void;
  clearAuth: () => void;
}

// Secure token operations (not part of Zustand state to avoid serialization)
const TOKEN_KEYS = {
  access: 'auth_access_token',
  refresh: 'auth_refresh_token',
} as const;

export async function storeTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEYS.access, accessToken),
    SecureStore.setItemAsync(TOKEN_KEYS.refresh, refreshToken),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEYS.access);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEYS.refresh);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEYS.access),
    SecureStore.deleteItemAsync(TOKEN_KEYS.refresh),
  ]);
}

/**
 * Zustand store with MMKV persistence for user profile data.
 *
 * Note: In a real implementation, the storage adapter would use
 * react-native-mmkv. For the initial scaffold, we use a simple
 * in-memory fallback. The MMKV adapter is added once the native
 * module is installed.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      hasCompletedOnboarding: false,

      setUser: (user) => set({ user, isAuthenticated: true, isLoading: false }),

      setLoading: (isLoading) => set({ isLoading }),

      setOnboardingComplete: () => set({ hasCompletedOnboarding: true }),

      clearAuth: () => {
        clearTokens();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },
    }),
    {
      name: 'auth-storage',
      // Persist only non-sensitive fields
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
    }
  )
);
