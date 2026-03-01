import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'verified'
  | 'sponsored';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-neutral-100 text-neutral-700',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  error: 'bg-error-50 text-error-700',
  info: 'bg-info-50 text-info-700',
  verified: 'bg-primary-50 text-primary-700',
  sponsored: 'bg-accent-100 text-accent-700',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'h-5 px-1.5 text-overline',
  md: 'h-6 px-2 text-caption',
};

export function Badge({
  variant = 'default',
  size = 'md',
  icon,
  children,
  className,
}: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      aria-label={variant === 'verified' ? `Verified: ${String(children)}` : undefined}
    >
      {icon && <span className="shrink-0 [&>svg]:w-3 [&>svg]:h-3">{icon}</span>}
      {children}
    </span>
  );
}
