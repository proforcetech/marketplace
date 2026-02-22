import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8">
        <Link href="/" className="text-2xl font-bold text-blue-600">
          Marketplace
        </Link>
      </div>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {children}
      </div>
    </div>
  );
}
