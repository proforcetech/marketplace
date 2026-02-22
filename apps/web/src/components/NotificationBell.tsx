'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { NotificationItem } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { formatDistanceToNow } from 'date-fns';

export function NotificationBell(): JSX.Element | null {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll every 30s while authenticated
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.list({ limit: 20 }),
    refetchInterval: 30_000,
    enabled: isAuthenticated,
  });

  const notifications: NotificationItem[] = data?.data?.notifications ?? [];
  const unreadCount: number = data?.data?.unreadCount ?? 0;

  const markAllRead = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markOneRead = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = useCallback(
    (notification: NotificationItem) => {
      if (!notification.isRead) {
        markOneRead.mutate(notification.id);
      }
      // Navigate if the notification has a URL in data
      const url = notification.data?.url;
      if (typeof url === 'string') {
        window.location.href = url;
      }
      setOpen(false);
    },
    [markOneRead],
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated) return null;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors duration-fast"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-neutral-200 rounded-lg shadow-lg z-dropdown overflow-hidden animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
            <h3 className="text-body-sm font-semibold text-neutral-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-caption text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto divide-y divide-neutral-50">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-neutral-400">
                <Bell size={32} strokeWidth={1.5} />
                <p className="text-body-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-neutral-50 transition-colors ${
                    !n.isRead ? 'bg-primary-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {!n.isRead && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-primary-500 shrink-0" />
                    )}
                    <div className={`flex-1 min-w-0 ${n.isRead ? 'pl-5' : ''}`}>
                      <p className="text-body-sm font-medium text-neutral-900 leading-tight">
                        {n.title}
                      </p>
                      <p className="text-caption text-neutral-600 mt-0.5 line-clamp-2">
                        {n.body}
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
