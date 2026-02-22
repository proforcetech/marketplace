import { useColorScheme as useRNColorScheme } from 'react-native';
import { Colors, type ColorScheme, type ThemeColors } from '@/constants/theme';

/**
 * Returns the current color scheme and resolved theme colors.
 * Respects system-level dark/light mode setting.
 */
export function useThemeColors(): ThemeColors {
  const colorScheme = useRNColorScheme();
  return Colors[colorScheme === 'dark' ? 'dark' : 'light'];
}

export function useColorScheme(): ColorScheme {
  const colorScheme = useRNColorScheme();
  return colorScheme === 'dark' ? 'dark' : 'light';
}
