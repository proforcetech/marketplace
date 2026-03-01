'use client';

import { forwardRef, useId, type SelectHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Label displayed above the select. */
  label?: string;
  /** Placeholder text shown when no value is selected. */
  placeholder?: string;
  /** Helper text below the field. */
  helperText?: string;
  /** Error message. When set, the select enters error state. */
  error?: string;
  /** Flat list of options. */
  options?: SelectOption[];
  /** Grouped options. Takes precedence over `options` when provided. */
  optionGroups?: SelectOptionGroup[];
  /** Size preset. */
  selectSize?: 'sm' | 'md' | 'lg';
}

const sizeStyles: Record<string, string> = {
  sm: 'h-8 px-2.5 text-body-sm',
  md: 'h-10 px-3 text-body-md',
  lg: 'h-12 px-4 text-body-md',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    placeholder,
    helperText,
    error,
    options,
    optionGroups,
    selectSize = 'md',
    className,
    id: externalId,
    disabled,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const id = externalId ?? generatedId;
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;
  const hasError = Boolean(error);

  function renderOptions(): ReactNode {
    if (optionGroups) {
      return optionGroups.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </optgroup>
      ));
    }

    return options?.map((opt) => (
      <option key={opt.value} value={opt.value} disabled={opt.disabled}>
        {opt.label}
      </option>
    ));
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-label text-neutral-800">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
          className={cn(
            'w-full appearance-none rounded-md border bg-white pr-10 transition-colors duration-fast',
            'focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:border-primary-500',
            'disabled:bg-neutral-100 disabled:border-neutral-300 disabled:text-neutral-400 disabled:cursor-not-allowed',
            hasError
              ? 'border-error-500 bg-error-50 focus:ring-error-500/20 focus:border-error-500'
              : 'border-neutral-200',
            sizeStyles[selectSize],
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {renderOptions()}
        </select>
        {/* Chevron icon */}
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
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
