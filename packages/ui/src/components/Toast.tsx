'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '../lib/cn.js';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  variant: ToastVariant;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (variant: ToastVariant, message: string, duration?: number) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

const variantStyles: Record<ToastVariant, { border: string; icon: string; bg: string }> = {
  success: {
    border: 'border-l-success-500',
    icon: 'text-success-500',
    bg: 'bg-white',
  },
  error: {
    border: 'border-l-error-500',
    icon: 'text-error-500',
    bg: 'bg-white',
  },
  warning: {
    border: 'border-l-warning-500',
    icon: 'text-warning-500',
    bg: 'bg-white',
  },
  info: {
    border: 'border-l-info-500',
    icon: 'text-info-500',
    bg: 'bg-white',
  },
};

const variantIcons: Record<ToastVariant, JSX.Element> = {
  success: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  error: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  warning: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

function ToastItem({
  data,
  onDismiss,
}: {
  data: ToastData;
  onDismiss: (id: string) => void;
}): JSX.Element {
  const styles = variantStyles[data.variant];

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 w-full max-w-sm px-4 py-3 rounded-lg shadow-md border-l-4 animate-slide-in-bottom',
        styles.bg,
        styles.border,
      )}
    >
      <span className={cn('shrink-0 mt-0.5', styles.icon)}>
        {variantIcons[data.variant]}
      </span>
      <p className="flex-1 text-body-sm text-neutral-800">{data.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(data.id)}
        className="shrink-0 p-1 rounded text-neutral-400 hover:text-neutral-600 transition-colors duration-fast"
        aria-label="Dismiss notification"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

const MAX_TOASTS = 3;

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (variant: ToastVariant, message: string, duration?: number) => {
      const id = `toast-${++counterRef.current}`;
      const resolvedDuration = duration ?? (variant === 'error' ? 8000 : 5000);

      setToasts((prev) => {
        const next = [...prev, { id, variant, message, duration: resolvedDuration }];
        // Keep only the last MAX_TOASTS
        return next.slice(-MAX_TOASTS);
      });

      setTimeout(() => {
        dismiss(id);
      }, resolvedDuration);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Toast container: bottom-right on desktop, bottom-center on mobile */}
      <div className="fixed bottom-4 right-4 z-toast flex flex-col-reverse gap-2 pointer-events-none max-sm:left-4 max-sm:right-4 max-sm:bottom-[calc(56px+1rem+env(safe-area-inset-bottom))]">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem data={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
