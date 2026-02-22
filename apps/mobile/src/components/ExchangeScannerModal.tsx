import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '@/hooks/useColorScheme';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { api, APIError } from '@/services/api';

interface ExchangeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (conversationId: string) => void;
}

/**
 * Camera-based QR scanner for the buyer to confirm an in-person exchange.
 * Scans the seller's QR code token and calls the confirm endpoint.
 * Prevents duplicate scans while a request is in-flight.
 */
export function ExchangeScannerModal({
  visible,
  onClose,
  onSuccess,
}: ExchangeScannerModalProps): React.JSX.Element {
  const colors = useThemeColors();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const scanningRef = useRef(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setError(null);
      setConfirming(false);
      scanningRef.current = false;
    }
  }, [visible]);

  const handleBarCodeScanned = useCallback(
    async (event: { data: string }) => {
      // Prevent duplicate scans while processing
      if (scanningRef.current) return;
      scanningRef.current = true;

      setConfirming(true);
      setError(null);

      try {
        const response = await api.exchange.confirm(event.data);
        onSuccess(response.data.conversationId);
        onClose();
      } catch (err) {
        if (err instanceof APIError) {
          setError(err.message);
        } else {
          setError('Failed to confirm exchange. Please try again.');
        }
        // Allow retry after error
        scanningRef.current = false;
      } finally {
        setConfirming(false);
      }
    },
    [onSuccess, onClose],
  );

  const handleRetry = useCallback(() => {
    setError(null);
    scanningRef.current = false;
  }, []);

  // Permission not yet determined
  if (visible && !permission) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      </Modal>
    );
  }

  // Permission denied
  if (visible && permission && !permission.granted) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Scan QR Code
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.centered}>
            <Ionicons
              name="camera-outline"
              size={48}
              color={colors.textSecondary}
            />
            <Text
              style={[
                styles.permissionText,
                { color: colors.textSecondary },
              ]}
            >
              Camera access is required to scan exchange QR codes.
            </Text>
            <Pressable
              onPress={requestPermission}
              style={[
                styles.permissionButton,
                { backgroundColor: colors.primary },
              ]}
              accessibilityLabel="Grant camera permission"
              accessibilityRole="button"
            >
              <Text style={styles.permissionButtonText}>
                Grant Camera Access
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.scannerContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={
            scanningRef.current ? undefined : handleBarCodeScanned
          }
        />

        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeButton}
              accessibilityLabel="Close scanner"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.overlayTitle}>Scan Exchange QR Code</Text>
            <View style={styles.closePlaceholder} />
          </View>

          {/* Scanning frame */}
          <View style={styles.frameContainer}>
            <View style={styles.frame}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
          </View>

          {/* Bottom status area */}
          <View style={styles.bottomBar}>
            {confirming && (
              <View style={styles.statusRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.overlayText}>Confirming exchange...</Text>
              </View>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.overlayErrorText}>{error}</Text>
                <Pressable
                  onPress={handleRetry}
                  style={styles.retryOverlayButton}
                  accessibilityLabel="Retry scanning"
                  accessibilityRole="button"
                >
                  <Text style={styles.retryOverlayButtonText}>
                    Scan Again
                  </Text>
                </Pressable>
              </View>
            )}

            {!confirming && !error && (
              <Text style={styles.overlayText}>
                Point your camera at the seller's QR code
              </Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const FRAME_SIZE = 250;
const CORNER_SIZE = 30;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing.lg,
  },
  title: {
    ...Typography.title3,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['3xl'],
    gap: Spacing.lg,
  },
  permissionText: {
    ...Typography.body,
    textAlign: 'center',
  },
  permissionButton: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  permissionButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing['5xl'],
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePlaceholder: {
    width: 40,
  },
  overlayTitle: {
    ...Typography.headline,
    color: '#FFFFFF',
  },
  frameContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: '#FFFFFF',
    borderTopLeftRadius: BorderRadius.sm,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: '#FFFFFF',
    borderTopRightRadius: BorderRadius.sm,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: '#FFFFFF',
    borderBottomLeftRadius: BorderRadius.sm,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: '#FFFFFF',
    borderBottomRightRadius: BorderRadius.sm,
  },
  bottomBar: {
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing['5xl'],
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  overlayText: {
    ...Typography.subhead,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  overlayErrorText: {
    ...Typography.subhead,
    color: '#FF6B6B',
    textAlign: 'center',
  },
  retryOverlayButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  retryOverlayButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },
});
