import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

import { api } from '@/services/api';
import { useThemeColors } from '@/hooks/useColorScheme';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';

/**
 * Messages / Conversations list screen.
 *
 * Displays all active conversations sorted by most recent message.
 * Each row shows the other party's avatar, name, listing context,
 * last message preview, timestamp, and unread indicator.
 */

interface Conversation {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImageUrl?: string;
  otherUser: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  lastMessage: {
    content: string;
    sentAt: string;
    isFromMe: boolean;
  };
  unreadCount: number;
}

export default function MessagesScreen() {
  const colors = useThemeColors();
  const router = useRouter();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['conversations'],
    queryFn: async ({ pageParam }) => {
      return api.messages.getConversations(pageParam);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });

  const conversations = useMemo(
    () => (data?.pages.flatMap((page) => page.items) ?? []) as Conversation[],
    [data]
  );

  const handleConversationPress = useCallback(
    (conversationId: string) => {
      router.push(`/chat/${conversationId}` as any);
    },
    [router]
  );

  const renderConversation = useCallback(
    ({ item }: { item: Conversation }) => {
      const timeAgo = formatDistanceToNow(new Date(item.lastMessage.sentAt), {
        addSuffix: false,
      });

      return (
        <Pressable
          style={[styles.conversationRow, { borderBottomColor: colors.border }]}
          onPress={() => handleConversationPress(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Conversation with ${item.otherUser.displayName} about ${item.listingTitle}. ${item.unreadCount > 0 ? `${item.unreadCount} unread messages.` : ''} Last message: ${item.lastMessage.content}`}
        >
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {item.otherUser.avatarUrl ? (
              <Image
                source={{ uri: item.otherUser.avatarUrl }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View
                style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.avatarInitial}>
                  {item.otherUser.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {item.unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.unreadCount}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>

          {/* Content */}
          <View style={styles.conversationContent}>
            <View style={styles.conversationHeader}>
              <Text
                style={[
                  styles.userName,
                  {
                    color: colors.text,
                    fontWeight: item.unreadCount > 0 ? '700' : '600',
                  },
                ]}
                numberOfLines={1}
              >
                {item.otherUser.displayName}
              </Text>
              <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
                {timeAgo}
              </Text>
            </View>
            <Text
              style={[styles.listingContext, { color: colors.textTertiary }]}
              numberOfLines={1}
            >
              {item.listingTitle}
            </Text>
            <Text
              style={[
                styles.lastMessage,
                {
                  color: item.unreadCount > 0 ? colors.text : colors.textSecondary,
                  fontWeight: item.unreadCount > 0 ? '500' : '400',
                },
              ]}
              numberOfLines={1}
            >
              {item.lastMessage.isFromMe ? 'You: ' : ''}
              {item.lastMessage.content}
            </Text>
          </View>

          {/* Listing thumbnail */}
          {item.listingImageUrl && (
            <Image
              source={{ uri: item.listingImageUrl }}
              style={styles.listingThumbnail}
              contentFit="cover"
            />
          )}
        </Pressable>
      );
    },
    [colors, handleConversationPress]
  );

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlashList
        data={conversations}
        renderItem={renderConversation}
        estimatedItemSize={88}
        onEndReached={() => {
          if (hasNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name="chatbubbles-outline"
              size={64}
              color={colors.textTertiary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No messages yet
            </Text>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              When you contact a seller or receive a message about your listings,
              your conversations will appear here.
            </Text>
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationRow: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    ...Typography.title3,
    color: '#FFFFFF',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  unreadCount: {
    ...Typography.caption2,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  conversationContent: {
    flex: 1,
    gap: 2,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    ...Typography.headline,
    flex: 1,
    marginRight: Spacing.sm,
  },
  timestamp: {
    ...Typography.caption1,
  },
  listingContext: {
    ...Typography.caption1,
  },
  lastMessage: {
    ...Typography.subhead,
  },
  listingThumbnail: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing['4xl'],
    gap: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.title3,
  },
  emptyMessage: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
});
