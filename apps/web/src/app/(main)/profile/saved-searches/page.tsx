'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, BellOff, Trash2, Search, ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface SavedSearch {
  id: string;
  name: string | null;
  query: Record<string, unknown>;
  notify: boolean;
  lastNotifiedAt: string | null;
  createdAt: string;
}

function buildSearchUrl(query: Record<string, unknown>): string {
  const params = new URLSearchParams();
  if (query['query']) params.set('q', String(query['query']));
  if (query['category']) params.set('category', String(query['category']));
  if (query['city']) params.set('city', String(query['city']));
  if (query['state']) params.set('state', String(query['state']));
  if (query['lat']) params.set('lat', String(query['lat']));
  if (query['lng']) params.set('lng', String(query['lng']));
  return `/search?${params.toString()}`;
}

function describeSearch(query: Record<string, unknown>): string {
  const parts: string[] = [];
  if (query['query']) parts.push(`"${query['query']}"`);
  if (query['category']) parts.push(String(query['category']));
  if (query['city'] || query['state']) {
    parts.push([query['city'], query['state']].filter(Boolean).join(', '));
  }
  return parts.length > 0 ? parts.join(' · ') : 'All listings';
}

export default function SavedSearchesPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['saved-searches'],
    queryFn: async () => {
      const res = await api.savedSearches.list();
      return (res as unknown as { data: SavedSearch[] }).data ?? [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.savedSearches.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, notify }: { id: string; notify: boolean }) =>
      api.savedSearches.toggleNotify(id, notify),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });

  const searches = data ?? [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Saved Searches</h1>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Save your searches to quickly re-run them and get notified when new listings match.
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : searches.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-medium">No saved searches yet</p>
          <p className="text-sm mt-1">
            Go to{' '}
            <Link href="/search" className="text-blue-600 hover:underline">
              search
            </Link>{' '}
            and click &quot;Save search&quot; to save your first one.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {searches.map((s) => (
            <li key={s.id} className="flex items-center gap-4 p-4 bg-white hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <Link
                  href={buildSearchUrl(s.query)}
                  className="font-medium text-gray-900 hover:text-blue-600 truncate block"
                >
                  {s.name ?? describeSearch(s.query)}
                </Link>
                <p className="text-xs text-gray-400 mt-0.5">
                  {describeSearch(s.query)}
                  {s.lastNotifiedAt && (
                    <> · Last alert {new Date(s.lastNotifiedAt).toLocaleDateString()}</>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleMutation.mutate({ id: s.id, notify: !s.notify })}
                  disabled={toggleMutation.isPending}
                  title={s.notify ? 'Disable notifications' : 'Enable notifications'}
                  className={`p-2 rounded-lg transition-colors ${
                    s.notify
                      ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                      : 'text-gray-400 hover:bg-gray-100'
                  }`}
                >
                  {s.notify ? (
                    <Bell className="w-4 h-4" />
                  ) : (
                    <BellOff className="w-4 h-4" />
                  )}
                </button>

                <button
                  onClick={async () => {
                    setDeletingId(s.id);
                    await deleteMutation.mutateAsync(s.id);
                    setDeletingId(null);
                  }}
                  disabled={deletingId === s.id}
                  title="Delete saved search"
                  className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-gray-400 text-center mt-6">
        You can save up to 20 searches. Alerts are sent once daily for new matches.
      </p>
    </div>
  );
}
