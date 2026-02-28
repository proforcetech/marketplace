import { useEffect, useRef } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';

import { useAuthStore, getRefreshToken, storeTokens, clearTokens } from '@/stores/auth-store';
import { setupNotificationResponseHandler, registerForPushNotifications } from '@/services/notifications';
import { api } from '@/services/api';
import { Config } from '@/constants/config';

// Prevent the splash screen from auto-hiding until we are ready
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Config.queryStaleTimeMs,
      gcTime: Config.queryCacheTimeMs,
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error && 'status' in error) {
          const status = (error as any).status;
          if (status >= 400 && status < 500) return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Root layout for the entire app.
 *
 * Responsibilities:
 * 1. Wrap the app with required providers (QueryClient, GestureHandler, SafeArea)
 * 2. Handle authentication gating (redirect to login if not authenticated)
 * 3. Manage splash screen visibility
 * 4. Set up notification response handling
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const notificationSubscription = useRef<ReturnType<typeof setupNotificationResponseHandler>>();

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setLoading = useAuthStore((s) => s.setLoading);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // Set up notification tap handler
  useEffect(() => {
    notificationSubscription.current = setupNotificationResponseHandler();
    return () => {
      notificationSubscription.current?.remove();
    };
  }, []);

  // Validate stored session on startup by refreshing the access token.
  // On success: store new tokens and restore the user session.
  // On failure: clear auth state so the user is redirected to login.
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) {
          setLoading(false);
          return;
        }

        const data = await api.auth.refresh({ refreshToken });
        await storeTokens(data.accessToken, data.refreshToken);
        setUser(data.user);

        // Token is valid -- register for push notifications in the background
        registerForPushNotifications().catch((err) =>
          console.error('Push notification registration failed:', err)
        );
      } catch {
        // Token expired or network error -- clear stale session
        clearAuth();
        await clearTokens();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [setLoading, setUser, clearAuth]);

  // Auth-based routing
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Not logged in and not on an auth screen -> redirect to login
      router.replace('/(auth)/login' as any);
    } else if (isAuthenticated && inAuthGroup) {
      // Logged in but on an auth screen -> redirect to main app
      router.replace('/(tabs)' as any);
    }
  }, [isAuthenticated, isLoading, segments, router]);

  // Hide splash screen once auth state is resolved
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StripeProvider
          publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''}
          merchantIdentifier="merchant.com.marketplace.app"
          urlScheme="marketplace"
        >
          <QueryClientProvider client={queryClient}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <Slot />
          </QueryClientProvider>
        </StripeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
