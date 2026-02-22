import { useCallback, useEffect } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useThemeColors } from '@/hooks/useColorScheme';
import { useListingDraftStore } from '@/stores/listing-draft-store';
import { useAuthStore } from '@/stores/auth-store';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';

/**
 * Create Listing screen (Sell tab).
 *
 * This is the entry point for listing creation. It offers:
 * 1. Camera-first quick capture (primary action)
 * 2. Category selection for structured creation
 * 3. Resume draft prompt if an unfinished draft exists
 *
 * The actual multi-step creation flow is handled by the
 * /create/* stack screens. This tab screen is the launcher.
 */

const QUICK_CATEGORIES = [
  { id: 'for_sale', icon: 'pricetag-outline' as const, label: 'For Sale' },
  { id: 'automotive', icon: 'car-outline' as const, label: 'Automotive' },
  { id: 'housing', icon: 'home-outline' as const, label: 'Housing' },
  { id: 'real_estate', icon: 'business-outline' as const, label: 'Real Estate' },
  { id: 'services', icon: 'construct-outline' as const, label: 'Services' },
  { id: 'jobs', icon: 'briefcase-outline' as const, label: 'Jobs' },
  { id: 'community', icon: 'people-outline' as const, label: 'Community' },
  { id: 'other', icon: 'ellipsis-horizontal-outline' as const, label: 'Other' },
];

export default function CreateScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { currentDraft, hasPendingDraft, startNewDraft, clearDraft } =
    useListingDraftStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Prompt to resume draft on mount
  useEffect(() => {
    if (hasPendingDraft && currentDraft) {
      const draftAge = Date.now() - currentDraft.lastModified;
      const draftAgeHours = Math.round(draftAge / (1000 * 60 * 60));

      Alert.alert(
        'Resume Draft?',
        `You have an unfinished listing${currentDraft.title ? ` "${currentDraft.title}"` : ''} from ${draftAgeHours < 1 ? 'less than an hour' : `${draftAgeHours} hour${draftAgeHours > 1 ? 's' : ''}`} ago.`,
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: clearDraft,
          },
          {
            text: 'Resume',
            onPress: () => {
              // Navigate to the appropriate step based on draft state
              router.push('/create/details' as any);
            },
          },
        ]
      );
    }
  }, []);

  const handleCameraCreate = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    startNewDraft();
    router.push('/create/media' as any);
  }, [startNewDraft, router]);

  const handleCategorySelect = useCallback(
    (categoryId: string) => {
      if (Platform.OS === 'ios') {
        Haptics.selectionAsync();
      }
      startNewDraft();
      useListingDraftStore.getState().updateDraft({
        categoryId,
        categoryName: QUICK_CATEGORIES.find((c) => c.id === categoryId)?.label,
      });
      router.push('/create/details' as any);
    },
    [startNewDraft, router]
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Camera-First CTA */}
      <Pressable
        style={[styles.cameraCard, { backgroundColor: colors.primary }]}
        onPress={handleCameraCreate}
        accessibilityRole="button"
        accessibilityLabel="Take a photo to create a listing"
      >
        <View style={styles.cameraIconContainer}>
          <Ionicons name="camera" size={48} color="#FFFFFF" />
        </View>
        <Text style={styles.cameraTitle}>Take a Photo to Sell</Text>
        <Text style={styles.cameraSubtitle}>
          Snap a photo and we will help you create the listing
        </Text>
      </Pressable>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.textTertiary }]}>
          or choose a category
        </Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      {/* Category Grid */}
      <View style={styles.categoryGrid}>
        {QUICK_CATEGORIES.map((category) => (
          <Pressable
            key={category.id}
            style={[
              styles.categoryCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => handleCategorySelect(category.id)}
            accessibilityRole="button"
            accessibilityLabel={`Create ${category.label} listing`}
          >
            <Ionicons
              name={category.icon}
              size={28}
              color={colors.primary}
              style={styles.categoryIcon}
            />
            <Text
              style={[styles.categoryLabel, { color: colors.text }]}
              numberOfLines={1}
            >
              {category.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tips */}
      <View style={[styles.tipsCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.tipsTitle, { color: colors.text }]}>
          Tips for a great listing
        </Text>
        <View style={styles.tipRow}>
          <Ionicons name="images-outline" size={20} color={colors.primary} />
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            Add multiple clear, well-lit photos
          </Text>
        </View>
        <View style={styles.tipRow}>
          <Ionicons name="text-outline" size={20} color={colors.primary} />
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            Write a detailed, honest description
          </Text>
        </View>
        <View style={styles.tipRow}>
          <Ionicons name="cash-outline" size={20} color={colors.primary} />
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            Set a fair price -- check similar listings nearby
          </Text>
        </View>
        <View style={styles.tipRow}>
          <Ionicons name="location-outline" size={20} color={colors.primary} />
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            Your approximate location helps nearby buyers find you
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing['5xl'],
  },
  cameraCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing['3xl'],
    alignItems: 'center',
    gap: Spacing.md,
  },
  cameraIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cameraTitle: {
    ...Typography.title2,
    color: '#FFFFFF',
  },
  cameraSubtitle: {
    ...Typography.callout,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing['2xl'],
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    ...Typography.footnote,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  categoryCard: {
    width: '47%',
    flexGrow: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryIcon: {
    marginBottom: Spacing.xs,
  },
  categoryLabel: {
    ...Typography.subhead,
    fontWeight: '500',
    textAlign: 'center',
  },
  tipsCard: {
    marginTop: Spacing['2xl'],
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  tipsTitle: {
    ...Typography.headline,
    marginBottom: Spacing.xs,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  tipText: {
    ...Typography.subhead,
    flex: 1,
  },
});
