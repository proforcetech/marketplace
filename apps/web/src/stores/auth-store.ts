import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@marketplace/shared';
import { auth as authApi, users as usersApi } from '@/lib/api';
import { setTokens, clearTokens } from '@/lib/auth';
import { disconnectSocket } from '@/lib/socket';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await authApi.login({ email, password });
          setTokens(res.data.accessToken);
          set({ user: res.data.user, isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      signup: async (email, password, displayName) => {
        set({ isLoading: true });
        try {
          const res = await authApi.signup({ email, password, displayName });
          setTokens(res.data.accessToken);
          set({ user: res.data.user, isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Best-effort server logout
        }
        clearTokens();
        disconnectSocket();
        set({ user: null, isAuthenticated: false, isLoading: false });
      },

      refreshUser: async () => {
        if (!get().isAuthenticated) return;
        try {
          const res = await usersApi.getMe();
          set({ user: res.data });
        } catch {
          // If refresh fails, clear auth state
          clearTokens();
          set({ user: null, isAuthenticated: false });
        }
      },

      setUser: (user) => {
        set({ user, isAuthenticated: user !== null });
      },
    }),
    {
      name: 'marketplace-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
