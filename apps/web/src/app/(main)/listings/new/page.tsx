'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import LocationSearch from '@/components/LocationSearch';

const STEPS = ['Category', 'Photos', 'Details', 'Pricing', 'Location', 'Review'];
const CATEGORIES = ['Automotive', 'Housing', 'Real Estate', 'For Sale', 'Services', 'Jobs', 'Community', 'Pets'];
const PRICE_TYPES = [{ value: 'fixed', label: 'Fixed price' }, { value: 'obo', label: 'OBO' }, { value: 'free', label: 'Free' }, { value: 'hourly', label: 'Hourly' }];
const CONDITIONS = [{ value: 'new', label: 'New' }, { value: 'like_new', label: 'Like new' }, { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }, { value: 'poor', label: 'Poor' }];

export default function CreateListingPage(): JSX.Element {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ category: '', photos: [] as File[], title: '', description: '', price: '', priceType: 'fixed', condition: 'good', city: '', state: '', lat: 0, lng: 0 });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!isAuthenticated) router.push('/login'); }, [isAuthenticated, router]);

  const set = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async (): Promise<void> => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await api.listings.create({
        title: form.title,
        description: form.description,
        price: form.price ? parseInt(form.price) * 100 : undefined,
        priceType: form.priceType as 'fixed' | 'obo' | 'free' | 'hourly',
        condition: form.condition as 'new' | 'like_new' | 'good' | 'fair' | 'poor',
        categoryId: form.category,
        location: { city: form.city, state: form.state, lat: form.lat, lng: form.lng },
      });
      const l = result as unknown as { id: string };
      router.push(`/listings/${l.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create listing');
      setIsSubmitting(false);
    }
  };

  const stepContent = [
    // Step 0: Category
    <div key="category" className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Choose a category</h2>
      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map((cat) => (
          <button key={cat} onClick={() => { set('category', cat); next(); }}
            className={`p-4 rounded-xl border-2 text-left font-medium text-sm transition-all ${form.category === cat ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-200'}`}>
            {cat}
          </button>
        ))}
      </div>
    </div>,

    // Step 1: Photos
    <div key="photos" className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Add photos</h2>
      <label className="block border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 transition-colors">
        <input type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => set('photos', Array.from(e.target.files ?? []))} />
        <p className="text-gray-500">📷 Click to upload photos</p>
        <p className="text-xs text-gray-400 mt-1">Up to 10 images, max 10MB each</p>
      </label>
      {form.photos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {form.photos.map((f, i) => (
            <div key={i} className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
              <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>,

    // Step 2: Details
    <div key="details" className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Describe your item</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="What are you selling?" maxLength={200} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={5} placeholder="Describe condition, features, why you're selling…" />
      </div>
    </div>,

    // Step 3: Pricing
    <div key="pricing" className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Set your price</h2>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Price type</label>
        <div className="grid grid-cols-2 gap-2">
          {PRICE_TYPES.map(({ value, label }) => (
            <button key={value} onClick={() => set('priceType', value)}
              className={`py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${form.priceType === value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {form.priceType !== 'free' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
          <input type="number" value={form.price} onChange={(e) => set('price', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0" min={0} />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
        <div className="flex gap-2 flex-wrap">
          {CONDITIONS.map(({ value, label }) => (
            <button key={value} onClick={() => set('condition', value)}
              className={`px-3 py-1.5 rounded-full text-sm border-2 transition-all ${form.condition === value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>,

    // Step 4: Location
    <div key="location" className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Where is the item located?</h2>
      <LocationSearch
        placeholder="Search city or address..."
        defaultValue={[form.city, form.state].filter(Boolean).join(', ')}
        onSelect={(location) => {
          set('city', location.city);
          set('state', location.state);
          set('lat', location.lat);
          set('lng', location.lng);
        }}
      />
      {form.city && (
        <p className="text-sm text-gray-500">
          Selected: <span className="font-medium text-gray-700">{[form.city, form.state].filter(Boolean).join(', ')}</span>
        </p>
      )}
    </div>,

    // Step 5: Review
    <div key="review" className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Review your listing</h2>
      {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
      <dl className="space-y-3 border border-gray-100 rounded-xl p-4">
        {[['Category', form.category], ['Title', form.title], ['Price', form.priceType === 'free' ? 'Free' : `$${form.price} (${form.priceType})`], ['Condition', form.condition], ['Location', [form.city, form.state].filter(Boolean).join(', ')]].map(([label, value]) => (
          <div key={label} className="flex justify-between text-sm">
            <dt className="text-gray-500">{label}</dt>
            <dd className="font-medium text-gray-900">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    </div>,
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${i < step ? 'bg-blue-600 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 mx-1 ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} style={{ width: 24 }} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-64">{stepContent[step]}</div>

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
        <button onClick={prev} disabled={step === 0} className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-30 hover:bg-gray-50">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        {step < STEPS.length - 1 ? (
          <button onClick={next} className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={isSubmitting} className="px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50">
            {isSubmitting ? 'Publishing…' : 'Publish Listing'}
          </button>
        )}
      </div>
    </div>
  );
}
