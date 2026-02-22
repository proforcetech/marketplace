import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { api, APIError } from '@/services/api';
import { useThemeColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/stores/auth-store';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';

/**
 * Listing detail screen.
 *
 * Displays the full listing with image gallery, seller info,
 * category-specific fields, and a sticky "Message Seller" bar.
 */

const SCREEN_WIDTH = Dimensions.get('window').width;

function formatPrice(price: number, priceType: string): string {
  if (priceType === 'free') return 'Free';
  if (priceType === 'hourly') return `$${price}/hr`;
  const formatted = price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  if (priceType === 'obo') return `${formatted} OBO`;
  return formatted;
}

function formatRelativeDate(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Posted today';
  if (diffDays === 1) return 'Posted yesterday';
  if (diffDays < 7) return `Posted ${diffDays} days ago`;
  if (diffDays < 30) return `Posted ${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return `Posted ${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
}

function formatCondition(condition: string): string {
  return condition
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function SkeletonBox({
  width,
  height,
  style,
  color,
}: {
  width: number | string;
  height: number;
  style?: object;
  color: string;
}) {
  return (
    <View
      style={[
        {
          width: width as number,
          height,
          backgroundColor: color,
          borderRadius: BorderRadius.sm,
        },
        style,
      ]}
    />
  );
}

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((s) => s.user);
  const imageScrollRef = useRef<FlatList>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isMessaging, setIsMessaging] = useState(false);

  const {
    data: listing,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => api.listings.get(id),
    enabled: !!id,
  });

  const images: Array<{ url: string; blurhash?: string }> = useMemo(() => {
    if (!listing) return [];
    if (listing.images && Array.isArray(listing.images) && listing.images.length > 0) {
      return listing.images;
    }
    if (listing.media && Array.isArray(listing.media) && listing.media.length > 0) {
      return listing.media.map((m: Record<string, unknown>) => ({
        url: (m.url as string) ?? (m.imageUrl as string),
        blurhash: m.blurhash as string | undefined,
      }));
    }
    if (listing.imageUrl) {
      return [{ url: listing.imageUrl, blurhash: listing.imageBlurhash }];
    }
    return [];
  }, [listing]);

  const seller = useMemo(() => {
    if (!listing) return null;
    return listing.seller ?? listing.user ?? null;
  }, [listing]);

  const fieldValues: Array<{ label: string; value: string }> = useMemo(() => {
    if (!listing?.fieldValues && !listing?.structuredFields) return [];
    const fields = listing.fieldValues ?? listing.structuredFields ?? {};
    return Object.entries(fields as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([key, value]) => ({
        label: key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (s) => s.toUpperCase())
          .trim(),
        value: String(value),
      }));
  }, [listing]);

  const handleShare = useCallback(async () => {
    if (!listing) return;
    try {
      await Share.share({
        message: `Check out "${listing.title}" on Marketplace`,
        url: `https://marketplace.app/listing/${id}`,
      });
    } catch {
      // User cancelled share or share failed -- non-critical
    }
  }, [listing, id]);

  const handleMessageSeller = useCallback(async () => {
    if (!listing || isMessaging) return;

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsMessaging(true);
    try {
      const conversation = await api.messages.startConversation(
        id,
        `Hi, I'm interested in "${listing.title}".`
      );
      const conversationId = conversation.id ?? conversation.conversationId;
      router.push(`/chat/${conversationId}` as never);
    } catch (err: unknown) {
      // If conversation already exists, the API typically returns the existing one
      if (err instanceof APIError && err.details?.conversationId) {
        router.push(`/chat/${err.details.conversationId}` as never);
      }
    } finally {
      setIsMessaging(false);
    }
  }, [listing, id, isMessaging, router]);

  const handleSellerPress = useCallback(() => {
    if (!seller) return;
    router.push(`/user/${seller.id}` as never);
  }, [seller, router]);

  const onImageScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setActiveImageIndex(index);
    },
    []
  );

  // --- Loading State ---
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.headerBar, { paddingTop: insets.top }]}>
          <Pressable
            onPress={() => router.back()}
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.skeletonContent}>
          <SkeletonBox width={SCREEN_WIDTH} height={SCREEN_WIDTH * 0.75} color={colors.skeleton} />
          <View style={styles.skeletonBody}>
            <SkeletonBox width={120} height={28} color={colors.skeleton} />
            <SkeletonBox width="80%" height={22} style={{ marginTop: Spacing.md }} color={colors.skeleton} />
            <SkeletonBox width="60%" height={16} style={{ marginTop: Spacing.md }} color={colors.skeleton} />
            <SkeletonBox width="40%" height={14} style={{ marginTop: Spacing.md }} color={colors.skeleton} />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.skeletonSellerRow}>
              <SkeletonBox width={48} height={48} style={{ borderRadius: 24 }} color={colors.skeleton} />
              <View style={styles.skeletonSellerInfo}>
                <SkeletonBox width={140} height={18} color={colors.skeleton} />
                <SkeletonBox width={100} height={14} style={{ marginTop: Spacing.xs }} color={colors.skeleton} />
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <SkeletonBox width="100%" height={80} color={colors.skeleton} />
          </View>
        </ScrollView>
      </View>
    );
  }

  // --- Error State ---
  if (isError || !listing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.headerBar, { paddingTop: insets.top }]}>
          <Pressable
            onPress={() => router.back()}
            style={styles.headerButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.errorTitle, { color: colors.text }]}>
            Could not load listing
          </Text>
          <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
            {error instanceof Error ? error.message : 'Something went wrong'}
          </Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => refetch()}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isOwnListing = currentUser?.id === seller?.id;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Floating Header */}
      <View style={[styles.headerBar, styles.floatingHeader, { paddingTop: insets.top }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.headerButton, styles.floatingButton, { backgroundColor: colors.overlay }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Pressable
          onPress={handleShare}
          style={[styles.headerButton, styles.floatingButton, { backgroundColor: colors.overlay }]}
          accessibilityRole="button"
          accessibilityLabel="Share listing"
        >
          <Ionicons name="share-outline" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Gallery */}
        {images.length > 0 ? (
          <View>
            <FlatList
              ref={imageScrollRef}
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onImageScroll}
              scrollEventThrottle={16}
              keyExtractor={(_, index) => `image-${index}`}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item.url }}
                  placeholder={item.blurhash ? { blurhash: item.blurhash } : undefined}
                  transition={200}
                  contentFit="cover"
                  style={styles.galleryImage}
                />
              )}
            />
            {images.length > 1 && (
              <View style={[styles.imageBadge, { backgroundColor: colors.overlay }]}>
                <Text style={styles.imageBadgeText}>
                  {activeImageIndex + 1}/{images.length}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.surface }]}>
            <Ionicons name="camera-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.imagePlaceholderText, { color: colors.textTertiary }]}>
              No photos
            </Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.contentBody}>
          {/* Price */}
          <Text style={[styles.price, { color: colors.primary }]}>
            {formatPrice(listing.price ?? 0, listing.priceType ?? 'fixed')}
          </Text>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {listing.title}
          </Text>

          {/* Badges Row */}
          <View style={styles.badgesRow}>
            {listing.condition && (
              <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.badgeText, { color: colors.text }]}>
                  {formatCondition(listing.condition)}
                </Text>
              </View>
            )}
            {(listing.categoryName ?? listing.category?.label) && (
              <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.badgeText, { color: colors.text }]}>
                  {listing.categoryName ?? listing.category?.label}
                </Text>
              </View>
            )}
          </View>

          {/* Location & Date */}
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              {[listing.city, listing.state].filter(Boolean).join(', ')}
              {listing.distance !== undefined && ` \u2022 ${listing.distance.toFixed(1)} mi away`}
            </Text>
          </View>

          {listing.createdAt && (
            <Text style={[styles.dateText, { color: colors.textTertiary }]}>
              {formatRelativeDate(listing.createdAt)}
            </Text>
          )}

          {/* Promoted Badge */}
          {(listing.isPromoted ?? listing.isSponsored) && (
            <View style={[styles.promotedBadge, { backgroundColor: colors.sponsored + '20' }]}>
              <Ionicons name="flash" size={14} color={colors.sponsored} />
              <Text style={[styles.promotedText, { color: colors.sponsored }]}>
                Promoted
              </Text>
            </View>
          )}

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Seller Card */}
          {seller && (
            <Pressable
              style={styles.sellerCard}
              onPress={handleSellerPress}
              accessibilityRole="button"
              accessibilityLabel={`View ${seller.displayName}'s profile`}
            >
              <View style={[styles.sellerAvatar, { backgroundColor: colors.primary + '20' }]}>
                {seller.avatarUrl ? (
                  <Image
                    source={{ uri: seller.avatarUrl }}
                    style={styles.sellerAvatarImage}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={[styles.sellerInitials, { color: colors.primary }]}>
                    {(seller.displayName ?? '')
                      .split(' ')
                      .map((n: string) => n.charAt(0))
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </Text>
                )}
              </View>
              <View style={styles.sellerInfo}>
                <View style={styles.sellerNameRow}>
                  <Text style={[styles.sellerName, { color: colors.text }]}>
                    {seller.displayName}
                  </Text>
                  {(seller.isVerified ?? seller.identityVerified) && (
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  )}
                </View>
                {seller.rating !== undefined && seller.rating !== null && (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color={colors.sponsored} />
                    <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
                      {Number(seller.rating).toFixed(1)}
                      {seller.ratingCount !== undefined && ` (${seller.ratingCount})`}
                    </Text>
                  </View>
                )}
                <Text style={[styles.sellerMeta, { color: colors.textTertiary }]}>
                  Member since {new Date(seller.joinedAt ?? seller.createdAt).getFullYear()}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </Pressable>
          )}

          {/* Message Seller - inline */}
          {!isOwnListing && (
            <Pressable
              style={[styles.messageButtonInline, { backgroundColor: colors.primary }]}
              onPress={handleMessageSeller}
              disabled={isMessaging}
              accessibilityRole="button"
              accessibilityLabel="Message seller"
            >
              {isMessaging ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.messageButtonText}>Message Seller</Text>
                </>
              )}
            </Pressable>
          )}

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Category Field Values */}
          {fieldValues.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Details</Text>
              <View style={styles.fieldsGrid}>
                {fieldValues.map((field) => (
                  <View key={field.label} style={styles.fieldItem}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      {field.label}
                    </Text>
                    <Text style={[styles.fieldValue, { color: colors.text }]}>
                      {field.value}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </>
          )}

          {/* Description */}
          {listing.description && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
              <Text style={[styles.description, { color: colors.text }]}>
                {listing.description}
              </Text>
            </>
          )}

          {/* Report Link */}
          <Pressable
            style={styles.reportLink}
            accessibilityRole="link"
            accessibilityLabel="Report this listing"
          >
            <Ionicons name="flag-outline" size={16} color={colors.textTertiary} />
            <Text style={[styles.reportText, { color: colors.textTertiary }]}>
              Report listing
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Sticky Bottom Bar */}
      {!isOwnListing && (
        <View
          style={[
            styles.stickyBottom,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              paddingBottom: insets.bottom || Spacing.lg,
            },
          ]}
        >
          <Pressable
            style={[styles.stickyMessageButton, { backgroundColor: colors.primary }]}
            onPress={handleMessageSeller}
            disabled={isMessaging}
            accessibilityRole="button"
            accessibilityLabel="Message seller"
          >
            {isMessaging ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
                <Text style={styles.stickyMessageText}>Message Seller</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  floatingButton: {
    borderRadius: BorderRadius.full,
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Gallery
  galleryImage: {
    width: SCREEN_WIDTH,
    aspectRatio: 4 / 3,
  },
  imageBadge: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  imageBadgeText: {
    ...Typography.caption1,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  imagePlaceholder: {
    width: SCREEN_WIDTH,
    aspectRatio: 4 / 3,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  imagePlaceholderText: {
    ...Typography.subhead,
  },

  // Content
  contentBody: {
    padding: Spacing.lg,
  },
  price: {
    ...Typography.title1,
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.title3,
    marginBottom: Spacing.md,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  badgeText: {
    ...Typography.caption1,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  metaText: {
    ...Typography.subhead,
  },
  dateText: {
    ...Typography.footnote,
    marginBottom: Spacing.md,
  },
  promotedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  promotedText: {
    ...Typography.caption1,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.xl,
  },

  // Seller
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  sellerAvatarImage: {
    width: 48,
    height: 48,
  },
  sellerInitials: {
    ...Typography.headline,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sellerName: {
    ...Typography.headline,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  ratingText: {
    ...Typography.caption1,
  },
  sellerMeta: {
    ...Typography.caption1,
    marginTop: 2,
  },

  // Message Seller (inline)
  messageButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    minHeight: 48,
  },
  messageButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },

  // Fields Grid
  sectionTitle: {
    ...Typography.headline,
    marginBottom: Spacing.md,
  },
  fieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  fieldItem: {
    width: '50%',
    marginBottom: Spacing.md,
    paddingRight: Spacing.md,
  },
  fieldLabel: {
    ...Typography.caption1,
    marginBottom: 2,
  },
  fieldValue: {
    ...Typography.subhead,
    fontWeight: '500',
  },

  // Description
  description: {
    ...Typography.body,
    lineHeight: 24,
  },

  // Report
  reportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing['3xl'],
    paddingVertical: Spacing.md,
  },
  reportText: {
    ...Typography.footnote,
  },

  // Sticky Bottom
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  stickyMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    minHeight: 52,
  },
  stickyMessageText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },

  // Skeleton
  skeletonContent: {
    paddingBottom: Spacing['4xl'],
  },
  skeletonBody: {
    padding: Spacing.lg,
  },
  skeletonSellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  skeletonSellerInfo: {
    flex: 1,
  },

  // Error
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['3xl'],
    gap: Spacing.md,
  },
  errorTitle: {
    ...Typography.title3,
  },
  errorMessage: {
    ...Typography.body,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  retryButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },
});
