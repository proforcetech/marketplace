import { cn } from '../lib/cn.js';
import { Avatar } from './Avatar.js';
import { Badge } from './Badge.js';
import { RatingStars } from './RatingStars.js';
import { Button } from './Button.js';
import type { PublicUser } from '@marketplace/shared';

export interface UserCardProps {
  user: PublicUser;
  /** Called when "Contact" or "Message" is clicked. */
  onContact?: () => void;
  /** Whether to show the contact button. */
  showContactButton?: boolean;
  /** Compact variant for inline usage. */
  compact?: boolean;
  className?: string;
}

function formatMemberSince(dateStr: string): string {
  const date = new Date(dateStr);
  return `Member since ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
}

function formatResponseRate(rate: number | null): string {
  if (rate == null) return 'N/A';
  return `${Math.round(rate * 100)}%`;
}

export function UserCard({
  user,
  onContact,
  showContactButton = true,
  compact = false,
  className,
}: UserCardProps): JSX.Element {
  if (compact) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <Avatar
          name={user.displayName}
          src={user.avatarUrl}
          size="md"
          isVerified={user.identityVerified}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-body-sm font-medium text-neutral-800 truncate">
              {user.displayName}
            </span>
            {user.identityVerified && (
              <Badge variant="verified" size="sm">Verified</Badge>
            )}
          </div>
          {user.reputationScore != null && (
            <RatingStars rating={user.reputationScore} size="sm" showValue={false} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white border border-neutral-200 rounded-lg p-4',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar
          name={user.displayName}
          src={user.avatarUrl}
          size="lg"
          isVerified={user.identityVerified}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-heading-sm text-neutral-900">{user.displayName}</h3>
            {user.identityVerified && (
              <Badge variant="verified" size="sm">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Verified
              </Badge>
            )}
          </div>
          {user.reputationScore != null && (
            <div className="mt-1">
              <RatingStars rating={user.reputationScore} size="sm" />
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-3 grid grid-cols-2 gap-y-1.5 text-body-sm">
        <div className="text-neutral-500">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {formatMemberSince(user.createdAt)}
        </div>
        <div className="text-neutral-500">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1.5">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          Response: {formatResponseRate(user.responseRate)}
        </div>
        <div className="text-neutral-500">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1.5">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
          </svg>
          {user.listingCount} listing{user.listingCount !== 1 ? 's' : ''}
        </div>
        {user.locationText && (
          <div className="text-neutral-500">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {user.locationText}
          </div>
        )}
      </div>

      {showContactButton && onContact && (
        <Button
          variant="primary"
          fullWidth
          className="mt-4"
          onClick={onContact}
          leftIcon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          }
        >
          Message Seller
        </Button>
      )}
    </div>
  );
}
