'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import api, { type AuditLogEntry } from '@/lib/api';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;

// Backend joins actor onto every row but the shared type doesn't declare it
type AuditRow = AuditLogEntry & {
  actor?: { id: string; displayName: string; email: string } | null;
};

// ─── Helpers ─────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function formatAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDateTime(iso);
}

// Derive a human-readable label from snake_case action strings
function actionLabel(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Action color coding ──────────────────────────────────────

function actionColor(action: string): string {
  if (action.includes('ban') || action.includes('remove') || action.includes('reject')) {
    return 'bg-red-100 text-red-700';
  }
  if (action.includes('suspend') || action.includes('shadow')) {
    return 'bg-amber-100 text-amber-700';
  }
  if (action.includes('approve') || action.includes('reinstate') || action.includes('unsuspend')) {
    return 'bg-green-100 text-green-700';
  }
  if (action.includes('report')) {
    return 'bg-orange-100 text-orange-700';
  }
  return 'bg-neutral-100 text-neutral-600';
}

function ActionBadge({ action }: { action: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap', actionColor(action))}>
      {actionLabel(action)}
    </span>
  );
}

// ─── Target type badge ────────────────────────────────────────

const TARGET_CLS: Record<string, string> = {
  listing: 'bg-purple-100 text-purple-700',
  user:    'bg-blue-100 text-blue-700',
  message: 'bg-teal-100 text-teal-700',
  report:  'bg-orange-100 text-orange-700',
};

function TargetBadge({ type }: { type: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize', TARGET_CLS[type] ?? 'bg-neutral-100 text-neutral-600')}>
      {type}
    </span>
  );
}

// ─── Log Row ──────────────────────────────────────────────────

function LogRow({ row, isExpanded, onToggle }: {
  row: AuditRow;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={cn(
          'border-b border-neutral-100 hover:bg-neutral-50 transition-colors cursor-pointer select-none',
          isExpanded && 'bg-neutral-50',
        )}
        onClick={onToggle}
      >
        {/* Timestamp */}
        <td className="py-3 pl-4 pr-4 w-40 text-xs text-neutral-500 whitespace-nowrap">
          <span title={formatDateTime(row.createdAt)}>{formatAgo(row.createdAt)}</span>
        </td>

        {/* Actor */}
        <td className="py-3 pr-4 w-44">
          {row.actor ? (
            <div>
              <p className="text-sm text-neutral-800 truncate">{row.actor.displayName}</p>
              <p className="text-xs text-neutral-400 truncate">{row.actorType}</p>
            </div>
          ) : (
            <div>
              <p className="text-xs font-mono text-neutral-500 truncate">{row.actorId.slice(0, 12)}…</p>
              <p className="text-xs text-neutral-400">{row.actorType}</p>
            </div>
          )}
        </td>

        {/* Action */}
        <td className="py-3 pr-4 w-56">
          <ActionBadge action={row.action} />
        </td>

        {/* Target */}
        <td className="py-3 pr-4 w-28">
          <TargetBadge type={row.targetType} />
        </td>

        {/* Target ID (short) */}
        <td className="py-3 pr-4 w-32 text-xs font-mono text-neutral-500">
          {row.targetId.slice(0, 12)}…
        </td>

        {/* Details snippet */}
        <td className="py-3 pr-4 text-xs text-neutral-500 max-w-xs truncate">
          {row.details
            ? Object.entries(row.details)
                .slice(0, 2)
                .map(([k, v]) => `${k}: ${String(v)}`)
                .join(' · ')
            : <span className="text-neutral-300">—</span>}
        </td>

        {/* Expand toggle */}
        <td className="py-3 pr-4 w-8 text-neutral-400">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </td>
      </tr>

      {/* Expanded row */}
      {isExpanded && (
        <tr className="border-b border-neutral-200 bg-neutral-50">
          <td colSpan={7} className="px-4 pb-4 pt-1">
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs mb-3">
              <Detail label="Timestamp" value={formatDateTime(row.createdAt)} />
              <Detail label="Action" value={row.action} mono />
              <Detail label="Actor ID" value={row.actorId} mono />
              <Detail label="Actor type" value={row.actorType} />
              {row.actor && <Detail label="Actor name" value={`${row.actor.displayName} (${row.actor.email})`} />}
              <Detail label="Target type" value={row.targetType} />
              <Detail label="Target ID" value={row.targetId} mono />
            </div>
            {row.details && (
              <div>
                <p className="text-xs font-medium text-neutral-500 mb-1">Details</p>
                <pre className="text-xs bg-white border border-neutral-200 rounded-md p-3 overflow-auto max-h-40 text-neutral-700 font-mono whitespace-pre-wrap">
                  {JSON.stringify(row.details, null, 2)}
                </pre>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-neutral-500 w-24 shrink-0">{label}</span>
      <span className={cn('text-neutral-800 truncate', mono && 'font-mono')}>{value}</span>
    </div>
  );
}

// ─── Filters ──────────────────────────────────────────────────

const TARGET_TYPE_OPTIONS = [
  { value: '', label: 'All targets' },
  { value: 'listing', label: 'Listing' },
  { value: 'user', label: 'User' },
  { value: 'message', label: 'Message' },
  { value: 'report', label: 'Report' },
];

interface Filters {
  action: string;
  targetType: string;
  startDate: string;
  endDate: string;
}

// ─── Page ─────────────────────────────────────────────────────

export default function AuditLogPage() {
  const [filters, setFilters] = useState<Filters>({ action: '', targetType: '', startDate: '', endDate: '' });
  const [debouncedAction, setDebouncedAction] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Debounce action keyword
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedAction(filters.action);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [filters.action]);

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
    if (key !== 'action') setPage(1);
  };

  const hasActiveFilters = debouncedAction || filters.targetType || filters.startDate || filters.endDate;

  const clearFilters = () => {
    setFilters({ action: '', targetType: '', startDate: '', endDate: '' });
    setDebouncedAction('');
    setPage(1);
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'audit-log', debouncedAction, filters.targetType, filters.startDate, filters.endDate, page],
    queryFn: () =>
      api.admin.getAuditLog({
        action: debouncedAction || undefined,
        targetType: filters.targetType || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    placeholderData: (prev) => prev,
  });

  const rows = (data?.data ?? []) as AuditRow[];
  const pagination = data?.pagination;
  const totalPages = pagination ? Math.ceil(pagination.total / PAGE_SIZE) : 1;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-4 gap-3">
          {/* Action keyword */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter by action…"
              value={filters.action}
              onChange={(e) => setFilter('action', e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {filters.action && (
              <button
                onClick={() => setFilter('action', '')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Target type */}
          <select
            value={filters.targetType}
            onChange={(e) => setFilter('targetType', e.target.value)}
            className="py-2 px-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-neutral-700"
          >
            {TARGET_TYPE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Start date */}
          <div className="relative">
            <label className="absolute -top-2 left-2.5 px-0.5 bg-white text-xs text-neutral-400">From</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilter('startDate', e.target.value)}
              className="w-full py-2 px-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-neutral-700"
            />
          </div>

          {/* End date */}
          <div className="relative">
            <label className="absolute -top-2 left-2.5 px-0.5 bg-white text-xs text-neutral-400">To</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilter('endDate', e.target.value)}
              className="w-full py-2 px-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-neutral-700"
            />
          </div>
        </div>

        {/* Active filters summary + clear */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100">
            <p className="text-xs text-neutral-500">
              {pagination ? `${pagination.total.toLocaleString()} result${pagination.total !== 1 ? 's' : ''}` : 'Filtering…'}
            </p>
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
        {isError ? (
          <div className="p-8 text-center text-sm text-red-600">
            Failed to load audit log. Please refresh.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="py-2.5 pl-4 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide w-40">When</th>
                <th className="py-2.5 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide w-44">Actor</th>
                <th className="py-2.5 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide w-56">Action</th>
                <th className="py-2.5 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide w-28">Target</th>
                <th className="py-2.5 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide w-32">Target ID</th>
                <th className="py-2.5 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide">Details</th>
                <th className="py-2.5 pr-4 w-8" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 12 }).map((_, i) => (
                  <tr key={i} className="border-b border-neutral-100">
                    {[40, 44, 56, 28, 32, 60, 8].map((w, j) => (
                      <td key={j} className={j === 0 ? 'py-3 pl-4 pr-4' : 'py-3 pr-4'}>
                        <div className="h-4 bg-neutral-200 rounded animate-pulse" style={{ width: `${w * 0.6}px` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-neutral-500">
                    No audit log entries found{hasActiveFilters ? ' matching the current filters' : ''}.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <LogRow
                    key={row.id}
                    row={row}
                    isExpanded={expandedId === row.id}
                    onToggle={() => setExpandedId((id) => (id === row.id ? null : row.id))}
                  />
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-500">
            {hasActiveFilters
              ? `${pagination.total.toLocaleString()} matching entries`
              : `${pagination.total.toLocaleString()} total entries`}
            {totalPages > 1 && ` · page ${page} of ${totalPages}`}
          </span>
          {totalPages > 1 && (
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
          )}
        </div>
      )}
    </div>
  );
}
