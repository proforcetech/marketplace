import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { api, APIError } from '@/services/api';
import { useThemeColors } from '@/hooks/useColorScheme';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────

interface PurchaseModalProps {
  visible: boolean;
  listingId: string;
  listingTitle: string;
  /** Price in dollars (as displayed on the listing detail screen). */
  price: number;
  priceType: string;
  onSuccess: () => void;
  onDismiss: () => void;
}

type Step = 'confirm' | 'loading' | 'success' | 'error';

// ─── Helpers ──────────────────────────────────────────────────

function formatCurrency(dollars: number): string {
  return dollars.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

// ─── Component ────────────────────────────────────────────────

/**
 * Bottom-sheet style modal that drives the in-app purchase flow.
 *
 * Flow:
 *  1. Confirm step — show order summary and "Pay Now" button.
 *  2. Loading — fetch PaymentIntent client secret from backend.
 *  3. Stripe sheet — Stripe's native payment UI handles card entry.
 *  4. Success / Error — result screen with action buttons.
 */
export function PurchaseModal({
  visible,
  listingId,
  listingTitle,
  price,
  priceType,
  onSuccess,
  onDismiss,
}: PurchaseModalProps): React.JSX.Element {
  const colors = useThemeColors();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [step, setStep] = useState<Step>('confirm');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset when the modal (re)opens.
  useEffect(() => {
    if (visible) {
      setStep('confirm');
      setErrorMessage(null);
    }
  }, [visible]);

  const handlePay = useCallback(async (): Promise<void> => {
    setStep('loading');

    try {
      // 1. Get PaymentIntent client secret from our backend.
      const res = await api.payments.initiatePurchase(listingId);
      const { clientSecret } = res.data;

      // 2. Initialise Stripe's payment sheet.
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Marketplace',
        paymentIntentClientSecret: clientSecret,
        returnURL: 'marketplace://payment-return',
        allowsDelayedPaymentMethods: false,
        defaultBillingDetails: {},
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // 3. Present the native Stripe payment sheet.
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          // User tapped the back button — return to confirm.
          setStep('confirm');
          return;
        }
        throw new Error(presentError.message);
      }

      // 4. Payment succeeded.
      if (Platform.OS === 'ios') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setStep('success');
    } catch (err) {
      const message =
        err instanceof APIError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Payment failed. Please try again.';
      setErrorMessage(message);
      setStep('error');
    }
  }, [listingId, initPaymentSheet, presentPaymentSheet]);

  const platformFeeAmount = price * 0.1;
  const isFree = priceType === 'free' || price === 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={step === 'loading' ? undefined : onDismiss}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable
        style={styles.backdrop}
        onPress={step === 'loading' ? undefined : onDismiss}
      />

      {/* Sheet */}
      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* ── Confirm step ── */}
        {(step === 'confirm' || step === 'loading') && (
          <>
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Confirm purchase</Text>
              <Pressable
                onPress={onDismiss}
                disabled={step === 'loading'}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Order summary card */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.cardRow}>
                <Text style={[styles.cardLabel, { color: colors.textSecondary }]} numberOfLines={2}>
                  {listingTitle}
                </Text>
                <Text style={[styles.cardValue, { color: colors.text }]}>
                  {isFree ? 'Free' : formatCurrency(price)}
                </Text>
              </View>

              {!isFree && (
                <>
                  <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.cardRow}>
                    <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
                      Platform fee (10%)
                    </Text>
                    <Text style={[styles.cardValue, { color: colors.textSecondary }]}>
                      {formatCurrency(platformFeeAmount)}
                    </Text>
                  </View>
                  <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.cardRow}>
                    <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
                    <Text style={[styles.totalValue, { color: colors.primary }]}>
                      {formatCurrency(price + platformFeeAmount)}
                    </Text>
                  </View>
                </>
              )}
            </View>

            <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>
              Payment is processed securely by Stripe. The seller will be notified immediately.
            </Text>

            <Pressable
              style={[
                styles.payButton,
                { backgroundColor: '#16a34a', opacity: step === 'loading' ? 0.7 : 1 },
              ]}
              onPress={() => void handlePay()}
              disabled={step === 'loading'}
              accessibilityRole="button"
              accessibilityLabel={`Pay ${isFree ? 'free' : formatCurrency(price + platformFeeAmount)}`}
            >
              {step === 'loading' ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.payButtonText}>Processing…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="card-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.payButtonText}>
                    {isFree ? 'Claim for free' : `Pay ${formatCurrency(price + platformFeeAmount)}`}
                  </Text>
                </>
              )}
            </Pressable>

            {/* Stripe trust badge */}
            <View style={styles.stripeBadge}>
              <Ionicons name="lock-closed-outline" size={13} color={colors.textTertiary} />
              <Text style={[styles.stripeBadgeText, { color: colors.textTertiary }]}>
                Secured by Stripe
              </Text>
            </View>
          </>
        )}

        {/* ── Success step ── */}
        {step === 'success' && (
          <View style={styles.resultContainer}>
            <View style={[styles.resultIcon, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="checkmark-circle" size={48} color="#16a34a" />
            </View>
            <Text style={[styles.resultTitle, { color: colors.text }]}>Purchase complete!</Text>
            <Text style={[styles.resultMessage, { color: colors.textSecondary }]}>
              Your payment was successful. The seller has been notified and will reach out to
              arrange pickup or delivery.
            </Text>
            <Pressable
              style={[styles.doneButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                onSuccess();
                onDismiss();
              }}
              accessibilityRole="button"
              accessibilityLabel="Done"
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          </View>
        )}

        {/* ── Error step ── */}
        {step === 'error' && (
          <View style={styles.resultContainer}>
            <View style={[styles.resultIcon, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="alert-circle" size={48} color="#dc2626" />
            </View>
            <Text style={[styles.resultTitle, { color: colors.text }]}>Payment failed</Text>
            <Text style={[styles.resultMessage, { color: colors.textSecondary }]}>
              {errorMessage ?? 'Something went wrong. Please try again.'}
            </Text>
            <View style={styles.errorActions}>
              <Pressable
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                onPress={() => setStep('confirm')}
                accessibilityRole="button"
                accessibilityLabel="Try again"
              >
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
              <Pressable
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={onDismiss}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    ...Typography.title3,
  },
  closeButton: {
    padding: Spacing.xs,
  },

  // Order summary card
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  cardLabel: {
    ...Typography.subhead,
    flex: 1,
  },
  cardValue: {
    ...Typography.subhead,
    fontWeight: '600',
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
  },
  totalLabel: {
    ...Typography.headline,
  },
  totalValue: {
    ...Typography.headline,
  },

  disclaimer: {
    ...Typography.footnote,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },

  // Pay button
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    minHeight: 52,
    marginBottom: Spacing.md,
  },
  payButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },

  // Stripe badge
  stripeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  stripeBadgeText: {
    ...Typography.caption2,
  },

  // Result (success / error)
  resultContainer: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  resultIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  resultTitle: {
    ...Typography.title3,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  resultMessage: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing['2xl'],
  },

  // Success done button
  doneButton: {
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 160,
  },
  doneButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },

  // Error action buttons
  errorActions: {
    width: '100%',
    gap: Spacing.md,
  },
  retryButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 48,
  },
  retryButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 48,
  },
  cancelButtonText: {
    ...Typography.headline,
  },
});
