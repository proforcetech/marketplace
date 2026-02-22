import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDistanceToNow } from 'date-fns';
import type { Socket } from 'socket.io-client';

import { api } from '@/services/api';
import { getSocket, isSocketConnected } from '@/services/socket';
import { useThemeColors } from '@/hooks/useColorScheme';
import { useAuthStore } from '@/stores/auth-store';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';
import { Config } from '@/constants/config';

/**
 * Real-time chat thread screen.
 *
 * Uses Socket.IO for live messaging and TanStack Query for message
 * history with cursor-based pagination. Messages are displayed in
 * an inverted FlatList (newest at bottom).
 */

// --- Types ---

interface OtherUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

interface ListingInfo {
  id: string;
  title: string;
  imageUrl?: string;
  price?: number;
}

interface ConversationDetail {
  id: string;
  otherUser: OtherUser;
  listing: ListingInfo;
  safetyWarning?: boolean;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  conversationId: string;
  sentAt: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

interface MessagesPage {
  items: Message[];
  nextCursor: string | null;
}

// --- Component ---

export default function ChatThreadScreen(): React.JSX.Element {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState('');
  const [isConnected, setIsConnected] = useState(isSocketConnected());
  const [dismissedSafetyWarning, setDismissedSafetyWarning] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList<Message>>(null);
  const lastTypingEmitRef = useRef<number>(0);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Data fetching ---

  const { data: conversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      const result = await api.messages.getConversations();
      // Find this conversation from the list, or fetch individual
      const found = result.items.find(
        (c: Record<string, unknown>) => c.id === conversationId
      );
      if (found) {
        return {
          id: found.id,
          otherUser: found.otherUser,
          listing: {
            id: found.listingId,
            title: found.listingTitle,
            imageUrl: found.listingImageUrl,
          },
          safetyWarning: found.safetyWarning,
        } as ConversationDetail;
      }
      return null;
    },
    enabled: !!conversationId,
  });

  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingMessages,
  } = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam }): Promise<MessagesPage> => {
      return api.messages.getThread(conversationId!, pageParam);
    },
    getNextPageParam: (lastPage: MessagesPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!conversationId,
  });

  const messages = useMemo(
    () => (messagesData?.pages.flatMap((page) => page.items) ?? []) as Message[],
    [messagesData]
  );

  // --- Socket.IO setup ---

  useEffect(() => {
    if (!conversationId) return;

    let mounted = true;

    const initSocket = async (): Promise<void> => {
      try {
        const socket = await getSocket();
        if (!mounted) return;

        socketRef.current = socket;
        setIsConnected(socket.connected);

        // Join this conversation room
        socket.emit('joinConversation', { conversationId });

        // Mark messages as read on mount
        socket.emit('markRead', { conversationId });

        // Listen for new incoming messages
        socket.on('newMessage', (message: Message) => {
          queryClient.setQueryData<{
            pages: MessagesPage[];
            pageParams: (string | undefined)[];
          }>(['messages', conversationId], (old) => {
            if (!old) return old;
            const updatedPages = [...old.pages];
            // Prepend to the first page (newest messages)
            updatedPages[0] = {
              ...updatedPages[0],
              items: [message, ...updatedPages[0].items],
            };
            return { ...old, pages: updatedPages };
          });

          // Mark as read immediately since we are in the conversation
          socket.emit('markRead', { conversationId });
        });

        // Typing indicator
        socket.on('typing', (data: { userId: string; displayName: string }) => {
          if (data.userId !== currentUser?.id) {
            setIsTyping(true);
            setTypingUserName(data.displayName);

            // Auto-clear after 3 seconds
            if (typingTimerRef.current) {
              clearTimeout(typingTimerRef.current);
            }
            typingTimerRef.current = setTimeout(() => {
              setIsTyping(false);
            }, 3000);
          }
        });

        // Connection state tracking
        socket.on('connect', () => {
          if (mounted) {
            setIsConnected(true);
            socket.emit('joinConversation', { conversationId });
            socket.emit('markRead', { conversationId });
          }
        });

        socket.on('disconnect', () => {
          if (mounted) setIsConnected(false);
        });

        // Message status updates
        socket.on(
          'messageStatus',
          (data: { messageId: string; status: Message['status'] }) => {
            queryClient.setQueryData<{
              pages: MessagesPage[];
              pageParams: (string | undefined)[];
            }>(['messages', conversationId], (old) => {
              if (!old) return old;
              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  items: page.items.map((msg) =>
                    msg.id === data.messageId
                      ? { ...msg, status: data.status }
                      : msg
                  ),
                })),
              };
            });
          }
        );
      } catch (error) {
        console.error('Failed to initialize socket:', error);
      }
    };

    initSocket();

    return () => {
      mounted = false;
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      if (socketRef.current) {
        socketRef.current.emit('leaveConversation', { conversationId });
        socketRef.current.off('newMessage');
        socketRef.current.off('typing');
        socketRef.current.off('connect');
        socketRef.current.off('disconnect');
        socketRef.current.off('messageStatus');
      }
    };
  }, [conversationId, currentUser?.id, queryClient]);

  // Mark as read when the app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && socketRef.current?.connected) {
        socketRef.current.emit('markRead', { conversationId });
      }
    });

    return () => subscription.remove();
  }, [conversationId]);

  // --- Typing indicator emit (debounced) ---

  const emitTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingEmitRef.current < Config.typingIndicatorThrottleMs) {
      return;
    }
    lastTypingEmitRef.current = now;
    socketRef.current?.emit('typing', { conversationId });
  }, [conversationId]);

  const handleTextChange = useCallback(
    (text: string) => {
      setInputText(text);
      if (text.length > 0) {
        emitTyping();
      }
    },
    [emitTyping]
  );

  // --- Send message ---

  const handleSend = useCallback(() => {
    const content = inputText.trim();
    if (!content || !conversationId || !currentUser) return;

    // Optimistically add message to local state
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content,
      senderId: currentUser.id,
      conversationId,
      sentAt: new Date().toISOString(),
      status: 'sending',
    };

    queryClient.setQueryData<{
      pages: MessagesPage[];
      pageParams: (string | undefined)[];
    }>(['messages', conversationId], (old) => {
      if (!old) {
        return {
          pages: [{ items: [optimisticMessage], nextCursor: null }],
          pageParams: [undefined],
        };
      }
      const updatedPages = [...old.pages];
      updatedPages[0] = {
        ...updatedPages[0],
        items: [optimisticMessage, ...updatedPages[0].items],
      };
      return { ...old, pages: updatedPages };
    });

    // Send via socket
    socketRef.current?.emit('sendMessage', { conversationId, content });

    // Clear input
    setInputText('');
  }, [inputText, conversationId, currentUser, queryClient]);

  // --- Load more (scroll to top of inverted list = older messages) ---

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // --- Render helpers ---

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isMyMessage = item.senderId === currentUser?.id;
      const timeStr = formatDistanceToNow(new Date(item.sentAt), {
        addSuffix: true,
      });

      const statusLabel =
        item.status === 'read'
          ? 'Read'
          : item.status === 'delivered'
            ? 'Delivered'
            : item.status === 'sending'
              ? 'Sending...'
              : '';

      return (
        <View
          style={[
            styles.messageRow,
            isMyMessage ? styles.messageRowRight : styles.messageRowLeft,
          ]}
          accessibilityRole="text"
          accessibilityLabel={`${isMyMessage ? 'You' : conversation?.otherUser.displayName ?? 'Them'} said: ${item.content}. ${timeStr}`}
        >
          {/* Avatar for other user's messages */}
          {!isMyMessage && (
            <View style={styles.messageAvatarContainer}>
              {conversation?.otherUser.avatarUrl ? (
                <Image
                  source={{ uri: conversation.otherUser.avatarUrl }}
                  style={styles.messageAvatar}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={[
                    styles.messageAvatarPlaceholder,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.messageAvatarInitial}>
                    {conversation?.otherUser.displayName?.charAt(0).toUpperCase() ?? '?'}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View
            style={[
              styles.messageBubble,
              isMyMessage
                ? [styles.myBubble, { backgroundColor: colors.primary }]
                : [styles.theirBubble, { backgroundColor: colors.surface }],
            ]}
          >
            <Text
              style={[
                styles.messageText,
                { color: isMyMessage ? '#FFFFFF' : colors.text },
              ]}
            >
              {item.content}
            </Text>
          </View>

          {/* Timestamp and status */}
          <View
            style={[
              styles.messageMetaRow,
              isMyMessage ? styles.metaRight : styles.metaLeft,
            ]}
          >
            <Text style={[styles.messageTime, { color: colors.textTertiary }]}>
              {timeStr}
            </Text>
            {isMyMessage && statusLabel.length > 0 && (
              <Text
                style={[styles.messageStatus, { color: colors.textTertiary }]}
              >
                {' '}
                {statusLabel}
              </Text>
            )}
          </View>
        </View>
      );
    },
    [currentUser?.id, conversation, colors]
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  // --- Header ---

  const headerTitle = useCallback(
    () => (
      <View style={styles.headerTitleContainer}>
        <Text
          style={[styles.headerName, { color: colors.text }]}
          numberOfLines={1}
        >
          {conversation?.otherUser.displayName ?? 'Chat'}
        </Text>
        {conversation?.listing.title && (
          <Text
            style={[styles.headerListingTitle, { color: colors.textTertiary }]}
            numberOfLines={1}
          >
            {conversation.listing.title}
          </Text>
        )}
      </View>
    ),
    [conversation, colors]
  );

  // --- Loading state ---

  if (isLoadingMessages) {
    return (
      <>
        <Stack.Screen
          options={{
            headerTitle: () => headerTitle(),
          }}
        />
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  // --- Main render ---

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => headerTitle(),
        }}
      />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={Platform.select({ ios: 90, android: 0 })}
      >
        {/* Reconnecting banner */}
        {!isConnected && (
          <View
            style={[styles.reconnectBanner, { backgroundColor: colors.warning }]}
            accessibilityRole="alert"
            accessibilityLabel="Reconnecting to chat server"
          >
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.reconnectText}>Reconnecting...</Text>
          </View>
        )}

        {/* Safety warning */}
        {conversation?.safetyWarning && !dismissedSafetyWarning && (
          <View
            style={styles.safetyBanner}
            accessibilityRole="alert"
            accessibilityLabel="Safety warning: keep all transactions within the app"
          >
            <Text style={styles.safetyText}>
              For your safety, keep all transactions within the app.
            </Text>
            <Pressable
              onPress={() => setDismissedSafetyWarning(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Dismiss safety warning"
            >
              <Ionicons name="close-circle" size={20} color="#92400E" />
            </Pressable>
          </View>
        )}

        {/* Messages list */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          inverted
          contentContainerStyle={styles.messagesList}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={48}
                color={colors.textTertiary}
              />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Start the conversation
              </Text>
            </View>
          }
        />

        {/* Typing indicator */}
        {isTyping && (
          <View style={styles.typingContainer}>
            <Text style={[styles.typingText, { color: colors.textTertiary }]}>
              {typingUserName || 'User'} is typing...
            </Text>
          </View>
        )}

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, Spacing.sm),
            },
          ]}
        >
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={inputText}
            onChangeText={handleTextChange}
            placeholder="Message..."
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={2000}
            textAlignVertical="center"
            accessibilityLabel="Message input"
            accessibilityHint="Type a message to send"
          />
          <Pressable
            onPress={handleSend}
            disabled={inputText.trim().length === 0}
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  inputText.trim().length > 0 ? colors.primary : colors.surface,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: inputText.trim().length === 0 }}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim().length > 0 ? '#FFFFFF' : colors.textTertiary}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

// --- Styles ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerName: {
    ...Typography.headline,
  },
  headerListingTitle: {
    ...Typography.caption1,
    marginTop: 1,
  },

  // Reconnecting banner
  reconnectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  reconnectText: {
    ...Typography.footnote,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Safety banner
  safetyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  safetyText: {
    ...Typography.footnote,
    color: '#92400E',
    flex: 1,
    marginRight: Spacing.sm,
  },

  // Messages list
  messagesList: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  messageRow: {
    marginVertical: Spacing.xs,
    maxWidth: '80%',
  },
  messageRowRight: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  messageRowLeft: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },

  // Avatars
  messageAvatarContainer: {
    marginBottom: Spacing.xs,
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  messageAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarInitial: {
    ...Typography.caption2,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Bubbles
  messageBubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  myBubble: {
    borderBottomRightRadius: BorderRadius.sm,
  },
  theirBubble: {
    borderBottomLeftRadius: BorderRadius.sm,
  },
  messageText: {
    ...Typography.body,
  },

  // Meta (time + status)
  messageMetaRow: {
    flexDirection: 'row',
    marginTop: 2,
    paddingHorizontal: Spacing.xs,
  },
  metaRight: {
    justifyContent: 'flex-end',
  },
  metaLeft: {
    justifyContent: 'flex-start',
  },
  messageTime: {
    ...Typography.caption2,
  },
  messageStatus: {
    ...Typography.caption2,
  },

  // Typing indicator
  typingContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  typingText: {
    ...Typography.caption1,
    fontStyle: 'italic',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    ...Typography.body,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.select({ ios: 1, android: 0 }),
  },

  // Loading / empty
  loadingMore: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
    gap: Spacing.md,
    // Inverted list flips this, so it appears right side up at center
    transform: [{ scaleY: -1 }],
  },
  emptyText: {
    ...Typography.body,
    textAlign: 'center',
  },
});
