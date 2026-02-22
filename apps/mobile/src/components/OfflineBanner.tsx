import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '@/hooks/useColorScheme';
import { Spacing, Typography } from '@/constants/theme';

/**
 * A persistent banner that slides in from the top when the device
 * is offline. Shows a wifi-off icon and explanatory text.
 */

interface OfflineBannerProps {
  isOffline: boolean;
}

export function OfflineBanner({ isOffline }: OfflineBannerProps): React.JSX.Element | null {
  const colors = useThemeColors();
  const translateY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: isOffline ? 0 : -60,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline, translateY]);

  // Always render so the animation can play out, but keep it offscreen when hidden
  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.warning, transform: [{ translateY }] },
      ]}
      accessibilityRole="alert"
      accessibilityLabel="No internet connection. Showing cached results."
    >
      <View style={styles.content}>
        <Ionicons name="wifi" size={16} color="#FFFFFF" style={styles.icon} />
        <Text style={styles.text}>
          No internet connection — showing cached results
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: Spacing.sm,
  },
  text: {
    ...Typography.footnote,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
