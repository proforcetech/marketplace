import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { useAuthStore, storeTokens } from '@/stores/auth-store';
import { api, APIError } from '@/services/api';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';

/**
 * Signup screen.
 *
 * Collects display name, email, password, optional phone and location,
 * and requires terms acceptance before account creation.
 */

interface FormErrors {
  displayName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

function validateDisplayName(name: string): string | undefined {
  if (!name.trim()) return 'Display name is required';
  if (name.trim().length < 2) return 'Name must be at least 2 characters';
  return undefined;
}

function validateEmail(email: string): string | undefined {
  if (!email.trim()) return 'Email is required';
  if (!email.includes('@')) return 'Please enter a valid email address';
  return undefined;
}

function validatePassword(password: string): string | undefined {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return undefined;
}

function validateConfirmPassword(password: string, confirm: string): string | undefined {
  if (!confirm) return 'Please confirm your password';
  if (password !== confirm) return 'Passwords do not match';
  return undefined;
}

export default function SignupScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setUser = useAuthStore((s) => s.setUser);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [locationText, setLocationText] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleBlur = useCallback(
    (field: keyof FormErrors) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      switch (field) {
        case 'displayName':
          setFormErrors((prev) => ({ ...prev, displayName: validateDisplayName(displayName) }));
          break;
        case 'email':
          setFormErrors((prev) => ({ ...prev, email: validateEmail(email) }));
          break;
        case 'password':
          setFormErrors((prev) => ({ ...prev, password: validatePassword(password) }));
          break;
        case 'confirmPassword':
          setFormErrors((prev) => ({
            ...prev,
            confirmPassword: validateConfirmPassword(password, confirmPassword),
          }));
          break;
      }
    },
    [displayName, email, password, confirmPassword]
  );

  const handleCreateAccount = useCallback(async () => {
    const errors: FormErrors = {
      displayName: validateDisplayName(displayName),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(password, confirmPassword),
      terms: termsAccepted ? undefined : 'You must accept the terms to continue',
    };

    setFormErrors(errors);
    setTouched({
      displayName: true,
      email: true,
      password: true,
      confirmPassword: true,
      terms: true,
    });

    const hasErrors = Object.values(errors).some((e) => e !== undefined);
    if (hasErrors) return;

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsSubmitting(true);
    setServerError(null);

    // Parse "City, State" from locationText
    let locationCity: string | undefined;
    let locationState: string | undefined;
    if (locationText.trim()) {
      const parts = locationText.split(',').map((p) => p.trim());
      locationCity = parts[0] || undefined;
      locationState = parts[1] || undefined;
    }

    try {
      const response = await api.auth.register({
        displayName: displayName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      await storeTokens(response.accessToken, response.refreshToken);
      setUser({
        id: response.user.id,
        displayName: response.user.displayName,
        email: response.user.email,
        phone: response.user.phone ?? phone || undefined,
        avatarUrl: response.user.avatarUrl,
        isVerified: response.user.isVerified ?? false,
        joinedAt: response.user.joinedAt ?? response.user.createdAt,
        locationCity: response.user.locationCity ?? locationCity,
        locationState: response.user.locationState ?? locationState,
      });
      router.replace('/(tabs)' as never);
    } catch (err: unknown) {
      if (err instanceof APIError) {
        setServerError(err.message);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [displayName, email, password, confirmPassword, phone, locationText, termsAccepted, setUser, router]);

  const isFormValid =
    displayName.trim().length >= 2 &&
    email.includes('@') &&
    password.length >= 6 &&
    password === confirmPassword &&
    termsAccepted;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.select({ ios: 'padding' as const, android: 'height' as const })}
    >
      <ScrollView
        style={[styles.flex, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing['3xl'], paddingBottom: insets.bottom + Spacing['3xl'] },
        ]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Create Account
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Join your local marketplace
          </Text>
        </View>

        {/* Server Error */}
        {serverError && (
          <View style={[styles.errorBanner, { backgroundColor: colors.error + '15' }]}>
            <Ionicons name="alert-circle" size={20} color={colors.error} />
            <Text style={[styles.errorBannerText, { color: colors.error }]}>
              {serverError}
            </Text>
          </View>
        )}

        {/* Display Name */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Display Name</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: touched.displayName && formErrors.displayName ? colors.error : colors.border,
              },
            ]}
            value={displayName}
            onChangeText={(text) => {
              setDisplayName(text);
              if (touched.displayName) {
                setFormErrors((prev) => ({ ...prev, displayName: validateDisplayName(text) }));
              }
            }}
            onBlur={() => handleBlur('displayName')}
            placeholder="How others will see you"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            editable={!isSubmitting}
            accessibilityRole="text"
            accessibilityLabel="Display name"
          />
          {touched.displayName && formErrors.displayName && (
            <Text style={[styles.fieldError, { color: colors.error }]}>
              {formErrors.displayName}
            </Text>
          )}
        </View>

        {/* Email */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Email</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: touched.email && formErrors.email ? colors.error : colors.border,
              },
            ]}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (touched.email) {
                setFormErrors((prev) => ({ ...prev, email: validateEmail(text) }));
              }
            }}
            onBlur={() => handleBlur('email')}
            placeholder="your@email.com"
            placeholderTextColor={colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            textContentType="emailAddress"
            editable={!isSubmitting}
            accessibilityRole="text"
            accessibilityLabel="Email address"
          />
          {touched.email && formErrors.email && (
            <Text style={[styles.fieldError, { color: colors.error }]}>
              {formErrors.email}
            </Text>
          )}
        </View>

        {/* Password */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: touched.password && formErrors.password ? colors.error : colors.border,
                },
              ]}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (touched.password) {
                  setFormErrors((prev) => ({ ...prev, password: validatePassword(text) }));
                }
              }}
              onBlur={() => handleBlur('password')}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              editable={!isSubmitting}
              accessibilityRole="text"
              accessibilityLabel="Password"
            />
            <Pressable
              style={styles.passwordToggle}
              onPress={() => setShowPassword((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              hitSlop={8}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>
          {touched.password && formErrors.password && (
            <Text style={[styles.fieldError, { color: colors.error }]}>
              {formErrors.password}
            </Text>
          )}
        </View>

        {/* Confirm Password */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Confirm Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[
                styles.input,
                styles.passwordInput,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor:
                    touched.confirmPassword && formErrors.confirmPassword
                      ? colors.error
                      : colors.border,
                },
              ]}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (touched.confirmPassword) {
                  setFormErrors((prev) => ({
                    ...prev,
                    confirmPassword: validateConfirmPassword(password, text),
                  }));
                }
              }}
              onBlur={() => handleBlur('confirmPassword')}
              placeholder="Re-enter your password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              textContentType="newPassword"
              editable={!isSubmitting}
              accessibilityRole="text"
              accessibilityLabel="Confirm password"
            />
            <Pressable
              style={styles.passwordToggle}
              onPress={() => setShowConfirmPassword((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              hitSlop={8}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>
          {touched.confirmPassword && formErrors.confirmPassword && (
            <Text style={[styles.fieldError, { color: colors.error }]}>
              {formErrors.confirmPassword}
            </Text>
          )}
        </View>

        {/* Phone (Optional) */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.text }]}>
            Phone Number{' '}
            <Text style={[styles.optionalLabel, { color: colors.textTertiary }]}>(optional)</Text>
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
            value={phone}
            onChangeText={setPhone}
            placeholder="(555) 123-4567"
            placeholderTextColor={colors.textTertiary}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            editable={!isSubmitting}
            accessibilityRole="text"
            accessibilityLabel="Phone number, optional"
          />
        </View>

        {/* Location (Optional) */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.text }]}>
            Location{' '}
            <Text style={[styles.optionalLabel, { color: colors.textTertiary }]}>(optional)</Text>
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
            value={locationText}
            onChangeText={setLocationText}
            placeholder="e.g. Austin, TX"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
            editable={!isSubmitting}
            accessibilityRole="text"
            accessibilityLabel="Location, city and state, optional"
          />
        </View>

        {/* Terms Checkbox */}
        <Pressable
          style={styles.termsRow}
          onPress={() => {
            setTermsAccepted((prev) => !prev);
            setTouched((prev) => ({ ...prev, terms: true }));
            if (!termsAccepted) {
              setFormErrors((prev) => ({ ...prev, terms: undefined }));
            }
          }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: termsAccepted }}
          accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
          disabled={isSubmitting}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: touched.terms && formErrors.terms ? colors.error : colors.border,
                backgroundColor: termsAccepted ? colors.primary : 'transparent',
              },
            ]}
          >
            {termsAccepted && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </View>
          <Text style={[styles.termsText, { color: colors.textSecondary }]}>
            I agree to the{' '}
            <Text style={{ color: colors.primary }}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={{ color: colors.primary }}>Privacy Policy</Text>
          </Text>
        </Pressable>
        {touched.terms && formErrors.terms && (
          <Text style={[styles.fieldError, styles.termsError, { color: colors.error }]}>
            {formErrors.terms}
          </Text>
        )}

        {/* Create Account Button */}
        <Pressable
          style={[
            styles.createButton,
            {
              backgroundColor: isFormValid && !isSubmitting ? colors.primary : colors.primary + '60',
            },
          ]}
          onPress={handleCreateAccount}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Create account"
          accessibilityState={{ disabled: isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.createButtonText}>Create Account</Text>
          )}
        </Pressable>

        {/* Sign In Link */}
        <View style={styles.signInContainer}>
          <Text style={[styles.signInText, { color: colors.textSecondary }]}>
            Already have an account?{' '}
          </Text>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="link"
            accessibilityLabel="Sign in to existing account"
          >
            <Text style={[styles.signInLink, { color: colors.primary }]}>
              Sign in
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing['2xl'],
  },
  headerContainer: {
    marginBottom: Spacing['3xl'],
  },
  backButton: {
    marginBottom: Spacing.lg,
    alignSelf: 'flex-start',
    padding: Spacing.xs,
  },
  headerTitle: {
    ...Typography.title1,
  },
  headerSubtitle: {
    ...Typography.callout,
    marginTop: Spacing.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  errorBannerText: {
    ...Typography.subhead,
    flex: 1,
  },
  fieldContainer: {
    marginBottom: Spacing.lg,
  },
  label: {
    ...Typography.subhead,
    fontWeight: '500',
    marginBottom: Spacing.sm,
  },
  optionalLabel: {
    fontWeight: '400',
  },
  input: {
    ...Typography.body,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.select({ ios: Spacing.md + 2, android: Spacing.md }),
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: Spacing['4xl'] + Spacing.md,
  },
  passwordToggle: {
    position: 'absolute',
    right: Spacing.md,
    padding: Spacing.xs,
  },
  fieldError: {
    ...Typography.caption1,
    marginTop: Spacing.xs,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  termsText: {
    ...Typography.subhead,
    flex: 1,
  },
  termsError: {
    marginBottom: Spacing.lg,
    marginLeft: Spacing['3xl'] + Spacing.xs,
  },
  createButton: {
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: Spacing.xl,
  },
  createButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing['3xl'],
  },
  signInText: {
    ...Typography.subhead,
  },
  signInLink: {
    ...Typography.subhead,
    fontWeight: '600',
  },
});
