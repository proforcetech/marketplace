'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, X, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import api, { type AdminReport } from '@/lib/api';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

// ─── Helpers ─────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
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
  return formatDate(iso);
}

// ─── Badges ───────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pending:       { label: 'Pending',       cls: 'bg-amber-100 text-amber-700' },
  investigating: { label: 'Investigating', cls: 'bg-blue-100 text-blue-700' },
  resolved:      { label: 'Resolved',      cls: 'bg-green-100 text-green-700' },
  dismissed:     { label: 'Dismissed',     cls: 'bg-neutral-100 text-neutral-500' },
};

const TARGET_CFG: Record<string, { label: string; cls: string }> = {
  listing: { label: 'Listing', cls: 'bg-purple-100 text-purple-700' },
  user:    { label: 'User',    cls: 'bg-blue-100 text-blue-700' },
  message: { label: 'Message', cls: 'bg-teal-100 text-teal-700' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, cls: 'bg-neutral-100 text-neutral-600' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', cfg.cls)}>
      {cfg.label}
    </span>
  );
}

function TargetBadge({ targetType }: { targetType: string }) {
  const cfg = TARGET_CFG[targetType] ?? { label: targetType, cls: 'bg-neutral-100 text-neutral-600' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', cfg.cls)}>
      {cfg.label}
    </span>
  );
}

// ─── Priority Badge ───────────────────────────────────────────

function PriorityDot({ priority }: { priority: string }) {
  const cls =
    priority === 'high'   ? 'bg-red-500' :
    priority === 'medium' ? 'bg-amber-400' :
                            'bg-neutral-300';
  return <span className={cn('inline-block w-2 h-2 rounded-full shrink-0', cls)} title={`Priority: ${priority}`} />;
}

// ─── Resolve Modal ────────────────────────────────────────────

interface ResolveModalProps {
  action: 'resolved' | 'dismissed' | 'investigating';
  onConfirm: (notes: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function ResolveModal({ action, onConfirm, onCancel, isLoading }: ResolveModalProps) {
  const [notes, setNotes] = useState('');
  const requiresNotes = action !== 'investigating';

  const config = {
    resolved:      { title: 'Resolve report', label: 'Resolve', cls: 'bg-green-600 hover:bg-green-700' },
    dismissed:     { title: 'Dismiss report', label: 'Dismiss', cls: 'bg-neutral-600 hover:bg-neutral-700' },
    investigating: { title: 'Mark as investigating', label: 'Confirm', cls: 'bg-blue-600 hover:bg-blue-700' },
  }[action];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-base font-semibold text-neutral-900 mb-4">{config.title}</h3>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Notes{requiresNotes ? '' : ' (optional)'}
          </label>
          <textarea
            rows={3}
            placeholder={requiresNotes ? 'Enter resolution notes…' : 'Optional notes…'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
            onClick={() => (!requiresNotes || notes.trim()) && onConfirm(notes.trim())}
            disabled={(requiresNotes && !notes.trim()) || isLoading}
            className={cn('px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed', config.cls)}
          >
            {isLoading ? 'Processing…' : config.label}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Report Row ───────────────────────────────────────────────

interface ModalState {
  reportId: string;
  action: 'resolved' | 'dismissed' | 'investigating';
}

interface ReportRowProps {
  report: AdminReport;
  isExpanded: boolean;
  onToggle: () => void;
  onAction: (reportId: string, action: ModalState['action']) => void;
}

function ReportRow({ report, isExpanded, onToggle, onAction }: ReportRowProps) {
  const isOpen = report.status === 'pending' || report.status === 'investigating';
  const targetLink =
    report.targetType === 'listing' ? `/listings/${report.targetId}` :
    report.targetType === 'user'    ? `/users/${report.targetId}` :
    null;

  return (
    <>
      <tr
        className={cn(
          'border-b border-neutral-100 hover:bg-neutral-50 transition-colors cursor-pointer',
          isExpanded && 'bg-neutral-50',
        )}
        onClick={onToggle}
      >
        {/* Priority dot */}
        <td className="py-3 pl-4 pr-2 w-8">
          <PriorityDot priority={report.priority} />
        </td>

        {/* Target type */}
        <td className="py-3 pr-4 w-24">
          <TargetBadge targetType={report.targetType} />
        </td>

        {/* Reason */}
        <td className="py-3 pr-4">
          <p className="text-sm font-medium text-neutral-900 truncate max-w-xs">{report.reason}</p>
          {report.details && (
            <p className="text-xs text-neutral-500 truncate max-w-xs mt-0.5">{report.details}</p>
          )}
        </td>

        {/* Reporter */}
        <td className="py-3 pr-4 w-40">
          <p className="text-sm text-neutral-700 truncate">{report.reporter.displayName}</p>
          <p className="text-xs text-neutral-400 truncate">{report.reporter.email}</p>
        </td>

        {/* Status */}
        <td className="py-3 pr-4 w-32">
          <StatusBadge status={report.status} />
        </td>

        {/* Submitted */}
        <td className="py-3 pr-4 w-28 text-xs text-neutral-500 whitespace-nowrap">
          {formatAgo(report.createdAt)}
        </td>

        {/* Expand toggle */}
        <td className="py-3 pr-4 w-8 text-neutral-400">
          {isExpanded
            ? <ChevronUp className="w-4 h-4" />
            : <ChevronDown className="w-4 h-4" />}
        </td>
      </tr>

      {/* Expanded detail row */}
      {isExpanded && (
        <tr className="border-b border-neutral-200 bg-neutral-50">
          <td colSpan={7} className="px-4 pb-4 pt-1">
            <div className="flex items-start justify-between gap-6">
              {/* Left: full details */}
              <div className="space-y-2 text-sm min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-neutral-500 w-24 shrink-0">Target</span>
                  <span className="text-neutral-700 font-mono text-xs truncate">{report.targetId}</span>
                  {targetLink && (
                    <Link href={targetLink} target="_blank" onClick={(e) => e.stopPropagation()} className="text-primary-500 hover:text-primary-700">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-neutral-500 w-24 shrink-0">Reason</span>
                  <span className="text-neutral-700">{report.reason}</span>
                </div>
                {report.details && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-neutral-500 w-24 shrink-0">Details</span>
                    <span className="text-neutral-700">{report.details}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-neutral-500 w-24 shrink-0">Reporter</span>
                  <span className="text-neutral-700">{report.reporter.displayName}</span>
                  <span className="text-neutral-400 text-xs">{report.reporter.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-neutral-500 w-24 shrink-0">Submitted</span>
                  <span className="text-neutral-700">{formatDate(report.createdAt)}</span>
                </div>
                {report.resolvedAt && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-neutral-500 w-24 shrink-0">Resolution</span>
                    <span className="text-neutral-700">
                      {formatDate(report.resolvedAt)}
                      {report.resolutionNotes && ` — ${report.resolutionNotes}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Right: actions */}
              {isOpen && (
                <div className="flex flex-col gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {report.status === 'pending' && (
                    <button
                      onClick={() => onAction(report.id, 'investigating')}
                      className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap"
                    >
                      Mark investigating
                    </button>
                  )}
                  <button
                    onClick={() => onAction(report.id, 'resolved')}
                    className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={() => onAction(report.id, 'dismissed')}
                    className="px-3 py-1.5 text-xs font-medium text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-md hover:bg-neutral-200 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
] as const;

const TYPE_FILTERS = [
  { value: '', label: 'All types' },
  { value: 'listing', label: 'Listings' },
  { value: 'user', label: 'Users' },
  { value: 'message', label: 'Messages' },
] as const;

// ─── Page ─────────────────────────────────────────────────────

export default function AdminReportsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);

  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'reports', statusFilter, typeFilter, page],
    queryFn: () =>
      api.admin.getReports({
        status: statusFilter || undefined,
        targetType: typeFilter || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    placeholderData: (prev) => prev,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ reportId, action, notes }: { reportId: string; action: string; notes: string }) =>
      api.admin.resolveReport(reportId, action, notes || undefined),
    onSuccess: () => {
      setModal(null);
      setExpandedId(null);
      void qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });

  const handleFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setPage(1);
    setExpandedId(null);
  };

  const handleTypeChange = (newType: string) => {
    setTypeFilter(newType);
    setPage(1);
    setExpandedId(null);
  };

  const reports = data?.data ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination ? Math.ceil(pagination.total / PAGE_SIZE) : 1;

  return (
    <>
      {modal && (
        <ResolveModal
          action={modal.action}
          isLoading={resolveMutation.isPending}
          onConfirm={(notes) => resolveMutation.mutate({ reportId: modal.reportId, action: modal.action, notes })}
          onCancel={() => setModal(null)}
        />
      )}

      <div className="space-y-4">
        {/* Filter bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Status chips */}
          <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleFilterChange(value)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                  statusFilter === value
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Type filter */}
            <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1">
              {TYPE_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleTypeChange(value)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                    typeFilter === value
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {pagination && (
              <span className="text-sm text-neutral-500 whitespace-nowrap">
                {pagination.total.toLocaleString()} report{pagination.total !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Active filter summary */}
        {(statusFilter || typeFilter) && (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>Showing:</span>
            {statusFilter && <StatusBadge status={statusFilter} />}
            {typeFilter && <TargetBadge targetType={typeFilter} />}
            {(statusFilter !== 'pending' || typeFilter) && (
              <button
                onClick={() => { setStatusFilter('pending'); setTypeFilter(''); setPage(1); }}
                className="flex items-center gap-0.5 text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <X className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        )}

        {/* Table */}
        <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
          {isError ? (
            <div className="p-8 text-center text-sm text-red-600">
              Failed to load reports. Please refresh.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="py-2.5 pl-4 pr-2 w-8" />
                  <th className="py-2.5 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide w-24">Type</th>
                  <th className="py-2.5 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide">Reason</th>
                  <th className="py-2.5 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide w-40">Reporter</th>
                  <th className="py-2.5 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide w-32">Status</th>
                  <th className="py-2.5 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide w-28">Submitted</th>
                  <th className="py-2.5 pr-4 w-8" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-neutral-100">
                      <td className="py-3 pl-4 pr-2">
                        <div className="w-2 h-2 rounded-full bg-neutral-200 animate-pulse" />
                      </td>
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="py-3 pr-4">
                          <div className="h-4 bg-neutral-200 rounded animate-pulse" style={{ width: j === 2 ? '80%' : '60%' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : reports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-neutral-500">
                      No reports found{statusFilter ? ` with status "${statusFilter}"` : ''}{typeFilter ? ` for type "${typeFilter}"` : ''}.
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <ReportRow
                      key={report.id}
                      report={report}
                      isExpanded={expandedId === report.id}
                      onToggle={() => setExpandedId((id) => (id === report.id ? null : report.id))}
                      onAction={(reportId, action) => setModal({ reportId, action })}
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
