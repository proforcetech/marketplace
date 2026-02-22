import { Platform } from 'react-native';

/**
 * Design tokens for the marketplace app.
 * Follows platform conventions: SF Pro on iOS, Roboto on Android.
 */
export const Colors = {
  light: {
    primary: '#4A90D9',
    primaryDark: '#3A7BC8',
    secondary: '#FF6B6B',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    surfaceElevated: '#FFFFFF',
    text: '#1A1A2E',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    border: '#E5E7EB',
    borderFocused: '#4A90D9',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    sponsored: '#F59E0B',
    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#E5E7EB',
    tabBarActive: '#4A90D9',
    tabBarInactive: '#9CA3AF',
    cardBackground: '#FFFFFF',
    cardShadow: 'rgba(0, 0, 0, 0.08)',
    skeleton: '#E5E7EB',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  dark: {
    primary: '#6BA5E7',
    primaryDark: '#4A90D9',
    secondary: '#FF8A8A',
    background: '#0F0F1A',
    surface: '#1A1A2E',
    surfaceElevated: '#252540',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    border: '#374151',
    borderFocused: '#6BA5E7',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    sponsored: '#FBBF24',
    tabBarBackground: '#1A1A2E',
    tabBarBorder: '#374151',
    tabBarActive: '#6BA5E7',
    tabBarInactive: '#6B7280',
    cardBackground: '#1A1A2E',
    cardShadow: 'rgba(0, 0, 0, 0.3)',
    skeleton: '#374151',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const Typography = {
  largeTitle: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700' as const,
    letterSpacing: Platform.select({ ios: 0.37, android: 0 }),
  },
  title1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as const,
  },
  title2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as const,
  },
  title3: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '600' as const,
  },
  headline: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  callout: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '400' as const,
  },
  subhead: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  caption1: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
  },
  caption2: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '400' as const,
  },
} as const;

export type ColorScheme = 'light' | 'dark';
export type ThemeColors = typeof Colors.light;
