'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
} from 'react';
import { cn } from '../lib/cn';
import { MessageBubble, TypingIndicator } from './MessageBubble';
import { Button } from './Button';
import type { Conversation, Message } from '@marketplace/shared';

export interface ChatWindowProps {
  /** Conversation metadata. */
  conversation: Conversation;
  /** Ordered array of messages (oldest first). */
  messages: Message[];
  /** Current authenticated user's ID. */
  currentUserId: string;
  /** Whether the initial messages are still loading. */
  isLoading?: boolean;
  /** Called when the user sends a message. */
  onSendMessage: (content: string) => void;
  /** Called to load older messages (infinite scroll up). */
  onLoadMore?: () => void;
  /** Called when the current user starts/stops typing. */
  onTyping?: (isTyping: boolean) => void;
  /** Display name of the user who is currently typing (null if nobody). */
  typingUser?: string | null;
  /** Whether there are older messages to load. */
  hasMoreMessages?: boolean;
  className?: string;
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function getDateKey(dateStr: string): string {
  return new Date(dateStr).toDateString();
}

function ListingContextCard({
  conversation,
}: {
  conversation: Conversation;
}): JSX.Element | null {
  if (!conversation.listingTitle) return null;

  return (
    <a
      href={`/listings/${conversation.listingId}`}
      className="flex items-center gap-3 px-4 py-2.5 border-b border-neutral-200 bg-neutral-50 hover:bg-neutral-100 transition-colors duration-fast hover:no-underline"
    >
      {conversation.listingThumbnail && (
        <img
          src={conversation.listingThumbnail}
          alt=""
          className="w-10 h-10 rounded-md object-cover shrink-0"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-medium text-neutral-800 truncate">
          {conversation.listingTitle}
        </p>
      </div>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-neutral-400"
        aria-hidden="true"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </a>
  );
}

function SafetyBanner(): JSX.Element {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) return <></>;

  return (
    <div className="mx-4 mt-2 mb-1 p-3 rounded-lg bg-warning-50 border border-warning-200">
      <div className="flex items-start gap-2">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-warning-600 mt-0.5"
          aria-hidden="true"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-caption text-warning-700 font-medium">Stay safe</p>
          <p className="text-caption text-warning-600 mt-0.5">
            Meet in public places. Never share personal financial info.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="shrink-0 p-1 rounded text-warning-400 hover:text-warning-600 transition-colors duration-fast"
          aria-label="Dismiss safety warning"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function MessageSkeleton(): JSX.Element {
  return (
    <div className="space-y-3 p-4" aria-hidden="true">
      {/* Incoming message skeleton */}
      <div className="flex justify-start">
        <div className="w-2/3 max-w-[240px] space-y-1.5">
          <div className="h-10 skeleton rounded-lg rounded-bl-sm" />
          <div className="h-3 w-16 skeleton" />
        </div>
      </div>
      {/* Outgoing message skeleton */}
      <div className="flex justify-end">
        <div className="w-1/2 max-w-[200px] space-y-1.5">
          <div className="h-10 skeleton rounded-lg rounded-br-sm" />
          <div className="h-3 w-16 skeleton ml-auto" />
        </div>
      </div>
      {/* Incoming message skeleton */}
      <div className="flex justify-start">
        <div className="w-3/5 max-w-[220px] space-y-1.5">
          <div className="h-14 skeleton rounded-lg rounded-bl-sm" />
          <div className="h-3 w-16 skeleton" />
        </div>
      </div>
    </div>
  );
}

export function ChatWindow({
  conversation,
  messages,
  currentUserId,
  isLoading = false,
  onSendMessage,
  onLoadMore,
  onTyping,
  typingUser,
  hasMoreMessages = false,
  className,
}: ChatWindowProps): JSX.Element {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const isNearBottomRef = useRef(true);

  // Auto-scroll to bottom on new messages if user is near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Track scroll position
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 100;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    isNearBottomRef.current = distanceFromBottom < threshold;
  }, []);

  // Typing indicator management
  const handleInputChange = (value: string): void => {
    setInputValue(value);

    if (onTyping) {
      onTyping(true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  // Send message
  const handleSend = (e: FormEvent): void => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    onSendMessage(trimmed);
    setInputValue('');

    if (onTyping) {
      onTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }

    // Force scroll to bottom after sending
    isNearBottomRef.current = true;
  };

  // Group messages by date
  const groupedMessages: Array<{ date: string; messages: Message[] }> = [];
  let currentDateKey = '';

  for (const msg of messages) {
    const dateKey = getDateKey(msg.createdAt);
    if (dateKey !== currentDateKey) {
      currentDateKey = dateKey;
      groupedMessages.push({ date: msg.createdAt, messages: [msg] });
    } else {
      const lastGroup = groupedMessages[groupedMessages.length - 1];
      if (lastGroup) {
        lastGroup.messages.push(msg);
      }
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-white border border-neutral-200 rounded-lg overflow-hidden',
        className,
      )}
      role="region"
      aria-label="Chat conversation"
    >
      {/* Top: Listing context card */}
      <ListingContextCard conversation={conversation} />

      {/* Middle: Message area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {/* Load more button */}
        {hasMoreMessages && (
          <div className="flex justify-center py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoadMore}
              isLoading={isLoading}
            >
              Load older messages
            </Button>
          </div>
        )}

        {/* Loading state for initial load */}
        {isLoading && messages.length === 0 && <MessageSkeleton />}

        {/* Empty state */}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-neutral-300 mb-3"
              aria-hidden="true"
            >
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <p className="text-body-sm font-medium text-neutral-600">
              Start the conversation
            </p>
            <p className="text-caption text-neutral-400 mt-1">
              Send a message to get things going
            </p>
          </div>
        )}

        {/* Safety banner */}
        {messages.length === 0 && !isLoading && <SafetyBanner />}

        {/* Messages grouped by date */}
        {groupedMessages.length > 0 && (
          <div className="px-4 py-2">
            <SafetyBanner />
            {groupedMessages.map((group) => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="flex items-center gap-3 my-4" role="separator">
                  <div className="flex-1 h-px bg-neutral-200" />
                  <span className="text-caption text-neutral-400 font-medium shrink-0">
                    {formatDateSeparator(group.date)}
                  </span>
                  <div className="flex-1 h-px bg-neutral-200" />
                </div>

                {/* Messages in group */}
                {group.messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    content={msg.content}
                    type={msg.type}
                    isSent={msg.senderId === currentUserId}
                    timestamp={msg.createdAt}
                    readAt={msg.readAt}
                    senderName={
                      msg.senderId !== currentUserId
                        ? conversation.otherUser?.displayName
                        : undefined
                    }
                  />
                ))}
              </div>
            ))}

            {/* Typing indicator */}
            {typingUser && (
              <div className="mt-1">
                <p className="text-caption text-neutral-400 mb-0.5 ml-1">
                  {typingUser} is typing
                </p>
                <TypingIndicator />
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Bottom: Message input */}
      <div className="border-t border-neutral-200 p-3 pb-safe">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-body-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:border-primary-500 focus:bg-white transition-colors duration-fast max-h-32"
              aria-label="Message input"
              style={{
                minHeight: '40px',
                height: 'auto',
              }}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!inputValue.trim()}
            aria-label="Send message"
            className="shrink-0"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </Button>
        </form>
      </div>

      {/* Screen reader announcement for new messages */}
      <div className="sr-only" aria-live="polite" aria-atomic="false">
        {messages.length > 0 && (
          <span>
            {messages[messages.length - 1]?.senderId === currentUserId
              ? 'Message sent'
              : `New message from ${conversation.otherUser?.displayName ?? 'user'}`}
          </span>
        )}
      </div>
    </div>
  );
}
