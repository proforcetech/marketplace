import { useCallback } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeColors } from '@/hooks/useColorScheme';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';

/**
 * Profile screen.
 *
 * Displays the current user's profile information, stats,
 * active listings, and quick links to settings.
 */

interface MenuItem {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  route: string;
  badge?: number;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: 'list-outline', label: 'My Listings', route: '/settings' },
  { icon: 'heart-outline', label: 'Saved Items', route: '/settings' },
  { icon: 'bookmark-outline', label: 'Saved Searches', route: '/settings/saved-searches' },
  { icon: 'receipt-outline', label: 'Transaction History', route: '/transactions' },
  { icon: 'star-outline', label: 'Ratings & Reviews', route: '/settings' },
  { icon: 'megaphone-outline', label: 'Promotions', route: '/settings' },
];

const SETTINGS_ITEMS: MenuItem[] = [
  { icon: 'person-outline', label: 'Account Settings', route: '/settings/account' },
  { icon: 'notifications-outline', label: 'Notification Preferences', route: '/settings/notifications' },
  { icon: 'lock-closed-outline', label: 'Privacy & Safety', route: '/settings/privacy' },
  { icon: 'help-circle-outline', label: 'Help & Support', route: '/settings' },
  { icon: 'document-text-outline', label: 'Terms & Policies', route: '/settings' },
];

export default function ProfileScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const { data: profile } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => api.users.getMyProfile(),
  });

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            clearAuth();
            router.replace('/(auth)/login' as any);
          },
        },
      ]
    );
  }, [clearAuth, router]);

  const renderMenuItem = useCallback(
    (item: MenuItem) => (
      <Pressable
        key={item.label}
        style={[styles.menuItem, { borderBottomColor: colors.border }]}
        onPress={() => router.push(item.route as any)}
        accessibilityRole="button"
      >
        <Ionicons name={item.icon} size={22} color={colors.textSecondary} />
        <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
        {item.badge && item.badge > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </Pressable>
    ),
    [colors, router]
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarSection}>
          {user?.avatarUrl ? (
            <Image
              source={{ uri: user.avatarUrl }}
              style={styles.avatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarInitial}>
                {user?.displayName?.charAt(0).toUpperCase() ?? '?'}
              </Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={[styles.displayName, { color: colors.text }]}>
              {user?.displayName ?? 'User'}
            </Text>
            {user?.isVerified && (
              <View style={styles.verifiedRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[styles.verifiedText, { color: colors.success }]}>
                  Verified
                </Text>
              </View>
            )}
            <Text style={[styles.memberSince, { color: colors.textTertiary }]}>
              {user?.locationCity ? `${user.locationCity}, ${user.locationState}` : ''}
              {user?.joinedAt
                ? ` - Joined ${new Date(user.joinedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
                : ''}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {profile?.listingCount ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Listings
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {profile?.rating ? profile.rating.toFixed(1) : '--'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Rating
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {profile?.responseRate ? `${profile.responseRate}%` : '--'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Response
            </Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View style={[styles.menuSection, { backgroundColor: colors.cardBackground }]}>
        {MENU_ITEMS.map(renderMenuItem)}
      </View>

      {/* Settings */}
      <View style={[styles.menuSection, { backgroundColor: colors.cardBackground }]}>
        {SETTINGS_ITEMS.map(renderMenuItem)}
      </View>

      {/* Logout */}
      <Pressable
        style={[styles.logoutButton, { borderColor: colors.error }]}
        onPress={handleLogout}
        accessibilityRole="button"
      >
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={[styles.logoutText, { color: colors.error }]}>Log Out</Text>
      </Pressable>

      {/* Version */}
      <Text style={[styles.versionText, { color: colors.textTertiary }]}>
        Marketplace v1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing['5xl'],
  },
  profileHeader: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  displayName: {
    ...Typography.title2,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  memberSince: {
    ...Typography.footnote,
  },
  statsRow: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    ...Typography.title3,
  },
  statLabel: {
    ...Typography.caption1,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: Spacing.xs,
  },
  menuSection: {
    marginTop: Spacing.lg,
    ...Platform.select({
      ios: {
        marginHorizontal: Spacing.lg,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
      },
      android: {},
    }),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  menuLabel: {
    ...Typography.body,
    flex: 1,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    ...Typography.caption2,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing['2xl'],
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  logoutText: {
    ...Typography.headline,
  },
  versionText: {
    ...Typography.caption1,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
