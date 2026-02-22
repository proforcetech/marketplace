import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '@/hooks/useColorScheme';
import { Spacing, BorderRadius, Typography } from '@/constants/theme';
import { api, APIError } from '@/services/api';

interface ExchangeQRModalProps {
  conversationId: string;
  visible: boolean;
  onClose: () => void;
}

interface TokenState {
  token: string;
  expiresAt: Date;
}

/**
 * Displays a QR code containing a signed JWT exchange token.
 * The seller shows this QR code to the buyer during an in-person exchange.
 * The token expires after 15 minutes and can be regenerated.
 */
export function ExchangeQRModal({
  conversationId,
  visible,
  onClose,
}: ExchangeQRModalProps): React.JSX.Element {
  const colors = useThemeColors();
  const [tokenState, setTokenState] = useState<TokenState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdown = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(
    (expiresAt: Date) => {
      clearCountdown();

      const updateRemaining = (): void => {
        const now = Date.now();
        const remaining = Math.max(
          0,
          Math.floor((expiresAt.getTime() - now) / 1000),
        );
        setRemainingSeconds(remaining);

        if (remaining <= 0) {
          clearCountdown();
        }
      };

      updateRemaining();
      intervalRef.current = setInterval(updateRemaining, 1000);
    },
    [clearCountdown],
  );

  const generateToken = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.exchange.generateQR(conversationId);
      const expiresAt = new Date(response.data.expiresAt);
      setTokenState({ token: response.data.token, expiresAt });
      startCountdown(expiresAt);
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('Failed to generate exchange token. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [conversationId, startCountdown]);

  // Generate token when modal becomes visible
  useEffect(() => {
    if (visible) {
      generateToken();
    } else {
      clearCountdown();
      setTokenState(null);
      setError(null);
      setRemainingSeconds(0);
    }

    return clearCountdown;
  }, [visible, generateToken, clearCountdown]);

  const isExpired = remainingSeconds <= 0 && tokenState !== null;

  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

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
            Exchange QR Code
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

        <View style={styles.content}>
          {loading && (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text
                style={[styles.statusText, { color: colors.textSecondary }]}
              >
                Generating exchange token...
              </Text>
            </View>
          )}

          {error && !loading && (
            <View style={styles.centered}>
              <Ionicons
                name="alert-circle-outline"
                size={48}
                color={colors.error}
              />
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error}
              </Text>
              <Pressable
                onPress={generateToken}
                style={[
                  styles.retryButton,
                  { backgroundColor: colors.primary },
                ]}
                accessibilityLabel="Retry generating token"
                accessibilityRole="button"
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </Pressable>
            </View>
          )}

          {tokenState && !loading && !error && (
            <View style={styles.qrSection}>
              <View
                style={[
                  styles.qrWrapper,
                  {
                    backgroundColor: '#FFFFFF',
                    borderColor: colors.border,
                    opacity: isExpired ? 0.3 : 1,
                  },
                ]}
              >
                <QRCode
                  value={tokenState.token}
                  size={220}
                  backgroundColor="#FFFFFF"
                  color="#000000"
                />
              </View>

              {!isExpired && (
                <View style={styles.timerSection}>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={
                      remainingSeconds <= 60
                        ? colors.warning
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.timerText,
                      {
                        color:
                          remainingSeconds <= 60
                            ? colors.warning
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    Expires in {formatTime(remainingSeconds)}
                  </Text>
                </View>
              )}

              {isExpired && (
                <View style={styles.expiredSection}>
                  <Text style={[styles.expiredText, { color: colors.error }]}>
                    Token expired
                  </Text>
                  <Pressable
                    onPress={generateToken}
                    style={[
                      styles.regenerateButton,
                      { backgroundColor: colors.primary },
                    ]}
                    accessibilityLabel="Regenerate exchange token"
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name="refresh"
                      size={18}
                      color="#FFFFFF"
                      style={styles.regenerateIcon}
                    />
                    <Text style={styles.regenerateButtonText}>Regenerate</Text>
                  </Pressable>
                </View>
              )}

              <Text
                style={[
                  styles.instructions,
                  { color: colors.textSecondary },
                ]}
              >
                Show this QR code to the buyer. They will scan it to confirm the
                exchange.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  centered: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  statusText: {
    ...Typography.body,
    marginTop: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  retryButton: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  retryButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },
  qrSection: {
    alignItems: 'center',
    gap: Spacing.xl,
  },
  qrWrapper: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  timerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timerText: {
    ...Typography.headline,
  },
  expiredSection: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  expiredText: {
    ...Typography.headline,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  regenerateIcon: {
    marginRight: Spacing.sm,
  },
  regenerateButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },
  instructions: {
    ...Typography.subhead,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
});
