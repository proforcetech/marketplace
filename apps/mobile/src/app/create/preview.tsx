import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '@/services/api';
import { useThemeColors } from '@/hooks/useColorScheme';
import { useListingDraftStore } from '@/stores/listing-draft-store';
import { useLocation } from '@/hooks/useLocation';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';

/**
 * Preview screen (step 3 of listing creation).
 *
 * Shows a read-only preview of the listing before publishing.
 * Handles the creation API call, photo uploads, and navigation
 * to the newly created listing on success.
 */

function formatPrice(price: number | undefined, priceType: string): string {
  if (priceType === 'free') return 'Free';
  if (price === undefined || price === 0) return '$0';
  if (priceType === 'hourly') return `$${price}/hr`;
  const formatted = price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  if (priceType === 'obo') return `${formatted} OBO`;
  return formatted;
}

function formatCondition(condition: string | undefined): string {
  if (!condition) return '';
  return condition
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function PreviewScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { location } = useLocation();
  const { currentDraft, clearDraft } = useListingDraftStore();
  const [publishProgress, setPublishProgress] = useState('');

  const images = currentDraft?.images ?? [];
  const title = currentDraft?.title ?? '';
  const categoryName = currentDraft?.categoryName ?? '';
  const condition = currentDraft?.condition;
  const price = currentDraft?.price;
  const priceType = currentDraft?.priceType ?? 'fixed';
  const description = currentDraft?.description ?? '';
  const locationText = (currentDraft?.structuredFields?.locationText as string) ?? '';

  // Parse city/state from location text
  const parsedLocation = (() => {
    if (!locationText) return { city: '', state: '' };
    const parts = locationText.split(',').map((p) => p.trim());
    return {
      city: parts[0] ?? '',
      state: parts[1] ?? '',
    };
  })();

  const publishMutation = useMutation({
    mutationFn: async () => {
      setPublishProgress('Creating listing...');

      // 1. Create the listing
      const listing = await api.listings.create({
        title: title.trim(),
        categoryId: currentDraft?.categoryId,
        priceType,
        price: price ?? 0,
        condition,
        description: description.trim() || undefined,
        location: {
          city: parsedLocation.city,
          state: parsedLocation.state,
          lat: location?.latitude ?? 0,
          lng: location?.longitude ?? 0,
        },
      });

      const listingId = listing.id;

      // 2. Upload each photo
      if (images.length > 0) {
        setPublishProgress('Uploading photos...');

        for (let i = 0; i < images.length; i++) {
          setPublishProgress(`Uploading photo ${i + 1} of ${images.length}...`);

          try {
            // Get presigned upload URL
            const { uploadUrl, imageUrl } = await api.listings.getUploadUrl({
              filename: `listing-${listingId}-${i}.jpg`,
              contentType: 'image/jpeg',
            });

            // Upload the file to the presigned URL
            const imageResponse = await fetch(images[i].localUri);
            const blob = await imageResponse.blob();

            await fetch(uploadUrl, {
              method: 'PUT',
              body: blob,
              headers: {
                'Content-Type': 'image/jpeg',
              },
            });

            // Associate the uploaded image with the listing
            await api.listings.addMedia(listingId, {
              imageUrl,
              position: i,
            });
          } catch {
            // Continue with remaining photos even if one fails
          }
        }
      }

      return listingId;
    },
    onSuccess: (listingId: string) => {
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      clearDraft();
      router.replace(`/listing/${listingId}` as never);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to create listing. Please try again.';
      Alert.alert('Error', message);
      setPublishProgress('');
    },
  });

  const handleEditDetails = useCallback(() => {
    router.back();
  }, [router]);

  const handlePostListing = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    publishMutation.mutate();
  }, [publishMutation]);

  const isPublishing = publishMutation.isPending;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Photos Preview */}
        {images.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.imageScroll}
            style={styles.imageScrollContainer}
          >
            {images.map((image, index) => (
              <View key={image.localUri} style={styles.previewImageContainer}>
                <Image
                  source={{ uri: image.localUri }}
                  style={styles.previewImage}
                  contentFit="cover"
                  transition={150}
                />
                {index === 0 && (
                  <View style={[styles.coverBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.coverBadgeText}>Cover</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        )}

        {/* Listing Info Preview */}
        <View style={styles.infoSection}>
          {/* Price */}
          <Text style={[styles.previewPrice, { color: colors.primary }]}>
            {formatPrice(price, priceType)}
          </Text>

          {/* Title */}
          <Text style={[styles.previewTitle, { color: colors.text }]}>
            {title}
          </Text>

          {/* Badges */}
          <View style={styles.badgesRow}>
            {condition && (
              <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.badgeText, { color: colors.text }]}>
                  {formatCondition(condition)}
                </Text>
              </View>
            )}
            {categoryName && (
              <View style={[styles.badge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.badgeText, { color: colors.text }]}>
                  {categoryName}
                </Text>
              </View>
            )}
          </View>

          {/* Location */}
          {locationText && (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {locationText}
              </Text>
            </View>
          )}

          {/* Description */}
          {description && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                Description
              </Text>
              <Text style={[styles.previewDescription, { color: colors.text }]}>
                {description}
              </Text>
            </>
          )}
        </View>

        {/* Edit Details Button */}
        <Pressable
          style={[styles.editButton, { borderColor: colors.border }]}
          onPress={handleEditDetails}
          disabled={isPublishing}
          accessibilityRole="button"
          accessibilityLabel="Edit listing details"
        >
          <Ionicons name="create-outline" size={20} color={colors.primary} />
          <Text style={[styles.editButtonText, { color: colors.primary }]}>
            Edit Details
          </Text>
        </Pressable>
      </ScrollView>

      {/* Bottom Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom || Spacing.lg,
          },
        ]}
      >
        {isPublishing && publishProgress ? (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {publishProgress}
            </Text>
          </View>
        ) : null}

        <Pressable
          style={[
            styles.postButton,
            {
              backgroundColor: isPublishing ? colors.primary + '60' : colors.primary,
            },
          ]}
          onPress={handlePostListing}
          disabled={isPublishing}
          accessibilityRole="button"
          accessibilityLabel="Post listing"
          accessibilityState={{ disabled: isPublishing }}
        >
          {isPublishing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.postButtonText}>Post Listing</Text>
          )}
        </Pressable>
      </View>
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
  scrollContent: {
    paddingBottom: Spacing['5xl'],
  },

  // Images
  imageScrollContainer: {
    marginBottom: Spacing.lg,
  },
  imageScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  previewImageContainer: {
    position: 'relative',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: BorderRadius.md,
  },
  coverBadge: {
    position: 'absolute',
    bottom: Spacing.xs,
    left: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  coverBadgeText: {
    ...Typography.caption2,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Info Section
  infoSection: {
    paddingHorizontal: Spacing.lg,
  },
  previewPrice: {
    ...Typography.title1,
    marginBottom: Spacing.xs,
  },
  previewTitle: {
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
    marginBottom: Spacing.md,
  },
  metaText: {
    ...Typography.subhead,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.xl,
  },
  sectionLabel: {
    ...Typography.footnote,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  previewDescription: {
    ...Typography.body,
    lineHeight: 24,
  },

  // Edit Button
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  editButtonText: {
    ...Typography.subhead,
    fontWeight: '600',
  },

  // Bottom Bar
  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  progressText: {
    ...Typography.subhead,
  },
  postButton: {
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  postButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },
});
