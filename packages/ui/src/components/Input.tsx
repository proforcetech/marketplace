'use client';

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export type InputVariant = 'default' | 'search';
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input label displayed above the field. */
  label?: string;
  /** Helper text displayed below the field. */
  helperText?: string;
  /** Error message. When set, the input enters error state. */
  error?: string;
  /** Icon or element rendered inside the left edge of the input. */
  leftIcon?: ReactNode;
  /** Icon or element rendered inside the right edge of the input. */
  rightIcon?: ReactNode;
  /** Visual variant. */
  variant?: InputVariant;
  /** Size preset. */
  inputSize?: InputSize;
}

const sizeStyles: Record<InputSize, string> = {
  sm: 'h-8 px-2.5 text-body-sm',
  md: 'h-10 px-3 text-body-md',
  lg: 'h-12 px-4 text-body-md',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    helperText,
    error,
    leftIcon,
    rightIcon,
    variant = 'default',
    inputSize = 'md',
    className,
    id: externalId,
    disabled,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const hasError = Boolean(error);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-label text-neutral-800">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={
            hasError ? errorId : helperText ? helperId : undefined
          }
          className={cn(
            'w-full rounded-md border bg-white transition-colors duration-fast',
            'placeholder:text-neutral-400',
            'focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:border-primary-500 focus:bg-primary-50',
            'disabled:bg-neutral-100 disabled:border-neutral-300 disabled:text-neutral-400 disabled:cursor-not-allowed',
            hasError
              ? 'border-error-500 bg-error-50 focus:ring-error-500/20 focus:border-error-500'
              : 'border-neutral-200',
            variant === 'search' && 'rounded-full',
            sizeStyles[inputSize],
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
          )}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
            {rightIcon}
          </span>
        )}
      </div>
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
  );
});
