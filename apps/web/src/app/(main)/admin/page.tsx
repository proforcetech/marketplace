'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Package, Clock, Flag, CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface Stats { totalUsers: number; totalListings: number; pendingReview: number; openReports: number; activePromos: number }
interface QueueItem { id: string; title: string; user: { displayName: string; email: string }; createdAt: string }
interface Report { id: string; targetType: string; reason: string; reporter: { displayName: string }; createdAt: string }

export default function AdminPage(): JSX.Element {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<Stats | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const r = user as unknown as { role?: string } | null;
    if (user && r?.role !== 'admin' && r?.role !== 'super_admin') router.push('/');
  }, [user, router]);

  useEffect(() => {
    Promise.all([
      api.admin.getDashboard(),
      api.admin.getModerationQueue(),
      api.admin.getReports(),
    ]).then(([s, q, r]) => {
      setStats((s as unknown as { data: Stats }).data);
      setQueue(((q as unknown as { data: QueueItem[] }).data ?? []).slice(0, 5));
      setReports(((r as unknown as { data: Report[] }).data ?? []).slice(0, 5));
    }).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  const approve = async (id: string) => {
    await api.admin.approveListing(id);
    setQueue((q) => q.filter((i) => i.id !== id));
    setStats((s) => s ? { ...s, pendingReview: s.pendingReview - 1 } : s);
  };

  const reject = async (id: string) => {
    await api.admin.rejectListing(id, 'Rejected by admin');
    setQueue((q) => q.filter((i) => i.id !== id));
    setStats((s) => s ? { ...s, pendingReview: s.pendingReview - 1 } : s);
  };

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>;

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Active Listings', value: stats?.totalListings ?? 0, icon: Package, color: 'text-green-600 bg-green-50' },
    { label: 'Pending Review', value: stats?.pendingReview ?? 0, icon: Clock, color: 'text-amber-600 bg-amber-50' },
    { label: 'Open Reports', value: stats?.openReports ?? 0, icon: Flag, color: 'text-red-600 bg-red-50' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-xl p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-6 h-6" /></div>
            <div><p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p><p className="text-sm text-gray-500">{label}</p></div>
          </div>
        ))}
      </div>

      {/* Moderation queue */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Moderation Queue</h2>
          <span className="text-sm text-gray-400">{stats?.pendingReview ?? 0} pending</span>
        </div>
        {queue.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-sm">All clear!</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {queue.map((item) => (
              <div key={item.id} className="px-6 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.title}</p>
                  <p className="text-sm text-gray-400">{item.user.displayName} · {new Date(item.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => approve(item.id)} className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 text-sm font-medium rounded-lg hover:bg-green-100">
                    <CheckCircle className="w-3.5 h-3.5" />Approve
                  </button>
                  <button onClick={() => reject(item.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100">
                    <XCircle className="w-3.5 h-3.5" />Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reports */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Reports</h2>
        </div>
        {reports.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-sm">No open reports</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {reports.map((r) => (
              <div key={r.id} className="px-6 py-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 capitalize">{r.targetType} · {r.reason}</p>
                  <p className="text-sm text-gray-400">by {r.reporter.displayName} · {new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">pending</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
