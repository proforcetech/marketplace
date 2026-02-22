import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, Clock, Flag } from 'lucide-react';
import { api } from '@/lib/api';
import MessageButton from './MessageButton';
import RatingTrigger from './RatingTrigger';
import OfferButton from './OfferButton';

interface PageProps { params: { id: string } }

function formatPrice(price: number | null, type: string): string {
  if (!price || type === 'free') return 'Free';
  const formatted = `$${price.toLocaleString()}`;
  if (type === 'hourly') return `${formatted}/hr`;
  if (type === 'obo') return `${formatted} OBO`;
  return formatted;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function ListingDetailPage({ params }: PageProps): Promise<JSX.Element> {
  let listing: Awaited<ReturnType<typeof api.listings.getById>>;
  try {
    listing = await api.listings.getById(params.id);
  } catch {
    notFound();
  }

  const l = listing as unknown as {
    id: string; title: string; description: string; price: number | null; priceType: string;
    condition: string | null; status: string; city: string | null; state: string | null;
    createdAt: string; isPromoted: boolean;
    media: Array<{ url: string; thumbnailUrl: string }>;
    category: { id: string; name: string };
    user: { id: string; displayName: string; avatarUrl: string | null; ratingAvg: number; ratingCount: number; identityVerified: boolean; createdAt: string };
    fieldValues: Array<{ field: { label: string }; value: string }>;
  };

  const mainImage = l.media[0]?.url;
  const thumbnails = l.media.slice(0, 8);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: images */}
        <div className="flex-1">
          <div className="aspect-[4/3] bg-gray-100 rounded-2xl overflow-hidden mb-3">
            {mainImage ? (
              <img src={mainImage} alt={l.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 text-6xl">📷</div>
            )}
          </div>
          {thumbnails.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {thumbnails.map((m, i) => (
                <div key={i} className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 border-transparent hover:border-blue-400 cursor-pointer">
                  <img src={m.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: details */}
        <div className="lg:w-96 shrink-0 space-y-6">
          {/* Title & price */}
          <div>
            {l.isPromoted && (
              <span className="inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded mb-2">Sponsored</span>
            )}
            <h1 className="text-2xl font-bold text-gray-900">{l.title}</h1>
            <p className="text-3xl font-bold text-blue-600 mt-1">{formatPrice(l.price, l.priceType)}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
              {l.condition && <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 capitalize">{l.condition.replace('_', ' ')}</span>}
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{timeAgo(l.createdAt)}</span>
              {(l.city || l.state) && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{[l.city, l.state].filter(Boolean).join(', ')}</span>}
            </div>
          </div>

          {/* Seller card */}
          <div className="border border-gray-100 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center text-blue-600 font-bold text-lg">
                {l.user.avatarUrl ? <img src={l.user.avatarUrl} alt="" className="w-full h-full object-cover" /> : l.user.displayName[0]}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-gray-900">{l.user.displayName}</p>
                  {l.user.identityVerified && <span className="text-blue-500 text-xs">✓ Verified</span>}
                </div>
                <p className="text-xs text-gray-400">
                  {l.user.ratingCount > 0 ? `${l.user.ratingAvg.toFixed(1)} ★ (${l.user.ratingCount})` : 'No ratings yet'}
                </p>
              </div>
            </div>
            <MessageButton listingId={l.id} sellerId={l.user.id} />
            {l.priceType !== 'free' && (
              <OfferButton
                listingId={l.id}
                listingTitle={l.title}
                sellerId={l.user.id}
              />
            )}
            <RatingTrigger
              listingId={l.id}
              listingTitle={l.title}
              sellerId={l.user.id}
              sellerName={l.user.displayName}
              listingStatus={l.status}
            />
            <Link href={`/users/${l.user.id}`} className="block text-center text-sm text-blue-600 mt-2 hover:underline">
              View profile
            </Link>
          </div>

          {/* Category fields */}
          {l.fieldValues.length > 0 && (
            <div className="border border-gray-100 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Details</h3>
              <dl className="space-y-2">
                {l.fieldValues.map((fv) => (
                  <div key={fv.field.label} className="flex justify-between text-sm">
                    <dt className="text-gray-500">{fv.field.label}</dt>
                    <dd className="font-medium text-gray-900">{fv.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <button className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors">
            <Flag className="w-3.5 h-3.5" />
            Report this listing
          </button>
        </div>
      </div>

      {/* Description */}
      {l.description && (
        <div className="mt-8 border-t border-gray-100 pt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
          <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{l.description}</p>
        </div>
      )}
    </div>
  );
}
