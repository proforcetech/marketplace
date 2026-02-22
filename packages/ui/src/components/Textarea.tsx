'use client';

import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Label displayed above the textarea. */
  label?: string;
  /** Helper text below the field. */
  helperText?: string;
  /** Error message. When set, the textarea enters error state. */
  error?: string;
  /** Maximum character count. When provided, a character counter is displayed. */
  maxCharacters?: number;
  /** Current character count (controlled). If omitted, derived from value/defaultValue. */
  characterCount?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    label,
    helperText,
    error,
    maxCharacters,
    characterCount,
    className,
    id: externalId,
    disabled,
    value,
    defaultValue,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  const hasError = Boolean(error);

  const currentCount =
    characterCount ?? (typeof value === 'string' ? value.length : (typeof defaultValue === 'string' ? defaultValue.length : 0));
  const isOverLimit = maxCharacters != null && currentCount > maxCharacters;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-label text-neutral-800">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        disabled={disabled}
        value={value}
        defaultValue={defaultValue}
        aria-invalid={hasError || isOverLimit || undefined}
        aria-describedby={
          hasError ? errorId : helperText ? helperId : undefined
        }
        className={cn(
          'w-full rounded-md border bg-white px-3 py-2.5 text-body-md transition-colors duration-fast resize-y min-h-[100px]',
          'placeholder:text-neutral-400',
          'focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:border-primary-500 focus:bg-primary-50',
          'disabled:bg-neutral-100 disabled:border-neutral-300 disabled:text-neutral-400 disabled:cursor-not-allowed',
          hasError || isOverLimit
            ? 'border-error-500 bg-error-50 focus:ring-error-500/20 focus:border-error-500'
            : 'border-neutral-200',
        )}
        {...props}
      />
      <div className="flex items-center justify-between">
        <div>
          {hasError && (
            <p id={errorId} className="text-caption text-error-500" role="alert" aria-live="polite">
              {error}
            </p>
          )}
          {!hasError && helperText && (
            <p id={helperId} className="text-caption text-neutral-500">
              {helperText}
            </p>
          )}
        </div>
        {maxCharacters != null && (
          <span
            className={cn(
              'text-caption',
              isOverLimit ? 'text-error-500' : 'text-neutral-400',
            )}
          >
            {currentCount}/{maxCharacters}
          </span>
        )}
      </div>
    </div>
  );
});
