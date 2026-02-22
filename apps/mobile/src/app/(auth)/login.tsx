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
 * Login screen.
 *
 * Provides email/password authentication with form validation,
 * error display, and navigation to signup.
 */

interface FormErrors {
  email?: string;
  password?: string;
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

export default function LoginScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleBlur = useCallback(
    (field: 'email' | 'password') => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      if (field === 'email') {
        setFormErrors((prev) => ({ ...prev, email: validateEmail(email) }));
      } else {
        setFormErrors((prev) => ({ ...prev, password: validatePassword(password) }));
      }
    },
    [email, password]
  );

  const handleSignIn = useCallback(async () => {
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    setFormErrors({ email: emailError, password: passwordError });
    setTouched({ email: true, password: true });

    if (emailError || passwordError) return;

    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsSubmitting(true);
    setServerError(null);

    try {
      const response = await api.auth.login(email.trim().toLowerCase(), password);
      await storeTokens(response.accessToken, response.refreshToken);
      setUser({
        id: response.user.id,
        displayName: response.user.displayName,
        email: response.user.email,
        phone: response.user.phone,
        avatarUrl: response.user.avatarUrl,
        isVerified: response.user.isVerified ?? false,
        joinedAt: response.user.joinedAt ?? response.user.createdAt,
        locationCity: response.user.locationCity,
        locationState: response.user.locationState,
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
  }, [email, password, setUser, router]);

  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const isFormValid =
    email.includes('@') && password.length >= 6;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.select({ ios: 'padding' as const, android: 'height' as const })}
    >
      <ScrollView
        style={[styles.flex, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing['4xl'], paddingBottom: insets.bottom + Spacing['3xl'] },
        ]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Logo Area */}
        <View style={styles.logoContainer}>
          <Ionicons name="storefront" size={64} color={colors.primary} />
          <Text style={[styles.logoTitle, { color: colors.primary }]}>
            Marketplace
          </Text>
          <Text style={[styles.logoSubtitle, { color: colors.textSecondary }]}>
            Buy and sell locally
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

        {/* Email Field */}
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

        {/* Password Field */}
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
              placeholder="Enter your password"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              editable={!isSubmitting}
              accessibilityRole="text"
              accessibilityLabel="Password"
            />
            <Pressable
              style={styles.passwordToggle}
              onPress={toggleShowPassword}
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

        {/* Forgot Password */}
        <Pressable
          style={styles.forgotPassword}
          accessibilityRole="link"
          accessibilityLabel="Forgot password"
        >
          <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
            Forgot password?
          </Text>
        </Pressable>

        {/* Sign In Button */}
        <Pressable
          style={[
            styles.signInButton,
            {
              backgroundColor: isFormValid && !isSubmitting ? colors.primary : colors.primary + '60',
            },
          ]}
          onPress={handleSignIn}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          accessibilityState={{ disabled: isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.signInButtonText}>Sign In</Text>
          )}
        </Pressable>

        {/* Sign Up Link */}
        <View style={styles.signUpContainer}>
          <Text style={[styles.signUpText, { color: colors.textSecondary }]}>
            Don't have an account?{' '}
          </Text>
          <Pressable
            onPress={() => router.push('/(auth)/signup' as never)}
            accessibilityRole="link"
            accessibilityLabel="Sign up for an account"
          >
            <Text style={[styles.signUpLink, { color: colors.primary }]}>
              Sign up
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing['4xl'],
  },
  logoTitle: {
    ...Typography.largeTitle,
    marginTop: Spacing.lg,
  },
  logoSubtitle: {
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: Spacing['2xl'],
  },
  forgotPasswordText: {
    ...Typography.subhead,
    fontWeight: '500',
  },
  signInButton: {
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  signInButtonText: {
    ...Typography.headline,
    color: '#FFFFFF',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing['3xl'],
  },
  signUpText: {
    ...Typography.subhead,
  },
  signUpLink: {
    ...Typography.subhead,
    fontWeight: '600',
  },
});
