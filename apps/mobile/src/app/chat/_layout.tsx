import { Stack } from 'expo-router';
import { useThemeColors } from '@/hooks/useColorScheme';

/**
 * Layout for the /chat route group.
 * Provides a native stack navigator with themed header.
 */
export default function ChatLayout(): React.JSX.Element {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
      }}
    />
  );
}
