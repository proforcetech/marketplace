'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

const STEPS = ['Details', 'Pricing', 'Location', 'Review'];
const PRICE_TYPES = [
  { value: 'fixed', label: 'Fixed price' },
  { value: 'obo', label: 'OBO' },
  { value: 'free', label: 'Free' },
  { value: 'hourly', label: 'Hourly' },
];
const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

interface PageProps { params: { id: string } }

export default function EditListingPage({ params }: PageProps): JSX.Element {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', price: '', priceType: 'fixed', condition: 'good', city: '', state: '',
  });

  useEffect(() => { if (!isAuthenticated) router.push('/login'); }, [isAuthenticated, router]);

  useEffect(() => {
    api.listings.getById(params.id)
      .then((res) => {
        const l = res as unknown as { title: string; description: string; price: number | null; priceType: string; condition: string | null; city: string | null; state: string | null };
        setForm({
          title: l.title,
          description: l.description ?? '',
          price: l.price ? String(Math.round(l.price / 100)) : '',
          priceType: l.priceType,
          condition: l.condition ?? 'good',
          city: l.city ?? '',
          state: l.state ?? '',
        });
      })
      .catch(() => router.push('/profile'))
      .finally(() => setIsLoading(false));
  }, [params.id, router]);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async (): Promise<void> => {
    setIsSubmitting(true);
    setError(null);
    try {
      await api.listings.update(params.id, {
        title: form.title,
        description: form.description,
        price: form.price ? parseInt(form.price) * 100 : undefined,
        priceType: form.priceType as 'fixed' | 'obo' | 'free' | 'hourly',
        condition: form.condition as 'new' | 'like_new' | 'good' | 'fair' | 'poor',
        location: { city: form.city, state: form.state, lat: 0, lng: 0 },
      });
      router.push(`/listings/${params.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
    );
  }

  const stepContent = [
    // Step 0: Details
    <div key="details" className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Edit details</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={200}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={5}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
        <div className="flex gap-2 flex-wrap">
          {CONDITIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => set('condition', value)}
              className={`px-3 py-1.5 rounded-full text-sm border-2 transition-all ${form.condition === value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>,

    // Step 1: Pricing
    <div key="pricing" className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Update pricing</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Price type</label>
        <div className="grid grid-cols-2 gap-2">
          {PRICE_TYPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => set('priceType', value)}
              className={`py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${form.priceType === value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {form.priceType !== 'free' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
          <input
            type="number"
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            min={0}
          />
        </div>
      )}
    </div>,

    // Step 2: Location
    <div key="location" className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Update location</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => set('city', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <input
            type="text"
            value={form.state}
            onChange={(e) => set('state', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={2}
          />
        </div>
      </div>
    </div>,

    // Step 3: Review
    <div key="review" className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Review changes</h2>
      {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
      <dl className="space-y-3 border border-gray-100 rounded-xl p-4 text-sm">
        {[
          ['Title', form.title],
          ['Price', form.priceType === 'free' ? 'Free' : `$${form.price} (${form.priceType})`],
          ['Condition', form.condition],
          ['Location', [form.city, form.state].filter(Boolean).join(', ')],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between">
            <dt className="text-gray-500">{label}</dt>
            <dd className="font-medium text-gray-900">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>,
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit listing</h1>

      {/* Step indicator */}
      <div className="flex gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`flex-1 h-1.5 rounded-full transition-colors ${i <= step ? 'bg-blue-600' : 'bg-gray-100'}`}
          />
        ))}
      </div>

      <div className="min-h-56">{stepContent[step]}</div>

      <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
        <button
          onClick={() => setStep((s) => Math.max(s - 1, 0))}
          disabled={step === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-30 hover:bg-gray-50"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => Math.min(s + 1, STEPS.length - 1))}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </button>
        )}
      </div>
    </div>
  );
}
