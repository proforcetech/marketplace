import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery } from '@tanstack/react-query';
import * as Network from 'expo-network';

import { api } from '@/services/api';
import { useThemeColors } from '@/hooks/useColorScheme';
import { useLocation } from '@/hooks/useLocation';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { Config } from '@/constants/config';
import { getCached, setCached, cacheKey } from '@/stores/cache-store';
import { OfflineBanner } from '@/components/OfflineBanner';

/**
 * Browse / Home screen.
 *
 * Shows a feed of nearby listings sorted by newest first.
 * Pulls location from the useLocation hook and passes coordinates
 * to the listing search API.
 */

interface ListingCardData {
  id: string;
  title: string;
  price: number;
  priceType: string;
  imageUrl: string;
  imageBlurhash?: string;
  distance?: number;
  city: string;
  state: string;
  isSponsored: boolean;
  createdAt: string;
}

function formatPrice(price: number, priceType: string): string {
  if (priceType === 'free') return 'Free';
  if (priceType === 'hourly') return `$${price}/hr`;
  const formatted = price.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  if (priceType === 'obo') return `${formatted} OBO`;
  return formatted;
}

function formatDistance(miles?: number): string {
  if (miles === undefined) return '';
  if (miles < 0.1) return 'Nearby';
  if (miles < 1) return `${(miles * 5280).toFixed(0)} ft`;
  return `${miles.toFixed(1)} mi`;
}

export default function BrowseScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { location } = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Detect network state on mount and when returning to foreground
  useEffect(() => {
    const checkNetwork = async (): Promise<void> => {
      try {
        const state = await Network.getNetworkStateAsync();
        setIsOffline(!(state.isConnected && state.isInternetReachable));
      } catch {
        // Assume online if the check fails
        setIsOffline(false);
      }
    };
    checkNetwork();
  }, []);

  const browseCacheKey = cacheKey(
    'browse',
    location?.latitude?.toFixed(2),
    location?.longitude?.toFixed(2)
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['listings', 'browse', location?.latitude, location?.longitude],
    queryFn: async ({ pageParam }) => {
      // For the first page, try to return cached data when offline
      if (pageParam === undefined) {
        const cached = getCached<{
          items: ListingCardData[];
          nextCursor: string | null;
          total: number;
        }>(browseCacheKey);

        if (isOffline && cached) {
          return cached;
        }
      }

      const result = await api.listings.search({
        latitude: location?.latitude,
        longitude: location?.longitude,
        radiusMiles: Config.defaultSearchRadiusMiles,
        sortBy: 'newest',
        cursor: pageParam,
        limit: 20,
      });

      // Cache the first page for offline use
      if (pageParam === undefined) {
        setCached(browseCacheKey, result);
      }

      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: true, // Load even without location (API will use IP-based fallback)
  });

  const listings = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const handleListingPress = useCallback(
    (id: string) => {
      router.push(`/listing/${id}` as any);
    },
    [router]
  );

  const renderListingCard = useCallback(
    ({ item }: { item: ListingCardData }) => (
      <Pressable
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBackground,
            shadowColor: colors.cardShadow,
          },
        ]}
        onPress={() => handleListingPress(item.id)}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${formatPrice(item.price, item.priceType)}${item.distance ? `, ${formatDistance(item.distance)} away` : ''}`}
      >
        <Image
          source={{ uri: item.imageUrl }}
          placeholder={item.imageBlurhash ? { blurhash: item.imageBlurhash } : undefined}
          transition={200}
          contentFit="cover"
          style={styles.cardImage}
          recyclingKey={item.id}
        />
        {item.isSponsored && (
          <View
            style={[styles.sponsoredBadge, { backgroundColor: colors.sponsored }]}
            accessibilityLabel="Sponsored listing"
          >
            <Text style={styles.sponsoredText}>Sponsored</Text>
          </View>
        )}
        <View style={styles.cardContent}>
          <Text
            style={[styles.cardPrice, { color: colors.text }]}
            numberOfLines={1}
          >
            {formatPrice(item.price, item.priceType)}
          </Text>
          <Text
            style={[styles.cardTitle, { color: colors.text }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <View style={styles.cardMeta}>
            <Text style={[styles.cardLocation, { color: colors.textSecondary }]}>
              {item.city}, {item.state}
            </Text>
            {item.distance !== undefined && (
              <Text style={[styles.cardDistance, { color: colors.textTertiary }]}>
                {formatDistance(item.distance)}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    ),
    [colors, handleListingPress]
  );

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Finding listings near you...
        </Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          Something went wrong
        </Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
          {error instanceof Error ? error.message : 'Failed to load listings'}
        </Text>
        <Pressable
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => refetch()}
          accessibilityRole="button"
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <OfflineBanner isOffline={isOffline} />
      {location && (
        <View style={[styles.locationBar, { borderBottomColor: colors.border }]}>
          <Text style={[styles.locationText, { color: colors.textSecondary }]}>
            Near {location.city ?? 'your location'}
            {location.state ? `, ${location.state}` : ''}
          </Text>
        </View>
      )}
      <FlashList
        data={listings}
        renderItem={renderListingCard}
        estimatedItemSize={280}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        onEndReached={() => {
          if (hasNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No listings nearby
            </Text>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              Try expanding your search radius or check back later.
            </Text>
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['3xl'],
  },
  locationBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  locationText: {
    ...Typography.footnote,
  },
  listContent: {
    padding: Spacing.sm,
  },
  card: {
    flex: 1,
    margin: Spacing.xs,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardImage: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  sponsoredBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  sponsoredText: {
    ...Typography.caption2,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardContent: {
    padding: Spacing.md,
  },
  cardPrice: {
    ...Typography.headline,
    marginBottom: 2,
  },
  cardTitle: {
    ...Typography.subhead,
    marginBottom: Spacing.xs,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLocation: {
    ...Typography.caption1,
    flex: 1,
  },
  cardDistance: {
    ...Typography.caption1,
    marginLeft: Spacing.sm,
  },
  loadingText: {
    ...Typography.body,
    marginTop: Spacing.lg,
  },
  errorTitle: {
    ...Typography.title3,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  retryButton: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  retryButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing['4xl'],
  },
  emptyTitle: {
    ...Typography.title3,
    marginBottom: Spacing.sm,
  },
  emptyMessage: {
    ...Typography.body,
    textAlign: 'center',
  },
  footer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
});
