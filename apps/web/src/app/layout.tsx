import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '@marketplace/ui/globals.css';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'Marketplace - Find Great Deals Nearby',
    template: '%s | Marketplace',
  },
  description:
    'Browse thousands of local listings. Buy, sell, and discover great deals within your neighborhood. Cars, furniture, housing, services, and more.',
  keywords: [
    'marketplace',
    'buy',
    'sell',
    'local',
    'classifieds',
    'deals',
    'used',
    'for sale',
    'nearby',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Marketplace',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-dvh bg-surface-base text-[var(--text-primary)] font-sans antialiased">
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
