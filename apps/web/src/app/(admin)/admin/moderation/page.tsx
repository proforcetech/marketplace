'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { CheckCircle, XCircle, Trash2, ChevronLeft, ChevronRight, ExternalLink, AlertTriangle } from 'lucide-react';
import api, { type ModerationQueueItem } from '@/lib/api';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

// ─── Risk Score Badge ─────────────────────────────────────────

function RiskBadge({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  let cls: string;
  let label: string;
  if (pct < 30) {
    cls = 'bg-green-100 text-green-700';
    label = 'Low';
  } else if (pct < 60) {
    cls = 'bg-amber-100 text-amber-700';
    label = 'Medium';
  } else {
    cls = 'bg-red-100 text-red-700';
    label = 'High';
  }
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium', cls)}>
      {pct >= 60 && <AlertTriangle className="w-3 h-3" />}
      {label} ({pct})
    </span>
  );
}

// ─── Reason Modal ─────────────────────────────────────────────

interface ReasonModalProps {
  title: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function ReasonModal({ title, confirmLabel, confirmClass, onConfirm, onCancel, isLoading }: ReasonModalProps) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-base font-semibold text-neutral-900 mb-3">{title}</h3>
        <textarea
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          rows={3}
          placeholder="Enter a reason..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim() || isLoading}
            className={cn(
              'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              confirmClass,
            )}
          >
            {isLoading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Queue Row ────────────────────────────────────────────────

interface QueueRowProps {
  item: ModerationQueueItem;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRemove: (id: string) => void;
  isPending?: boolean;
}

function formatAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function QueueRow({ item, onApprove, onReject, onRemove, isPending }: QueueRowProps) {
  const thumb = item.media[0]?.thumbnailUrl ?? item.media[0]?.url;

  return (
    <tr className={cn('border-b border-neutral-100 hover:bg-neutral-50 transition-colors', isPending && 'opacity-50 pointer-events-none')}>
      {/* Thumbnail */}
      <td className="py-3 pl-4 pr-3 w-16">
        <div className="w-12 h-12 rounded-md bg-neutral-100 overflow-hidden shrink-0">
          {thumb ? (
            <img src={thumb} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">—</div>
          )}
        </div>
      </td>

      {/* Title + seller */}
      <td className="py-3 pr-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-900 truncate max-w-xs">{item.title}</p>
            <p className="text-xs text-neutral-500 mt-0.5">
              <Link href={`/admin/users/${item.user.id}`} className="hover:underline">
                {item.user.displayName}
              </Link>
              {' · '}
              {item.user.email}
            </p>
          </div>
          <Link
            href={`/listings/${item.slug ?? item.id}`}
            target="_blank"
            className="text-neutral-400 hover:text-primary-600 mt-0.5 shrink-0"
            title="View listing"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </td>

      {/* Category */}
      <td className="py-3 pr-4 w-36">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-700">
          {item.category.name}
        </span>
      </td>

      {/* Risk */}
      <td className="py-3 pr-4 w-28">
        <RiskBadge score={item.riskScore ?? 0} />
      </td>

      {/* Submitted */}
      <td className="py-3 pr-4 w-28 text-xs text-neutral-500 whitespace-nowrap">
        {formatAgo(item.createdAt)}
      </td>

      {/* Actions */}
      <td className="py-3 pr-4 w-44">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onApprove(item.id)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
            title="Approve"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Approve
          </button>
          <button
            onClick={() => onReject(item.id)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors"
            title="Reject"
          >
            <XCircle className="w-3.5 h-3.5" />
            Reject
          </button>
          <button
            onClick={() => onRemove(item.id)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
            title="Remove"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────

type ModalState =
  | { type: 'reject'; listingId: string }
  | { type: 'remove'; listingId: string }
  | null;

export default function ModerationQueuePage() {
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState>(null);
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'moderation-queue', page],
    queryFn: () => api.admin.getModerationQueue({ page, limit: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin', 'moderation-queue'] });
    void qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.admin.approveListing(id),
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.admin.rejectListing(id, reason),
    onSuccess: () => {
      setModal(null);
      invalidate();
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.admin.removeListing(id, reason),
    onSuccess: () => {
      setModal(null);
      invalidate();
    },
  });

  const listings = data?.data ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination ? Math.ceil(pagination.total / PAGE_SIZE) : 1;

  return (
    <>
      {/* Reject modal */}
      {modal?.type === 'reject' && (
        <ReasonModal
          title="Reject listing"
          confirmLabel="Reject"
          confirmClass="bg-amber-600 hover:bg-amber-700"
          isLoading={rejectMutation.isPending}
          onConfirm={(reason) => rejectMutation.mutate({ id: modal.listingId, reason })}
          onCancel={() => setModal(null)}
        />
      )}

      {/* Remove modal */}
      {modal?.type === 'remove' && (
        <ReasonModal
          title="Remove listing"
          confirmLabel="Remove"
          confirmClass="bg-red-600 hover:bg-red-700"
          isLoading={removeMutation.isPending}
          onConfirm={(reason) => removeMutation.mutate({ id: modal.listingId, reason })}
          onCancel={() => setModal(null)}
        />
      )}

      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              {pagination ? (
                <>
                  {pagination.total} listing{pagination.total !== 1 ? 's' : ''} pending review
                </>
              ) : (
                'Moderation Queue'
              )}
            </h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Listings are ordered oldest-first. Approve to publish, reject to notify the seller, or remove for policy violations.
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
          {isError ? (
            <div className="p-8 text-center text-sm text-red-600">
              Failed to load moderation queue. Please refresh.
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="py-2.5 pl-4 pr-3 text-xs font-medium text-neutral-500 uppercase tracking-wide w-16" />
                  <th className="py-2.5 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide">Listing</th>
                  <th className="py-2.5 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide w-36">Category</th>
                  <th className="py-2.5 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide w-28">Risk</th>
                  <th className="py-2.5 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide w-28">Submitted</th>
                  <th className="py-2.5 pr-4 text-xs font-medium text-neutral-500 uppercase tracking-wide w-44">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-neutral-100">
                      <td className="py-3 pl-4 pr-3">
                        <div className="w-12 h-12 bg-neutral-200 rounded-md animate-pulse" />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="h-4 bg-neutral-200 rounded animate-pulse w-48 mb-1" />
                        <div className="h-3 bg-neutral-100 rounded animate-pulse w-32" />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="h-5 bg-neutral-200 rounded animate-pulse w-20" />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="h-5 bg-neutral-200 rounded animate-pulse w-16" />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="h-4 bg-neutral-200 rounded animate-pulse w-16" />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="h-7 bg-neutral-200 rounded animate-pulse w-36" />
                      </td>
                    </tr>
                  ))
                ) : listings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-neutral-500">
                      <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                      No listings pending review. Queue is clear!
                    </td>
                  </tr>
                ) : (
                  listings.map((item) => (
                    <QueueRow
                      key={item.id}
                      item={item}
                      isPending={approveMutation.isPending && approveMutation.variables === item.id}
                      onApprove={(id) => approveMutation.mutate(id)}
                      onReject={(id) => setModal({ type: 'reject', listingId: id })}
                      onRemove={(id) => setModal({ type: 'remove', listingId: id })}
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
              Page {page} of {totalPages} ({pagination.total} total)
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
              {/* Page numbers — show at most 5 around current */}
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
