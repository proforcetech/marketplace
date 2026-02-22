import { Stack } from 'expo-router';

import { useThemeColors } from '@/hooks/useColorScheme';

/**
 * Auth stack layout.
 *
 * Contains login and signup screens with no header.
 * Background matches the app theme for seamless transitions.
 */
export default function AuthLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
    </Stack>
  );
}
