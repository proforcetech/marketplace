import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/hooks/useColorScheme';
import { useListingDraftStore } from '@/stores/listing-draft-store';
import { useLocation } from '@/hooks/useLocation';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { CATEGORY_TREE } from '@marketplace/shared/constants/categories';

/**
 * Listing details screen (step 2 of listing creation).
 *
 * Collects title, category, condition, price, description, and location.
 * All changes are persisted to the draft store in real-time.
 */

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
] as const;

const PRICE_TYPES = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'obo', label: 'OBO' },
  { value: 'free', label: 'Free' },
  { value: 'hourly', label: 'Hourly' },
] as const;

interface CategoryOption {
  slug: string;
  label: string;
  parentLabel: string;
}

export default function DetailsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { location } = useLocation();
  const { currentDraft, updateDraft } = useListingDraftStore();

  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Flatten category tree for the selection modal
  const categoryOptions: CategoryOption[] = useMemo(() => {
    const options: CategoryOption[] = [];
    for (const topLevel of CATEGORY_TREE) {
      for (const sub of topLevel.subcategories) {
        options.push({
          slug: sub.slug,
          label: sub.label,
          parentLabel: topLevel.label,
        });
      }
    }
    return options;
  }, []);

  // Form state derived from draft
  const title = currentDraft?.title ?? '';
  const categoryId = currentDraft?.categoryId ?? '';
  const categoryName = currentDraft?.categoryName ?? '';
  const condition = currentDraft?.condition;
  const price = currentDraft?.price;
  const priceType = currentDraft?.priceType ?? 'fixed';
  const description = currentDraft?.description ?? '';

  // Location pre-fill
  const locationCity = location?.city ?? '';
  const locationState = location?.state ?? '';
  const [locationInput, setLocationInput] = useState(
    currentDraft?.structuredFields?.locationText as string ??
    (locationCity && locationState ? `${locationCity}, ${locationState}` : '')
  );

  const handleTitleChange = useCallback(
    (text: string) => {
      const trimmed = text.slice(0, 200);
      updateDraft({ title: trimmed });
    },
    [updateDraft]
  );

  const handleCategorySelect = useCallback(
    (option: CategoryOption) => {
      if (Platform.OS === 'ios') {
        Haptics.selectionAsync();
      }
      updateDraft({
        categoryId: option.slug,
        categoryName: `${option.parentLabel} - ${option.label}`,
      });
      setShowCategoryModal(false);
    },
    [updateDraft]
  );

  const handleConditionSelect = useCallback(
    (value: string) => {
      if (Platform.OS === 'ios') {
        Haptics.selectionAsync();
      }
      updateDraft({ condition: value as typeof condition });
    },
    [updateDraft]
  );

  const handlePriceChange = useCallback(
    (text: string) => {
      const cleaned = text.replace(/[^0-9.]/g, '');
      const numericValue = cleaned ? parseFloat(cleaned) : undefined;
      updateDraft({ price: numericValue });
    },
    [updateDraft]
  );

  const handlePriceTypeSelect = useCallback(
    (value: string) => {
      if (Platform.OS === 'ios') {
        Haptics.selectionAsync();
      }
      updateDraft({ priceType: value as typeof priceType });
      if (value === 'free') {
        updateDraft({ price: 0 });
      }
    },
    [updateDraft]
  );

  const handleDescriptionChange = useCallback(
    (text: string) => {
      const trimmed = text.slice(0, 2000);
      updateDraft({ description: trimmed });
    },
    [updateDraft]
  );

  const handleLocationChange = useCallback(
    (text: string) => {
      setLocationInput(text);
      updateDraft({
        structuredFields: {
          ...currentDraft?.structuredFields,
          locationText: text,
        },
      });
    },
    [currentDraft?.structuredFields, updateDraft]
  );

  const handleContinue = useCallback(() => {
    const errors: string[] = [];
    if (!title.trim()) errors.push('Title is required');
    if (!categoryId) errors.push('Category is required');
    if (!condition) errors.push('Condition is required');

    if (errors.length > 0) {
      Alert.alert('Missing Information', errors.join('\n'));
      return;
    }

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    router.push('/create/preview' as never);
  }, [title, categoryId, condition, router]);

  const handleSaveDraft = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Alert.alert('Draft Saved', 'Your listing draft has been saved.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }, [router]);

  const isFormValid = title.trim().length > 0 && !!categoryId && !!condition;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding' as const, android: 'height' as const })}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              Title <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={title}
              onChangeText={handleTitleChange}
              placeholder="What are you selling?"
              placeholderTextColor={colors.textTertiary}
              maxLength={200}
              accessibilityRole="text"
              accessibilityLabel="Listing title"
            />
            <Text style={[styles.charCount, { color: colors.textTertiary }]}>
              {title.length}/200
            </Text>
          </View>

          {/* Category */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              Category <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <Pressable
              style={[
                styles.input,
                styles.selectInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => setShowCategoryModal(true)}
              accessibilityRole="button"
              accessibilityLabel={`Select category${categoryName ? `, currently ${categoryName}` : ''}`}
            >
              <Text
                style={[
                  styles.selectText,
                  { color: categoryName ? colors.text : colors.textTertiary },
                ]}
                numberOfLines={1}
              >
                {categoryName || 'Select a category'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Condition */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>
              Condition <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <View style={styles.conditionRow}>
              {CONDITIONS.map((item) => (
                <Pressable
                  key={item.value}
                  style={[
                    styles.conditionPill,
                    {
                      backgroundColor: condition === item.value ? colors.primary : colors.surface,
                      borderColor: condition === item.value ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleConditionSelect(item.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: condition === item.value }}
                  accessibilityLabel={`Condition: ${item.label}`}
                >
                  <Text
                    style={[
                      styles.conditionPillText,
                      { color: condition === item.value ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Price */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Price</Text>
            <View style={styles.priceRow}>
              <View style={[styles.priceInputContainer, { flex: 1 }]}>
                <Text style={[styles.pricePrefix, { color: colors.textSecondary }]}>$</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.priceInput,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={price !== undefined && price !== 0 ? String(price) : ''}
                  onChangeText={handlePriceChange}
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="decimal-pad"
                  editable={priceType !== 'free'}
                  accessibilityRole="text"
                  accessibilityLabel="Price amount"
                />
              </View>
            </View>
            <View style={styles.priceTypeRow}>
              {PRICE_TYPES.map((item) => (
                <Pressable
                  key={item.value}
                  style={[
                    styles.priceTypePill,
                    {
                      backgroundColor: priceType === item.value ? colors.primary : colors.surface,
                      borderColor: priceType === item.value ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handlePriceTypeSelect(item.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: priceType === item.value }}
                  accessibilityLabel={`Price type: ${item.label}`}
                >
                  <Text
                    style={[
                      styles.priceTypePillText,
                      { color: priceType === item.value ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Description</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={description}
              onChangeText={handleDescriptionChange}
              placeholder="Describe your item -- condition, features, reason for selling..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              maxLength={2000}
              textAlignVertical="top"
              accessibilityRole="text"
              accessibilityLabel="Listing description"
            />
            <Text style={[styles.charCount, { color: colors.textTertiary }]}>
              {description.length}/2000
            </Text>
          </View>

          {/* Location */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Location</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={locationInput}
              onChangeText={handleLocationChange}
              placeholder="City, State (e.g. Austin, TX)"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
              accessibilityRole="text"
              accessibilityLabel="Listing location"
            />
          </View>

          {/* Save Draft Link */}
          <Pressable
            style={styles.saveDraftLink}
            onPress={handleSaveDraft}
            accessibilityRole="button"
            accessibilityLabel="Save draft and exit"
          >
            <Ionicons name="bookmark-outline" size={18} color={colors.primary} />
            <Text style={[styles.saveDraftText, { color: colors.primary }]}>
              Save Draft
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Continue Button */}
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
        <Pressable
          style={[
            styles.continueButton,
            {
              backgroundColor: isFormValid ? colors.primary : colors.primary + '60',
            },
          ]}
          onPress={handleContinue}
          disabled={!isFormValid}
          accessibilityRole="button"
          accessibilityLabel="Continue to preview"
          accessibilityState={{ disabled: !isFormValid }}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </Pressable>
      </View>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Select Category
            </Text>
            <Pressable
              onPress={() => setShowCategoryModal(false)}
              style={styles.modalClose}
              accessibilityRole="button"
              accessibilityLabel="Close category selection"
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.modalContent}
          >
            {CATEGORY_TREE.map((topLevel) => (
              <View key={topLevel.slug} style={styles.categoryGroup}>
                <Text style={[styles.categoryGroupTitle, { color: colors.textSecondary }]}>
                  {topLevel.label}
                </Text>
                {topLevel.subcategories.map((sub) => {
                  const isSelected = categoryId === sub.slug;
                  return (
                    <Pressable
                      key={sub.slug}
                      style={[
                        styles.categoryOption,
                        { borderBottomColor: colors.border },
                        isSelected && { backgroundColor: colors.primary + '10' },
                      ]}
                      onPress={() =>
                        handleCategorySelect({
                          slug: sub.slug,
                          label: sub.label,
                          parentLabel: topLevel.label,
                        })
                      }
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={`${topLevel.label} - ${sub.label}`}
                    >
                      <Text style={[styles.categoryOptionText, { color: colors.text }]}>
                        {sub.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={22} color={colors.primary} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
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
    padding: Spacing.lg,
    paddingBottom: Spacing['5xl'],
  },
  fieldContainer: {
    marginBottom: Spacing.xl,
  },
  label: {
    ...Typography.subhead,
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  input: {
    ...Typography.body,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.select({ ios: Spacing.md + 2, android: Spacing.md }),
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    ...Typography.body,
    flex: 1,
  },
  charCount: {
    ...Typography.caption1,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  conditionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  conditionPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  conditionPillText: {
    ...Typography.subhead,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pricePrefix: {
    ...Typography.title3,
    position: 'absolute',
    left: Spacing.lg,
    zIndex: 1,
  },
  priceInput: {
    flex: 1,
    paddingLeft: Spacing['2xl'] + Spacing.xs,
  },
  priceTypeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  priceTypePill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  priceTypePillText: {
    ...Typography.footnote,
    fontWeight: '500',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: Spacing.md,
  },
  saveDraftLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.md,
  },
  saveDraftText: {
    ...Typography.subhead,
    fontWeight: '500',
  },
  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  continueButton: {
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  continueButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },

  // Category Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    ...Typography.headline,
  },
  modalClose: {
    padding: Spacing.xs,
  },
  modalContent: {
    paddingBottom: Spacing['4xl'],
  },
  categoryGroup: {
    marginBottom: Spacing.md,
  },
  categoryGroupTitle: {
    ...Typography.footnote,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  categoryOptionText: {
    ...Typography.body,
  },
});
