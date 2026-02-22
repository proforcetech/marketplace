import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';

import { api } from '@/services/api';
import { useThemeColors } from '@/hooks/useColorScheme';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';

/**
 * Public user profile screen.
 *
 * Shows the seller's display name, verification status, rating, active
 * listings, and basic account details. Accessible without authentication.
 */

interface PublicUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  identityVerified: boolean;
  locationCity?: string;
  locationState?: string;
  ratingAvg?: number;
  ratingCount: number;
  responseRate?: number;
  createdAt: string;
}

interface ListingItem {
  id: string;
  title: string;
  price?: number;
  priceType: string;
  condition?: string;
  media: Array<{ url: string; thumbnailUrl?: string }>;
  category: { name: string };
}

function formatPrice(price: number | undefined, priceType: string): string {
  if (priceType === 'free' || !price) return 'Free';
  if (priceType === 'hourly') return `$${price.toLocaleString()}/hr`;
  const formatted = price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  if (priceType === 'obo') return `${formatted} OBO`;
  return formatted;
}

function formatMemberSince(dateString: string): string {
  const year = new Date(dateString).getFullYear();
  return `Member since ${year}`;
}

export default function UserProfileScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    data: user,
    isLoading: isUserLoading,
    isError: isUserError,
  } = useQuery({
    queryKey: ['user', id],
    queryFn: () => api.users.getProfile(id) as Promise<PublicUser>,
    enabled: !!id,
  });

  const {
    data: listingsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['user-listings', id],
    queryFn: ({ pageParam }) =>
      api.listings.getByUser(id, pageParam as string | undefined),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!id,
  });

  const listings = useMemo(
    () => (listingsData?.pages.flatMap((p) => p.items) ?? []) as ListingItem[],
    [listingsData],
  );

  const handleShare = useCallback(async () => {
    if (!user) return;
    await Share.share({
      message: `Check out ${user.displayName}'s listings on Marketplace`,
    });
  }, [user]);

  const renderListingCard = useCallback(
    ({ item }: { item: ListingItem }) => {
      const thumb = item.media[0]?.thumbnailUrl ?? item.media[0]?.url;
      return (
        <Pressable
          style={[
            styles.listingCard,
            { backgroundColor: colors.cardBackground, shadowColor: colors.cardShadow },
          ]}
          onPress={() => router.push(`/listing/${item.id}` as never)}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}, ${formatPrice(item.price, item.priceType)}`}
        >
          <View style={styles.listingImageContainer}>
            {thumb ? (
              <Image
                source={{ uri: thumb }}
                style={styles.listingImage}
                contentFit="cover"
                recyclingKey={item.id}
              />
            ) : (
              <View style={[styles.listingImagePlaceholder, { backgroundColor: colors.skeleton }]}>
                <Ionicons name="image-outline" size={28} color={colors.textTertiary} />
              </View>
            )}
          </View>
          <View style={styles.listingInfo}>
            <Text style={[styles.listingPrice, { color: colors.primary }]} numberOfLines={1}>
              {formatPrice(item.price, item.priceType)}
            </Text>
            <Text style={[styles.listingTitle, { color: colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            {item.condition && (
              <Text style={[styles.listingCondition, { color: colors.textTertiary }]}>
                {item.condition.replace('_', ' ')}
              </Text>
            )}
          </View>
        </Pressable>
      );
    },
    [colors, router],
  );

  if (isUserLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Profile', headerRight: () => null }} />
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  if (isUserError || !user) {
    return (
      <>
        <Stack.Screen options={{ title: 'Profile' }} />
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Ionicons name="person-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>User not found</Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </>
    );
  }

  const initials = user.displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <>
      <Stack.Screen
        options={{
          title: user.displayName,
          headerRight: () => (
            <Pressable
              onPress={handleShare}
              accessibilityRole="button"
              accessibilityLabel="Share this profile"
              style={{ paddingRight: Platform.select({ ios: 0, android: Spacing.sm }) }}
            >
              <Ionicons name="share-outline" size={22} color={colors.primary} />
            </Pressable>
          ),
        }}
      />

      <FlashList
        data={listings}
        renderItem={renderListingCard}
        numColumns={2}
        estimatedItemSize={220}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
        onEndReached={() => { if (hasNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View style={{ backgroundColor: colors.background }}>
            {/* Profile hero */}
            <View style={[styles.hero, { backgroundColor: colors.surface }]}>
              {/* Avatar */}
              <View style={styles.avatarContainer}>
                {user.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    style={[styles.avatar, { borderColor: colors.background }]}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={[styles.avatarPlaceholder, {
                      backgroundColor: colors.primary,
                      borderColor: colors.background,
                    }]}
                  >
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </View>
                )}
              </View>

              {/* Name + badges */}
              <Text style={[styles.displayName, { color: colors.text }]}>
                {user.displayName}
              </Text>

              <View style={styles.badgeRow}>
                {user.identityVerified && (
                  <View style={[styles.badge, { backgroundColor: colors.primary + '18' }]}>
                    <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
                    <Text style={[styles.badgeText, { color: colors.primary }]}>Verified</Text>
                  </View>
                )}
                {user.locationCity && (
                  <View style={[styles.badge, { backgroundColor: colors.surface }]}>
                    <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                    <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                      {[user.locationCity, user.locationState].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Stats row */}
              <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {user.ratingCount > 0 && user.ratingAvg
                      ? user.ratingAvg.toFixed(1)
                      : '—'}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    {user.ratingCount > 0 ? `★ (${user.ratingCount})` : 'No ratings'}
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {listings.length}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Active listings
                  </Text>
                </View>
                {user.responseRate != null && (
                  <>
                    <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.stat}>
                      <Text style={[styles.statValue, { color: colors.text }]}>
                        {Math.round(Number(user.responseRate) * 100)}%
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                        Response rate
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* Member since */}
              <Text style={[styles.memberSince, { color: colors.textTertiary }]}>
                {formatMemberSince(user.createdAt)}
              </Text>
            </View>

            {/* Bio */}
            {user.bio ? (
              <View style={[styles.section, { borderBottomColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
                <Text style={[styles.bio, { color: colors.textSecondary }]}>{user.bio}</Text>
              </View>
            ) : null}

            {/* Listings header */}
            <View style={styles.listingsHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Active Listings
              </Text>
              {isFetchingNextPage && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="pricetag-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No active listings</Text>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              This seller has no active listings right now.
            </Text>
          </View>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing['3xl'],
  },
  errorTitle: {
    ...Typography.title3,
    textAlign: 'center',
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
  hero: {
    alignItems: 'center',
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  avatarContainer: {
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    ...Typography.title1,
    color: '#FFFFFF',
  },
  displayName: {
    ...Typography.title2,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    ...Typography.caption1,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    ...Typography.headline,
  },
  statLabel: {
    ...Typography.caption1,
    textAlign: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
  },
  memberSince: {
    ...Typography.footnote,
  },
  section: {
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    ...Typography.headline,
    marginBottom: Spacing.sm,
  },
  bio: {
    ...Typography.body,
    lineHeight: 24,
  },
  listingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  listingCard: {
    flex: 1,
    margin: Spacing.xs,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  listingImageContainer: {
    aspectRatio: 4 / 3,
    width: '100%',
  },
  listingImage: {
    width: '100%',
    height: '100%',
  },
  listingImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingInfo: {
    padding: Spacing.md,
    gap: 2,
  },
  listingPrice: {
    ...Typography.headline,
  },
  listingTitle: {
    ...Typography.subhead,
  },
  listingCondition: {
    ...Typography.caption1,
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
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
});
