import { Stack } from 'expo-router';

import { useThemeColors } from '@/hooks/useColorScheme';

/**
 * Create listing flow stack.
 *
 * Multi-step wizard: Media -> Details -> Preview.
 * Back gesture is enabled so users can navigate between steps.
 */
export default function CreateFlowLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
        },
        headerBackTitleVisible: false,
        gestureEnabled: true,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="media"
        options={{ title: 'Add Photos' }}
      />
      <Stack.Screen
        name="details"
        options={{ title: 'Listing Details' }}
      />
      <Stack.Screen
        name="preview"
        options={{ title: 'Review & Post' }}
      />
    </Stack>
  );
}
