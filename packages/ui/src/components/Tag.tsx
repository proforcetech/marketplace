'use client';

import type { ReactNode } from 'react';
import { cn } from '../lib/cn.js';

export interface TagProps {
  /** Tag label text. */
  children: ReactNode;
  /** Optional icon rendered before the label. */
  icon?: ReactNode;
  /** Whether the tag is in the selected/active state. */
  selected?: boolean;
  /** Callback when the remove (X) button is clicked. If omitted, the tag is not removable. */
  onRemove?: () => void;
  /** Callback when the tag is clicked for selection toggling. */
  onClick?: () => void;
  className?: string;
}

export function Tag({
  children,
  icon,
  selected = false,
  onRemove,
  onClick,
  className,
}: TagProps): JSX.Element {
  const isInteractive = Boolean(onClick);

  const TagElement = isInteractive ? 'button' : 'span';

  return (
    <TagElement
      type={isInteractive ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-body-sm font-medium transition-colors duration-fast',
        selected
          ? 'bg-primary-50 text-primary-700 border border-primary-500'
          : 'bg-neutral-100 text-neutral-700 border border-transparent',
        isInteractive && 'cursor-pointer hover:bg-neutral-200',
        isInteractive && selected && 'hover:bg-primary-100',
        className,
      )}
      aria-pressed={isInteractive ? selected : undefined}
    >
      {icon && <span className="shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</span>}
      <span>{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="shrink-0 ml-0.5 p-0.5 rounded-sm hover:bg-neutral-200 transition-colors duration-fast"
          aria-label={`Remove ${String(children)}`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </TagElement>
  );
}
