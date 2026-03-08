'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, X, ChevronLeft, ChevronRight,
  ShieldOff, EyeOff, Clock, CheckCircle,
  Star, BadgeCheck, Phone, ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import api, { type AdminUser, type AdminUserDetail } from '@/lib/api';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

// ─── Helpers ─────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0]?.[0] ?? '?').toUpperCase();
  return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
}

// ─── Status Badge ─────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  active:        { label: 'Active',        cls: 'bg-green-100 text-green-700' },
  banned:        { label: 'Banned',        cls: 'bg-red-100 text-red-700' },
  shadow_banned: { label: 'Shadow-banned', cls: 'bg-orange-100 text-orange-700' },
  suspended:     { label: 'Suspended',     cls: 'bg-amber-100 text-amber-700' },
  inactive:      { label: 'Inactive',      cls: 'bg-neutral-100 text-neutral-500' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-neutral-100 text-neutral-600' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', cfg.cls)}>
      {cfg.label}
    </span>
  );
}

// ─── Role Badge ───────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === 'admin' || role === 'super_admin';
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize',
      isAdmin ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-600',
    )}>
      {role.replace('_', ' ')}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────

function UserAvatar({ user, size = 'sm' }: { user: Pick<AdminUser, 'displayName' | 'avatarUrl'>; size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 'w-14 h-14 text-lg' : 'w-8 h-8 text-xs';
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={user.displayName} className={cn('rounded-full object-cover shrink-0', dim)} />;
  }
  return (
    <div className={cn('rounded-full bg-primary-100 text-primary-700 font-semibold flex items-center justify-center shrink-0', dim)}>
      {getInitials(user.displayName)}
    </div>
  );
}

// ─── Action Modals ────────────────────────────────────────────

type ModalType = 'ban' | 'shadow-ban' | 'suspend' | null;

interface ActionModalProps {
  type: Exclude<ModalType, null>;
  onConfirm: (reason: string, days?: number) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function ActionModal({ type, onConfirm, onCancel, isLoading }: ActionModalProps) {
  const [reason, setReason] = useState('');
  const [days, setDays] = useState(7);

  const config = {
    ban:          { title: 'Ban user', label: 'Ban', cls: 'bg-red-600 hover:bg-red-700' },
    'shadow-ban': { title: 'Shadow-ban user', label: 'Shadow-ban', cls: 'bg-orange-600 hover:bg-orange-700' },
    suspend:      { title: 'Suspend user', label: 'Suspend', cls: 'bg-amber-600 hover:bg-amber-700' },
  }[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-base font-semibold text-neutral-900 mb-4">{config.title}</h3>

        {type === 'suspend' && (
          <div className="mb-3">
            <label className="block text-sm font-medium text-neutral-700 mb-1">Duration (days)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Reason</label>
          <textarea
            rows={3}
            placeholder="Enter a reason..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim(), days)}
            disabled={!reason.trim() || isLoading}
            className={cn('px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed', config.cls)}
          >
            {isLoading ? 'Processing…' : config.label}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────

interface DetailPanelProps {
  userId: string;
  onClose: () => void;
  onAction: (type: ModalType) => void;
}

function DetailPanel({ userId, onClose, onAction }: DetailPanelProps) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: () => api.admin.getUserDetail(userId),
  });

  const unsuspendMutation = useMutation({
    mutationFn: () => api.admin.unsuspendUser(userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'user', userId] });
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const user = data?.data;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-y-auto">
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-neutral-900">User detail</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading || !user ? (
          <div className="p-5 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-5 bg-neutral-200 rounded animate-pulse" style={{ width: `${60 + (i % 3) * 15}%` }} />
            ))}
          </div>
        ) : (
          <>
            {/* Identity */}
            <div className="px-5 py-4 border-b border-neutral-100">
              <div className="flex items-center gap-3 mb-3">
                <UserAvatar user={user} size="lg" />
                <div className="min-w-0">
                  <p className="font-semibold text-neutral-900 truncate">{user.displayName}</p>
                  <p className="text-sm text-neutral-500 truncate">{user.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <RoleBadge role={user.role} />
                <StatusBadge status={user.status} />
                {user.identityVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                    <BadgeCheck className="w-3 h-3" /> ID Verified
                  </span>
                )}
                {user.phoneVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-700">
                    <Phone className="w-3 h-3" /> Phone Verified
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="px-5 py-4 border-b border-neutral-100">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Listings', value: user.listingCount },
                  { label: 'Reports against', value: user.reportCount },
                  { label: 'Rating', value: user.ratingAvg != null ? `${user.ratingAvg.toFixed(1)} (${user.ratingCount})` : 'None' },
                  { label: 'Response rate', value: user.responseRate != null ? `${user.responseRate}%` : 'N/A' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-neutral-50 rounded-lg p-3">
                    <p className="text-xs text-neutral-500">{label}</p>
                    <p className="text-sm font-semibold text-neutral-900 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-neutral-500 space-y-1">
                {user.phone && <p>Phone: {user.phone}</p>}
                <p>Joined {formatDate(user.createdAt)}</p>
                <p>Last active {formatAgo(user.lastActiveAt)}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-4 border-b border-neutral-100">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Actions</p>
              <div className="flex flex-wrap gap-2">
                {(user.status === 'active' || user.status === 'inactive') && (
                  <>
                    <button
                      onClick={() => onAction('ban')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <ShieldOff className="w-3.5 h-3.5" /> Ban
                    </button>
                    <button
                      onClick={() => onAction('shadow-ban')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                    >
                      <EyeOff className="w-3.5 h-3.5" /> Shadow-ban
                    </button>
                    <button
                      onClick={() => onAction('suspend')}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5" /> Suspend
                    </button>
                  </>
                )}
                {(user.status === 'banned' || user.status === 'shadow_banned' || user.status === 'suspended') && (
                  <button
                    onClick={() => unsuspendMutation.mutate()}
                    disabled={unsuspendMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {unsuspendMutation.isPending ? 'Processing…' : 'Reinstate'}
                  </button>
                )}
                <Link
                  href={`/users/${userId}`}
                  target="_blank"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Public profile
                </Link>
              </div>
            </div>

            {/* Recent admin actions */}
            {user.recentActions.length > 0 && (
              <div className="px-5 py-4">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Recent admin actions</p>
                <div className="space-y-2">
                  {user.recentActions.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-medium text-neutral-700 capitalize">{a.action.replace(/_/g, ' ')}</span>
                        {a.details && typeof a.details === 'object' && 'reason' in a.details && (
                          <span className="text-neutral-500"> — {String(a.details.reason)}</span>
                        )}
                        <span className="text-neutral-400 ml-1">{formatAgo(a.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── User Table Row ───────────────────────────────────────────

function UserRow({ user, onClick }: { user: AdminUser; onClick: () => void }) {
  return (
    <tr
      className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Avatar + name */}
      <td className="py-3 pl-4 pr-4">
        <div className="flex items-center gap-3">
          <UserAvatar user={user} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-900 truncate">{user.displayName}</p>
            <p className="text-xs text-neutral-500 truncate">{user.email}</p>
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="py-3 pr-4 w-32">
        <RoleBadge role={user.role} />
      </td>

      {/* Status */}
      <td className="py-3 pr-4 w-36">
        <StatusBadge status={user.status} />
      </td>

      {/* Verified */}
      <td className="py-3 pr-4 w-20">
        <div className="flex items-center gap-1.5">
          {user.identityVerified && <BadgeCheck className="w-4 h-4 text-blue-500" title="ID verified" />}
          {user.phoneVerified && <Phone className="w-4 h-4 text-teal-500" title="Phone verified" />}
          {!user.identityVerified && !user.phoneVerified && <span className="text-neutral-300 text-xs">—</span>}
        </div>
      </td>

      {/* Rating */}
      <td className="py-3 pr-4 w-24 text-sm text-neutral-600">
        {user.ratingAvg != null ? (
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            {user.ratingAvg.toFixed(1)}
          </span>
        ) : (
          <span className="text-neutral-400 text-xs">No ratings</span>
        )}
      </td>

      {/* Joined */}
      <td className="py-3 pr-4 w-32 text-xs text-neutral-500 whitespace-nowrap">
        {formatDate(user.createdAt)}
      </td>

      {/* Last active */}
      <td className="py-3 pr-4 w-28 text-xs text-neutral-500 whitespace-nowrap">
        {formatAgo(user.lastActiveAt)}
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalType>(null);

  const qc = useQueryClient();

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'users', debouncedSearch, page],
    queryFn: () => api.admin.searchUsers({ search: debouncedSearch || undefined, page, limit: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });

  const invalidateUser = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    if (selectedUserId) {
      void qc.invalidateQueries({ queryKey: ['admin', 'user', selectedUserId] });
    }
  }, [qc, selectedUserId]);

  const banMutation = useMutation({
    mutationFn: ({ reason }: { reason: string }) =>
      api.admin.banUser(selectedUserId!, reason),
    onSuccess: () => { setModal(null); invalidateUser(); },
  });

  const shadowBanMutation = useMutation({
    mutationFn: ({ reason }: { reason: string }) =>
      api.admin.shadowBanUser(selectedUserId!, reason),
    onSuccess: () => { setModal(null); invalidateUser(); },
  });

  const suspendMutation = useMutation({
    mutationFn: ({ reason, days }: { reason: string; days: number }) =>
      api.admin.suspendUser(selectedUserId!, reason, days),
    onSuccess: () => { setModal(null); invalidateUser(); },
  });

  const handleModalConfirm = (reason: string, days?: number) => {
    if (!selectedUserId) return;
    if (modal === 'ban') banMutation.mutate({ reason });
    else if (modal === 'shadow-ban') shadowBanMutation.mutate({ reason });
    else if (modal === 'suspend') suspendMutation.mutate({ reason, days: days ?? 7 });
  };

  const isAnyMutating = banMutation.isPending || shadowBanMutation.isPending || suspendMutation.isPending;

  const users = data?.data ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination ? Math.ceil(pagination.total / PAGE_SIZE) : 1;

  return (
    <>
      {/* Action modal */}
      {modal && (
        <ActionModal
          type={modal}
          onConfirm={handleModalConfirm}
          onCancel={() => setModal(null)}
          isLoading={isAnyMutating}
        />
      )}

      {/* Detail slide-out */}
      {selectedUserId && (
        <DetailPanel
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onAction={(type) => setModal(type)}
        />
      )}

      <div className="space-y-4">
        {/* Search bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {pagination && (
            <span className="text-sm text-neutral-500 whitespace-nowrap">
              {pagination.total.toLocaleString()} user{pagination.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
          {isError ? (
            <div className="p-8 text-center text-sm text-red-600">
              Failed to load users. Please refresh.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="py-2.5 pl-4 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide">User</th>
                  <th className="py-2.5 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide w-32">Role</th>
                  <th className="py-2.5 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide w-36">Status</th>
                  <th className="py-2.5 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide w-20">Verified</th>
                  <th className="py-2.5 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide w-24">Rating</th>
                  <th className="py-2.5 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide w-32">Joined</th>
                  <th className="py-2.5 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide w-28">Last active</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-neutral-100">
                      <td className="py-3 pl-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-neutral-200 animate-pulse shrink-0" />
                          <div className="space-y-1">
                            <div className="h-3.5 w-32 bg-neutral-200 rounded animate-pulse" />
                            <div className="h-3 w-24 bg-neutral-100 rounded animate-pulse" />
                          </div>
                        </div>
                      </td>
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="py-3 pr-4">
                          <div className="h-4 bg-neutral-200 rounded animate-pulse w-16" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-neutral-500">
                      {debouncedSearch ? `No users found for "${debouncedSearch}"` : 'No users found.'}
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onClick={() => setSelectedUserId(user.id)}
                    />
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination && totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">
              Page {page} of {totalPages} ({pagination.total.toLocaleString()} total)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-neutral-200 text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const n = start + i;
                return (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={cn(
                      'w-8 h-8 rounded-md text-sm font-medium transition-colors',
                      n === page
                        ? 'bg-primary-600 text-white'
                        : 'border border-neutral-200 text-neutral-700 hover:bg-neutral-50',
                    )}
                  >
                    {n}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-neutral-200 text-neutral-700 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
