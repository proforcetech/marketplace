'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Camera, Bookmark, Zap, ShieldCheck, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface Profile { id: string; displayName: string; email: string; avatarUrl: string | null; bio: string | null; locationCity: string | null; locationState: string | null; ratingAvg: number; ratingCount: number; responseRate: number; identityVerified: boolean; createdAt: string }

export default function ProfilePage(): JSX.Element {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ displayName: '', bio: '', city: '', state: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { if (!isAuthenticated) router.push('/login'); }, [isAuthenticated, router]);

  useEffect(() => {
    api.users.getMe().then((r) => {
      const p = r as unknown as Profile;
      setProfile(p);
      setForm({ displayName: p.displayName, bio: p.bio ?? '', city: p.locationCity ?? '', state: p.locationState ?? '' });
    }).catch(() => {});
  }, []);

  const save = async () => {
    setIsSaving(true);
    try {
      await api.users.updateProfile({ displayName: form.displayName, bio: form.bio, city: form.city, state: form.state });
      setIsEditing(false);
      if (profile) setProfile({ ...profile, ...form, locationCity: form.city, locationState: form.state });
    } finally { setIsSaving(false); }
  };

  if (!profile) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-white bg-blue-100 text-blue-600 font-bold text-2xl flex items-center justify-center overflow-hidden">
                {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" /> : profile.displayName[0]}
              </div>
              <button className="absolute bottom-0 right-0 w-7 h-7 bg-gray-800 text-white rounded-full flex items-center justify-center">
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <button onClick={() => isEditing ? save() : setIsEditing(true)} disabled={isSaving}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50">
              {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Edit profile'}
            </button>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              {[['displayName', 'Display name', 'text'], ['bio', 'Bio', 'text'], ['city', 'City', 'text'], ['state', 'State', 'text']].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type="text" value={form[key as keyof typeof form]}
                    onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-gray-900">{profile.displayName}</h1>
                {profile.identityVerified && <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">✓ Verified</span>}
              </div>
              {profile.bio && <p className="text-gray-500 text-sm mb-4">{profile.bio}</p>}
              <div className="flex gap-6 text-sm text-gray-500">
                <span><strong className="text-gray-900">{profile.ratingAvg.toFixed(1)}</strong> avg rating</span>
                <span><strong className="text-gray-900">{profile.responseRate}%</strong> response rate</span>
                <span>Member since <strong className="text-gray-900">{new Date(profile.createdAt).getFullYear()}</strong></span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-4 bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
        {[
          { href: '/profile/saved-searches', icon: <Bookmark className="w-4 h-4 text-blue-500" />, label: 'Saved Searches', desc: 'Manage your saved search alerts' },
          { href: '/settings/subscription', icon: <Zap className="w-4 h-4 text-violet-500" />, label: 'Seller Plan', desc: 'View or upgrade your seller plan' },
          { href: '/profile/promotions', icon: <ChevronRight className="w-4 h-4 text-amber-500" />, label: 'Promotions', desc: 'Manage your active promotions' },
          ...(!profile.identityVerified ? [{ href: '/settings/verification', icon: <ShieldCheck className="w-4 h-4 text-green-500" />, label: 'Verify Identity', desc: 'Get a verified badge on your profile' }] : []),
        ].map((item) => (
          <Link key={item.href} href={item.href} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group">
            <span className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-400">{item.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}
