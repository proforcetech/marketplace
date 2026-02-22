import { cn } from '../lib/cn.js';
import type { MessageType } from '@marketplace/shared';

export interface MessageBubbleProps {
  /** Message content. */
  content: string;
  /** Message type. */
  type: MessageType;
  /** Whether this message was sent by the current user. */
  isSent: boolean;
  /** ISO timestamp of when the message was created. */
  timestamp: string;
  /** ISO timestamp of when the message was read (null if unread). */
  readAt?: string | null;
  /** Sender name (for received messages). */
  senderName?: string;
  className?: string;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function ReadReceipt({ readAt }: { readAt?: string | null }): JSX.Element {
  const isRead = Boolean(readAt);
  return (
    <span className={cn('inline-flex items-center', isRead ? 'text-primary-400' : 'text-neutral-300')}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="-ml-2">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

export function MessageBubble({
  content,
  type,
  isSent,
  timestamp,
  readAt,
  senderName,
  className,
}: MessageBubbleProps): JSX.Element {
  // System / safety warning messages
  if (type === 'system' || type === 'safety_warning') {
    return (
      <div className={cn('flex justify-center my-3', className)}>
        <div className="max-w-[85%] px-4 py-2 rounded-lg bg-neutral-50 text-center">
          {type === 'safety_warning' && (
            <span className="inline-block mb-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-warning-500 inline">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
          )}
          <p className="text-caption text-neutral-500">{content}</p>
        </div>
      </div>
    );
  }

  // Regular messages
  return (
    <div
      className={cn(
        'flex mb-2',
        isSent ? 'justify-end' : 'justify-start',
        className,
      )}
    >
      <div className={cn('max-w-[75%]', isSent ? 'items-end' : 'items-start')}>
        {!isSent && senderName && (
          <p className="text-caption text-neutral-500 mb-0.5 ml-1">{senderName}</p>
        )}
        <div
          className={cn(
            'px-4 py-2.5 text-body-sm',
            isSent
              ? 'bg-primary-500 text-white rounded-lg rounded-br-sm'
              : 'bg-neutral-100 text-neutral-800 rounded-lg rounded-bl-sm',
          )}
        >
          {content}
        </div>
        <div
          className={cn(
            'flex items-center gap-1 mt-0.5 px-1',
            isSent ? 'justify-end' : 'justify-start',
          )}
        >
          <span className="text-caption text-neutral-400">{formatTime(timestamp)}</span>
          {isSent && <ReadReceipt readAt={readAt} />}
        </div>
      </div>
    </div>
  );
}

/** Typing indicator with animated dots. */
export function TypingIndicator({ className }: { className?: string }): JSX.Element {
  return (
    <div className={cn('flex justify-start mb-2', className)}>
      <div className="px-4 py-3 bg-neutral-100 rounded-lg rounded-bl-sm">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-neutral-400"
              style={{
                animation: 'typing-dot 1.4s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
