import { notFound } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface PageProps { params: { id: string } }

export default async function PublicProfilePage({ params }: PageProps): Promise<JSX.Element> {
  let profile: unknown;
  try { profile = await api.users.getPublicProfile(params.id); }
  catch { notFound(); }

  const p = profile as { id: string; displayName: string; avatarUrl: string | null; bio: string | null; locationCity: string | null; locationState: string | null; ratingAvg: number; ratingCount: number; responseRate: number; identityVerified: boolean; createdAt: string; listingCount: number };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile header */}
      <div className="flex items-start gap-5 mb-8">
        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold overflow-hidden shrink-0">
          {p.avatarUrl ? <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" /> : p.displayName[0]}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{p.displayName}</h1>
            {p.identityVerified && <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">✓ Verified</span>}
          </div>
          {p.bio && <p className="text-gray-500 text-sm mt-1">{p.bio}</p>}
          {(p.locationCity || p.locationState) && (
            <p className="text-sm text-gray-400 mt-1">📍 {[p.locationCity, p.locationState].filter(Boolean).join(', ')}</p>
          )}
          <div className="flex gap-5 mt-3 text-sm">
            <span className="text-gray-600"><span className="font-semibold text-gray-900">{p.ratingAvg > 0 ? p.ratingAvg.toFixed(1) : '—'}</span> rating ({p.ratingCount})</span>
            <span className="text-gray-600"><span className="font-semibold text-gray-900">{p.responseRate}%</span> response rate</span>
            <span className="text-gray-600"><span className="font-semibold text-gray-900">{p.listingCount}</span> active listings</span>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-100 pt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active listings</h2>
        <Link href={`/search?seller=${p.id}`} className="text-sm text-blue-600 hover:underline">View all listings →</Link>
      </div>
    </div>
  );
}
