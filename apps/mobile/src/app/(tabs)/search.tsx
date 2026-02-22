import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery } from '@tanstack/react-query';

import { api } from '@/services/api';
import { useThemeColors } from '@/hooks/useColorScheme';
import { useLocation } from '@/hooks/useLocation';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { Config } from '@/constants/config';
import ListingMapView from '@/components/ListingMapView';

/**
 * Search screen with filters and map/list toggle.
 *
 * Features:
 * - Text search with debounce
 * - Radius selector
 * - Category filter chips
 * - Sort options (distance, newest, price)
 * - Map/list view toggle (map view is a placeholder for Phase 2 integration)
 */

type SortOption = 'distance' | 'newest' | 'price_asc' | 'price_desc';
type ViewMode = 'list' | 'map';

interface SearchListing {
  id: string;
  title: string;
  price: number | null;
  priceType: string;
  city?: string;
  distance?: number;
  isPromoted: boolean;
  thumbnailUrl: string | null;
  latitude?: number;
  longitude?: number;
}

const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'distance', label: 'Nearest' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low' },
  { value: 'price_desc', label: 'Price: High' },
];

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'automotive', label: 'Automotive' },
  { id: 'housing', label: 'Housing' },
  { id: 'real_estate', label: 'Real Estate' },
  { id: 'for_sale', label: 'For Sale' },
  { id: 'services', label: 'Services' },
  { id: 'community', label: 'Community' },
];

export default function SearchScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { location } = useLocation();
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [radiusMiles, setRadiusMiles] = useState(Config.defaultSearchRadiusMiles);
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchCenter, setSearchCenter] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );

  // Initialize search center from device location
  useEffect(() => {
    if (location && !searchCenter) {
      setSearchCenter({ latitude: location.latitude, longitude: location.longitude });
    }
  }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedQuery(text);
    }, Config.searchDebounceMs);
  }, []);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: [
      'listings',
      'search',
      debouncedQuery,
      radiusMiles,
      sortBy,
      selectedCategory,
      location?.latitude,
      location?.longitude,
    ],
    queryFn: async ({ pageParam }) => {
      return api.listings.search({
        query: debouncedQuery || undefined,
        latitude: location?.latitude,
        longitude: location?.longitude,
        radiusMiles,
        sortBy,
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        cursor: pageParam,
        limit: 20,
      });
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });

  const listings = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={20} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search listings..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={handleQueryChange}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Search listings"
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => {
              setQuery('');
              setDebouncedQuery('');
            }}
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {/* Filter Row: Radius + Sort + View Toggle */}
      <View style={styles.filterRow}>
        {/* Radius selector */}
        <View style={styles.filterChips}>
          {RADIUS_OPTIONS.map((r) => (
            <Pressable
              key={r}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    radiusMiles === r ? colors.primary : colors.surface,
                  borderColor: radiusMiles === r ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setRadiusMiles(r)}
              accessibilityRole="button"
              accessibilityState={{ selected: radiusMiles === r }}
              accessibilityLabel={`${r} mile radius`}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: radiusMiles === r ? '#FFFFFF' : colors.textSecondary,
                  },
                ]}
              >
                {r} mi
              </Text>
            </Pressable>
          ))}
        </View>

        {/* View mode toggle */}
        <Pressable
          style={[styles.viewToggle, { backgroundColor: colors.surface }]}
          onPress={() => setViewMode((m) => (m === 'list' ? 'map' : 'list'))}
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${viewMode === 'list' ? 'map' : 'list'} view`}
        >
          <Ionicons
            name={viewMode === 'list' ? 'map-outline' : 'list-outline'}
            size={20}
            color={colors.text}
          />
        </Pressable>
      </View>

      {/* Category Chips */}
      <View style={styles.categoryRow}>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            style={[
              styles.chip,
              {
                backgroundColor:
                  selectedCategory === cat.id ? colors.primary : colors.surface,
                borderColor:
                  selectedCategory === cat.id ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setSelectedCategory(cat.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedCategory === cat.id }}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color:
                    selectedCategory === cat.id ? '#FFFFFF' : colors.textSecondary,
                },
              ]}
            >
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Sort Options */}
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt) => (
          <Pressable
            key={opt.value}
            onPress={() => setSortBy(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: sortBy === opt.value }}
          >
            <Text
              style={[
                styles.sortText,
                {
                  color: sortBy === opt.value ? colors.primary : colors.textTertiary,
                  fontWeight: sortBy === opt.value ? '600' : '400',
                },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Results */}
      {viewMode === 'list' ? (
        <FlashList
          data={listings}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.resultRow, { borderBottomColor: colors.border }]}
              onPress={() => router.push(`/listing/${item.id}` as any)}
              accessibilityRole="button"
            >
              <View style={styles.resultImageContainer}>
                <View
                  style={[styles.resultImagePlaceholder, { backgroundColor: colors.skeleton }]}
                />
              </View>
              <View style={styles.resultContent}>
                <Text style={[styles.resultPrice, { color: colors.text }]} numberOfLines={1}>
                  ${item.price ?? 0}
                </Text>
                <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={2}>
                  {item.title ?? 'Untitled Listing'}
                </Text>
                <Text style={[styles.resultMeta, { color: colors.textSecondary }]}>
                  {item.city ?? 'Unknown'} {item.distance ? `- ${item.distance.toFixed(1)} mi` : ''}
                </Text>
              </View>
            </Pressable>
          )}
          estimatedItemSize={100}
          onEndReached={() => {
            if (hasNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <View style={styles.centerContent}>
                <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No results found
                </Text>
                <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
                  Try adjusting your filters or expanding your search radius.
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
        />
      ) : searchCenter ? (
        <ListingMapView
          listings={(listings as SearchListing[])
            .filter((l) => l.latitude != null && l.longitude != null)
            .slice(0, Config.maxVisibleMarkers) as Array<{
            id: string;
            title: string;
            price: number | null;
            priceType: string;
            latitude: number;
            longitude: number;
            isPromoted: boolean;
            thumbnailUrl: string | null;
          }>}
          searchCenter={searchCenter}
          radiusMiles={radiusMiles}
          onSearchThisArea={(center) => setSearchCenter(center)}
        />
      ) : (
        <View style={[styles.centerContent, { flex: 1 }]}>
          <Ionicons name="location-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Location unavailable</Text>
          <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
            Enable location access to see listings on the map.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.select({ ios: Spacing.md, android: Spacing.xs }),
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    paddingVertical: Platform.select({ ios: 0, android: Spacing.xs }),
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChips: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    ...Typography.caption1,
    fontWeight: '500',
  },
  viewToggle: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.lg,
  },
  sortText: {
    ...Typography.footnote,
  },
  resultRow: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  resultImageContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  resultImagePlaceholder: {
    width: '100%',
    height: '100%',
  },
  resultContent: {
    flex: 1,
    justifyContent: 'center',
  },
  resultPrice: {
    ...Typography.headline,
  },
  resultTitle: {
    ...Typography.subhead,
    marginTop: 2,
  },
  resultMeta: {
    ...Typography.caption1,
    marginTop: Spacing.xs,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['4xl'],
    gap: Spacing.md,
  },
  emptyTitle: {
    ...Typography.title3,
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
