'use client';

import { useState, type ImgHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'size'> {
  /** Display name used for initials fallback and alt text. */
  name: string;
  /** Image source URL. Falls back to initials when absent or on load error. */
  src?: string | null;
  /** Size preset. */
  size?: AvatarSize;
  /** Show an online indicator dot. */
  isOnline?: boolean;
  /** Show a verification badge overlay. */
  isVerified?: boolean;
}

const sizeMap: Record<AvatarSize, { container: string; text: string; indicator: string }> = {
  xs: { container: 'w-6 h-6', text: 'text-[10px]', indicator: 'w-1.5 h-1.5 border' },
  sm: { container: 'w-8 h-8', text: 'text-caption', indicator: 'w-2 h-2 border' },
  md: { container: 'w-10 h-10', text: 'text-body-sm', indicator: 'w-2.5 h-2.5 border-2' },
  lg: { container: 'w-14 h-14', text: 'text-body-md', indicator: 'w-3 h-3 border-2' },
  xl: { container: 'w-20 h-20', text: 'text-heading-md', indicator: 'w-4 h-4 border-2' },
  '2xl': { container: 'w-[120px] h-[120px]', text: 'text-display-sm', indicator: 'w-5 h-5 border-2' },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0]?.[0] ?? '?').toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

export function Avatar({
  name,
  src,
  size = 'md',
  isOnline,
  isVerified,
  className,
  ...props
}: AvatarProps): JSX.Element {
  const [imgError, setImgError] = useState(false);
  const showImage = src && !imgError;
  const sizeConfig = sizeMap[size];

  return (
    <div className={cn('relative inline-flex shrink-0', sizeConfig.container, className)}>
      {showImage ? (
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          className={cn('rounded-full object-cover', sizeConfig.container)}
          {...props}
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold select-none',
            sizeConfig.container,
            sizeConfig.text,
          )}
          role="img"
          aria-label={name}
        >
          {getInitials(name)}
        </div>
      )}

      {isOnline && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full bg-success-500 border-white',
            sizeConfig.indicator,
          )}
          aria-label="Online"
        />
      )}

      {isVerified && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-primary-500 text-white"
          aria-label="Verified"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      )}
    </div>
  );
}
