import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '@/hooks/useColorScheme';

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  iconFocused: TabIconName;
  iconDefault: TabIconName;
}

const TAB_CONFIG: TabConfig[] = [
  {
    name: 'index',
    title: 'Browse',
    iconFocused: 'compass',
    iconDefault: 'compass-outline',
  },
  {
    name: 'search',
    title: 'Search',
    iconFocused: 'search',
    iconDefault: 'search-outline',
  },
  {
    name: 'create',
    title: 'Sell',
    iconFocused: 'add-circle',
    iconDefault: 'add-circle-outline',
  },
  {
    name: 'messages',
    title: 'Messages',
    iconFocused: 'chatbubbles',
    iconDefault: 'chatbubbles-outline',
  },
  {
    name: 'profile',
    title: 'Profile',
    iconFocused: 'person',
    iconDefault: 'person-outline',
  },
];

/**
 * Tab navigator layout.
 *
 * Platform differences:
 * - iOS: Standard tab bar with labels, subtle border
 * - Android: Material-style bottom navigation with ripple effect
 *
 * The "Sell" (create) tab is visually emphasized with the primary color
 * to encourage listing creation.
 */
export default function TabLayout() {
  const colors = useThemeColors();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 0.5,
          paddingBottom: Platform.select({ ios: 0, android: 8 }),
          paddingTop: 4,
          height: Platform.select({ ios: 88, android: 64 }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
        },
      }}
    >
      {TAB_CONFIG.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.iconFocused : tab.iconDefault}
                size={tab.name === 'create' ? size + 4 : size}
                color={tab.name === 'create' && focused ? colors.primary : color}
              />
            ),
            // Large title style on iOS for main tabs
            ...(Platform.OS === 'ios' &&
              (tab.name === 'index' || tab.name === 'messages' || tab.name === 'profile')
              ? {
                  headerLargeTitle: true,
                  headerLargeStyle: { backgroundColor: colors.background },
                }
              : {}),
          }}
        />
      ))}
    </Tabs>
  );
}
