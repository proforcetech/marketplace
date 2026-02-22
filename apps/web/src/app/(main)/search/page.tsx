'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { SlidersHorizontal, Grid, List, Map, X, MapPin, Bookmark } from 'lucide-react';
import { api } from '@/lib/api';
import LocationSearch from '@/components/LocationSearch';

const MapView = dynamic(() => import('./MapView'), { ssr: false });

interface ListingResult {
  id: string;
  title: string;
  price: number | null;
  priceType: string;
  condition: string | null;
  city: string | null;
  state: string | null;
  distanceMiles: number | null;
  createdAt: string;
  isPromoted: boolean;
  latitude?: number;
  longitude?: number;
  media: Array<{ thumbnailUrl: string }>;
  category: { name: string };
}

function SkeletonCard(): JSX.Element {
  return (
    <div className="animate-pulse rounded-xl overflow-hidden border border-gray-100">
      <div className="bg-gray-200 aspect-[4/3] w-full" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  );
}

export default function SearchPage(): JSX.Element {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [listings, setListings] = useState<ListingResult[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [layout, setLayout] = useState<'grid' | 'list' | 'map'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const sortBy = searchParams.get('sort') ?? 'newest';
  const locationCity = searchParams.get('city') ?? '';
  const locationState = searchParams.get('state') ?? '';
  const locationDisplay = [locationCity, locationState].filter(Boolean).join(', ');

  const lat = parseFloat(searchParams.get('lat') ?? '0') || 0;
  const lng = parseFloat(searchParams.get('lng') ?? '0') || 0;
  const radiusMiles = parseFloat(searchParams.get('radiusMiles') ?? '25') || 25;

  const fetchListings = useCallback(
    async (replace = true) => {
      setIsLoading(true);
      try {
        const result = await api.search.search({
          q: q || undefined,
          categorySlug: category || undefined,
          sortBy: sortBy as 'newest' | 'distance' | 'price_asc' | 'price_desc',
          cursor: replace ? undefined : (cursor ?? undefined),
          limit: layout === 'map' ? 100 : 20,
        });
        const data = result as {
          items: ListingResult[];
          total: number;
          nextCursor: string | null;
        };
        setListings((prev) => (replace ? data.items : [...prev, ...data.items]));
        setTotal(data.total);
        setCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    },
    [q, category, sortBy, cursor, layout],
  );

  useEffect(() => {
    void fetchListings(true);
  }, [q, category, sortBy]); // eslint-disable-line

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry?.isIntersecting && hasMore && !isLoading && layout !== 'map')
        void fetchListings(false);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, isLoading, fetchListings, layout]);

  const setSort = (s: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', s);
    router.push(`/search?${params.toString()}`);
  };

  const handleSaveSearch = async () => {
    if (saveStatus !== 'idle') return;
    setSaveStatus('saving');
    try {
      const query: Record<string, unknown> = {};
      if (q) query['query'] = q;
      if (category) query['category'] = category;
      if (searchParams.get('lat')) query['lat'] = searchParams.get('lat');
      if (searchParams.get('lng')) query['lng'] = searchParams.get('lng');
      if (searchParams.get('city')) query['city'] = searchParams.get('city');
      if (searchParams.get('state')) query['state'] = searchParams.get('state');
      await api.savedSearches.create({ name: q || 'Saved search', query, notify: true });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('idle');
    }
  };

  const handleSearchThisArea = useCallback(
    (center: { lat: number; lng: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('lat', String(center.lat));
      params.set('lng', String(center.lng));
      router.push(`/search?${params.toString()}`);
      void fetchListings(true);
    },
    [searchParams, router, fetchListings],
  );

  const formatPrice = (price: number | null, type: string) => {
    if (!price || type === 'free') return 'Free';
    return `$${price.toLocaleString()}${type === 'hourly' ? '/hr' : ''}`;
  };

  const mapListings = listings
    .filter(
      (l): l is ListingResult & { latitude: number; longitude: number } =>
        l.latitude != null && l.longitude != null,
    )
    .map((l) => ({
      id: l.id,
      title: l.title,
      price: l.price,
      priceType: l.priceType,
      latitude: l.latitude,
      longitude: l.longitude,
      isPromoted: l.isPromoted,
      thumbnailUrl: l.media[0]?.thumbnailUrl ?? null,
    }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {isLoading
              ? 'Searching...'
              : `${total.toLocaleString()} listing${total !== 1 ? 's' : ''}${q ? ` for "${q}"` : ''}`}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <MapPin className="w-3.5 h-3.5" />
              Near: {locationDisplay || 'All locations'}
            </span>
            <button
              onClick={() => setShowLocationSearch((v) => !v)}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              {showLocationSearch ? 'Cancel' : 'Change'}
            </button>
          </div>
          {showLocationSearch && (
            <div className="mt-2 max-w-sm">
              <LocationSearch
                placeholder="Search location..."
                defaultValue={locationDisplay}
                onSelect={(loc) => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('city', loc.city);
                  params.set('state', loc.state);
                  params.set('lat', String(loc.lat));
                  params.set('lng', String(loc.lng));
                  setShowLocationSearch(false);
                  router.push(`/search?${params.toString()}`);
                }}
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void handleSaveSearch()}
            disabled={saveStatus !== 'idle'}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${saveStatus === 'saved' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
            aria-label="Save this search"
          >
            <Bookmark
              className={`w-4 h-4 ${saveStatus === 'saved' ? 'fill-blue-600 text-blue-600' : ''}`}
            />
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved!' : 'Save search'}
          </button>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 lg:hidden"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
          >
            <option value="newest">Newest first</option>
            <option value="distance">Closest first</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setLayout('grid')}
              className={`p-2 ${layout === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}
              aria-label="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout('list')}
              className={`p-2 ${layout === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout('map')}
              className={`p-2 ${layout === 'map' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}
              aria-label="Map view"
            >
              <Map className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {layout === 'map' ? (
        /* Map view — full height, no sidebar */
        <div className="h-[calc(100vh-200px)] rounded-xl overflow-hidden border border-gray-200">
          {lat && lng ? (
            <MapView
              listings={mapListings}
              searchCenter={{ lat, lng }}
              radiusMiles={radiusMiles}
              onSearchThisArea={handleSearchThisArea}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-lg mb-1">No location set</p>
                <p className="text-sm">Use the location search above to set a search area</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Filter sidebar - desktop always visible, mobile toggleable */}
          <aside className={`${showFilters ? 'block' : 'hidden'} lg:block w-full lg:w-56 shrink-0`}>
            <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-5">
              <div className="flex items-center justify-between lg:hidden">
                <span className="font-semibold text-gray-900">Filters</span>
                <button onClick={() => setShowFilters(false)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Price range</h3>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-400"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Condition</h3>
                {['new', 'like_new', 'good', 'fair', 'poor'].map((c) => (
                  <label key={c} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600" />
                    <span className="text-sm capitalize text-gray-600">{c.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Posted within</h3>
                <select className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm outline-none">
                  <option>Any time</option>
                  <option>Last 24 hours</option>
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                </select>
              </div>
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {isLoading && listings.length === 0 ? (
              <div
                className={`grid gap-4 ${layout === 'grid' ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : listings.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <p className="text-xl mb-2">No listings found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div
                className={`grid gap-4 ${layout === 'grid' ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}
              >
                {listings.map((l) => (
                  <Link
                    key={l.id}
                    href={`/listings/${l.id}`}
                    className="group rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow bg-white"
                  >
                    {layout === 'grid' ? (
                      <>
                        <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                          {l.media[0] ? (
                            <img
                              src={l.media[0].thumbnailUrl}
                              alt={l.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">
                              📷
                            </div>
                          )}
                          {l.isPromoted && (
                            <span className="absolute top-2 left-2 bg-amber-400 text-amber-900 text-xs font-semibold px-2 py-0.5 rounded">
                              Sponsored
                            </span>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="font-semibold text-gray-900 truncate">{l.title}</p>
                          <p className="text-blue-600 font-medium text-sm mt-0.5">
                            {formatPrice(l.price, l.priceType)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {[l.city, l.state].filter(Boolean).join(', ')}
                            {l.distanceMiles ? ` · ${l.distanceMiles.toFixed(1)} mi` : ''}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="flex gap-4 p-4">
                        <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                          {l.media[0] && (
                            <img
                              src={l.media[0].thumbnailUrl}
                              alt={l.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{l.title}</p>
                          <p className="text-blue-600 font-medium text-sm">
                            {formatPrice(l.price, l.priceType)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {l.category.name} · {[l.city, l.state].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
            <div ref={sentinelRef} className="h-4" />
            {isLoading && listings.length > 0 && (
              <p className="text-center text-sm text-gray-400 py-4">Loading more…</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
