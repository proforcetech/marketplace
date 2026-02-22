import { useCallback, useState } from 'react';
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
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '@/hooks/useColorScheme';
import { useListingDraftStore, type DraftImage } from '@/stores/listing-draft-store';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';

/**
 * Media selection screen (step 1 of listing creation).
 *
 * Allows users to take photos with the camera or choose from the
 * device library. Displays selected photos in a 3-column grid
 * with the ability to remove individual photos.
 *
 * Minimum 1 photo required. Maximum 8 photos.
 */

const MAX_PHOTOS = 8;

export default function MediaScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentDraft, addImages, removeImage } = useListingDraftStore();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const currentImages = currentDraft?.images ?? [];
  const remainingSlots = MAX_PHOTOS - currentImages.length;

  const handleTakePhoto = useCallback(async () => {
    if (remainingSlots <= 0) {
      Alert.alert('Photo Limit', `You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Access Required',
        'Please grant camera access in your device settings to take photos.'
      );
      return;
    }

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setIsPickerOpen(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newImages: DraftImage[] = result.assets.map((asset) => ({
          localUri: asset.uri,
          width: asset.width,
          height: asset.height,
          isUploading: false,
          uploadProgress: 0,
        }));
        addImages(newImages);
      }
    } catch {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsPickerOpen(false);
    }
  }, [remainingSlots, addImages]);

  const handleChooseFromLibrary = useCallback(async () => {
    if (remainingSlots <= 0) {
      Alert.alert('Photo Limit', `You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Photo Library Access Required',
        'Please grant photo library access in your device settings.'
      );
      return;
    }

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setIsPickerOpen(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: remainingSlots,
      });

      if (!result.canceled && result.assets.length > 0) {
        const newImages: DraftImage[] = result.assets.map((asset) => ({
          localUri: asset.uri,
          width: asset.width,
          height: asset.height,
          isUploading: false,
          uploadProgress: 0,
        }));
        addImages(newImages);
      }
    } catch {
      Alert.alert('Error', 'Failed to select photos. Please try again.');
    } finally {
      setIsPickerOpen(false);
    }
  }, [remainingSlots, addImages]);

  const handleRemoveImage = useCallback(
    (localUri: string) => {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      removeImage(localUri);
    },
    [removeImage]
  );

  const handleContinue = useCallback(() => {
    if (currentImages.length === 0) {
      Alert.alert('Photos Required', 'Please add at least one photo to continue.');
      return;
    }

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    router.push('/create/details' as never);
  }, [currentImages.length, router]);

  const canContinue = currentImages.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleTakePhoto}
            disabled={isPickerOpen || remainingSlots <= 0}
            accessibilityRole="button"
            accessibilityLabel="Take a photo with camera"
          >
            <Ionicons name="camera" size={28} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Take Photo</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
            onPress={handleChooseFromLibrary}
            disabled={isPickerOpen || remainingSlots <= 0}
            accessibilityRole="button"
            accessibilityLabel="Choose photos from library"
          >
            <Ionicons name="images" size={28} color={colors.primary} />
            <Text style={[styles.actionButtonTextAlt, { color: colors.text }]}>
              From Library
            </Text>
          </Pressable>
        </View>

        {/* Photo Count */}
        <Text style={[styles.photoCount, { color: colors.textSecondary }]}>
          {currentImages.length}/{MAX_PHOTOS} photos added
        </Text>

        {/* Photo Grid */}
        {currentImages.length > 0 && (
          <View style={styles.photoGrid}>
            {currentImages.map((image, index) => (
              <View key={image.localUri} style={styles.photoItem}>
                <Image
                  source={{ uri: image.localUri }}
                  style={styles.photoImage}
                  contentFit="cover"
                  transition={150}
                />
                {index === 0 && (
                  <View style={[styles.coverBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.coverBadgeText}>Cover</Text>
                  </View>
                )}
                <Pressable
                  style={[styles.removeButton, { backgroundColor: colors.error }]}
                  onPress={() => handleRemoveImage(image.localUri)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${index + 1}`}
                  hitSlop={4}
                >
                  <Ionicons name="close" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {currentImages.length === 0 && (
          <View style={[styles.emptyState, { borderColor: colors.border }]}>
            <Ionicons name="image-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              No photos yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textTertiary }]}>
              Take a photo or choose from your library to get started
            </Text>
          </View>
        )}

        {/* TODO: drag-to-reorder with react-native-gesture-handler */}
      </ScrollView>

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
              backgroundColor: canContinue ? colors.primary : colors.primary + '60',
            },
          ]}
          onPress={handleContinue}
          disabled={!canContinue}
          accessibilityRole="button"
          accessibilityLabel="Continue to listing details"
          accessibilityState={{ disabled: !canContinue }}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
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
    padding: Spacing.lg,
    paddingBottom: Spacing['5xl'],
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing['2xl'],
    borderRadius: BorderRadius.lg,
  },
  actionButtonText: {
    ...Typography.subhead,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtonTextAlt: {
    ...Typography.subhead,
    fontWeight: '600',
  },
  photoCount: {
    ...Typography.footnote,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  photoItem: {
    width: '31.5%',
    flexGrow: 1,
    maxWidth: '33%',
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
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
  removeButton: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['5xl'],
    paddingHorizontal: Spacing['2xl'],
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.headline,
  },
  emptySubtitle: {
    ...Typography.subhead,
    textAlign: 'center',
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
});
