'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, ShoppingBag, Shield, Flag, Megaphone } from 'lucide-react';
import api, { type ModerationQueueItem, type AdminReport } from '@/lib/api';

// ─── Stat Card ────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | undefined;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'amber' | 'red' | 'purple';
  href?: string;
  loading?: boolean;
}

const colorMap = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', value: 'text-blue-900' },
  green: { bg: 'bg-green-50', text: 'text-green-600', value: 'text-green-900' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', value: 'text-amber-900' },
  red: { bg: 'bg-red-50', text: 'text-red-600', value: 'text-red-900' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', value: 'text-purple-900' },
};

function StatCard({ label, value, icon: Icon, color, href, loading }: StatCardProps) {
  const c = colorMap[color];
  const card = (
    <div className={`bg-white border border-neutral-200 rounded-lg p-4 shadow-sm flex items-center gap-4 ${href ? 'hover:shadow-md transition-shadow cursor-pointer' : ''}`}>
      <div className={`w-12 h-12 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-6 h-6 ${c.text}`} />
      </div>
      <div>
        <p className="text-sm text-neutral-500">{label}</p>
        {loading ? (
          <div className="h-8 w-16 bg-neutral-200 rounded animate-pulse mt-1" />
        ) : (
          <p className={`text-3xl font-bold ${c.value}`}>{value ?? 0}</p>
        )}
      </div>
    </div>
  );
  if (href) return <Link href={href}>{card}</Link>;
  return card;
}

// ─── Moderation Row ───────────────────────────────────────────

function ModerationRow({ item, onApprove, onReject }: {
  item: ModerationQueueItem;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const thumb = item.media[0]?.thumbnailUrl ?? item.media[0]?.url;
  const ago = formatAgo(item.createdAt);

  return (
    <div className="flex items-center gap-3 py-3 border-b border-neutral-100 last:border-0">
      <div className="w-12 h-12 rounded-md bg-neutral-100 shrink-0 overflow-hidden">
        {thumb ? (
          <img src={thumb} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">No img</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 truncate">{item.title}</p>
        <p className="text-xs text-neutral-500">{item.user.displayName} · {ago}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onApprove(item.id)}
          className="px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100 transition-colors"
        >
          Approve
        </button>
        <button
          onClick={() => onReject(item.id)}
          className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

// ─── Report Row ───────────────────────────────────────────────

function ReportRow({ report }: { report: AdminReport }) {
  const ago = formatAgo(report.createdAt);
  return (
    <div className="flex items-center gap-3 py-3 border-b border-neutral-100 last:border-0">
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-700 capitalize shrink-0">
        {report.targetType}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-800 truncate">{report.reason}</p>
        <p className="text-xs text-neutral-500">{report.reporter.displayName} · {ago}</p>
      </div>
      <Link href="/admin/reports" className="text-xs text-primary-600 hover:underline shrink-0">
        View →
      </Link>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function formatAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Page ─────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const qc = useQueryClient();

  const { data: dashData, isLoading: dashLoading, error: dashError } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api.admin.getDashboard(),
  });

  const { data: queueData, isLoading: queueLoading } = useQuery({
    queryKey: ['admin', 'moderation-queue', 1, 5],
    queryFn: () => api.admin.getModerationQueue({ page: 1, limit: 5 }),
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['admin', 'reports', 'pending', 1, 5],
    queryFn: () => api.admin.getReports({ status: 'pending', page: 1, limit: 5 }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.admin.approveListing(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'moderation-queue'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => {
      const reason = window.prompt('Rejection reason:') ?? 'Policy violation';
      return api.admin.rejectListing(id, reason);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      void qc.invalidateQueries({ queryKey: ['admin', 'moderation-queue'] });
    },
  });

  const stats = dashData?.data;

  if (dashError) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
        Failed to load dashboard data. Please try refreshing.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard label="Total Users" value={stats?.totalUsers} icon={Users} color="blue" loading={dashLoading} />
        <StatCard label="Active Listings" value={stats?.totalListings} icon={ShoppingBag} color="green" loading={dashLoading} />
        <StatCard label="Pending Review" value={stats?.pendingReview} icon={Shield} color="amber" href="/admin/moderation" loading={dashLoading} />
        <StatCard label="Open Reports" value={stats?.openReports} icon={Flag} color="red" href="/admin/reports" loading={dashLoading} />
        <StatCard label="Active Promos" value={stats?.activePromos} icon={Megaphone} color="purple" loading={dashLoading} />
      </div>

      {/* Two-column lower section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Moderation queue preview */}
        <div className="bg-white border border-neutral-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="font-semibold text-neutral-900">Moderation Queue</h2>
            <Link href="/admin/moderation" className="text-sm text-primary-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="px-4 pb-4">
            {queueLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 bg-neutral-100 rounded animate-pulse" />
                ))}
              </div>
            ) : queueData?.data.length === 0 ? (
              <p className="text-sm text-neutral-500 py-4 text-center">No listings pending review.</p>
            ) : (
              queueData?.data.map((item) => (
                <ModerationRow
                  key={item.id}
                  item={item}
                  onApprove={(id) => approveMutation.mutate(id)}
                  onReject={(id) => rejectMutation.mutate(id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Pending reports preview */}
        <div className="bg-white border border-neutral-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="font-semibold text-neutral-900">Pending Reports</h2>
            <Link href="/admin/reports" className="text-sm text-primary-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="px-4 pb-4">
            {reportsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 bg-neutral-100 rounded animate-pulse" />
                ))}
              </div>
            ) : reportsData?.data.length === 0 ? (
              <p className="text-sm text-neutral-500 py-4 text-center">No pending reports.</p>
            ) : (
              reportsData?.data.map((report) => (
                <ReportRow key={report.id} report={report} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
