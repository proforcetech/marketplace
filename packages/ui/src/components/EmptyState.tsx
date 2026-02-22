'use client';

import type { ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { Button, type ButtonProps } from './Button.js';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: ButtonProps['variant'];
}

export interface EmptyStateProps {
  /** Large icon or illustration rendered above the title. */
  icon?: ReactNode;
  /** Bold heading text. */
  title: string;
  /** Supporting description text. */
  description?: string;
  /** Optional call-to-action button. */
  action?: EmptyStateAction;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-6 py-12',
        className,
      )}
      role="status"
    >
      {icon && (
        <div className="mb-4 text-neutral-300 [&>svg]:w-16 [&>svg]:h-16">
          {icon}
        </div>
      )}
      <h3 className="text-heading-md text-neutral-800">{title}</h3>
      {description && (
        <p className="mt-2 text-body-sm text-neutral-500 max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <Button
          variant={action.variant ?? 'primary'}
          onClick={action.onClick}
          className="mt-6"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
