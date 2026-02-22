import Link from 'next/link';
import {
  Car,
  Home,
  Building2,
  ShoppingBag,
  Wrench,
  Briefcase,
  Users,
  PawPrint,
  Search,
  MessageCircle,
  Handshake,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'automotive', label: 'Automotive', icon: Car, color: 'bg-blue-50 text-blue-600' },
  { id: 'housing', label: 'Housing', icon: Home, color: 'bg-green-50 text-green-600' },
  { id: 'real-estate', label: 'Real Estate', icon: Building2, color: 'bg-purple-50 text-purple-600' },
  { id: 'for-sale', label: 'For Sale', icon: ShoppingBag, color: 'bg-orange-50 text-orange-600' },
  { id: 'services', label: 'Services', icon: Wrench, color: 'bg-yellow-50 text-yellow-600' },
  { id: 'jobs', label: 'Jobs', icon: Briefcase, color: 'bg-red-50 text-red-600' },
  { id: 'community', label: 'Community', icon: Users, color: 'bg-indigo-50 text-indigo-600' },
  { id: 'pets', label: 'Pets', icon: PawPrint, color: 'bg-pink-50 text-pink-600' },
];

const HOW_IT_WORKS = [
  { icon: Search, title: 'Search Nearby', desc: 'Set your location and radius to find deals in your neighborhood.' },
  { icon: MessageCircle, title: 'Connect Safely', desc: 'Message sellers through our secure in-app chat.' },
  { icon: Handshake, title: 'Make a Deal', desc: 'Meet locally, exchange safely, and leave a rating.' },
];

export default function HomePage(): JSX.Element {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Find great deals near you</h1>
          <p className="text-blue-100 text-lg mb-10">
            Buy and sell locally — cars, homes, services, and more within miles of you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
            <input
              type="text"
              placeholder="Search listings..."
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 text-base outline-none"
            />
            <Link
              href="/search"
              className="bg-white text-blue-700 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Search
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-6xl mx-auto px-4 py-14 w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {CATEGORIES.map(({ id, label, icon: Icon, color }) => (
            <Link
              key={id}
              href={`/search?category=${id}`}
              className="flex flex-col items-center gap-3 p-5 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all group"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-10">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center relative">
                  <Icon className="w-7 h-7 text-blue-600" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 px-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to sell?</h2>
        <p className="text-gray-500 mb-6">Create a free listing and reach buyers in your area.</p>
        <Link
          href="/listings/new"
          className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Start selling today
        </Link>
      </section>
    </div>
  );
}
