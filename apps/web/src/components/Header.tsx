'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Search,
  Menu,
  X,
  Plus,
  MessageSquare,
  User,
  LogOut,
  ShoppingBag,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@marketplace/ui';
import { NotificationBell } from './NotificationBell';

export function Header(): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  }, [pathname]);

  const handleLogout = async (): Promise<void> => {
    await logout();
    router.push('/');
  };

  const initials = user?.displayName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '';

  return (
    <header className="sticky top-0 z-sticky bg-white border-b border-neutral-200 shadow-xs">
      <div className="container-page flex items-center justify-between h-16">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-primary-500 hover:text-primary-600 no-underline shrink-0"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="text-heading-md text-neutral-900 hidden sm:block">Marketplace</span>
        </Link>

        {/* Desktop: compact search trigger */}
        <button
          type="button"
          onClick={() => router.push('/search')}
          className="hidden lg:flex items-center gap-2 h-10 px-4 mx-8 flex-1 max-w-lg rounded-full border border-neutral-200 bg-neutral-50 text-body-sm text-neutral-400 hover:bg-neutral-100 transition-colors duration-fast"
        >
          <Search size={16} />
          <span>Search cars, furniture, jobs...</span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-2" aria-label="Main navigation">
          <Link
            href="/search"
            className={`px-3 py-2 rounded-md text-body-sm font-medium no-underline transition-colors duration-fast ${
              pathname === '/search'
                ? 'text-primary-600 bg-primary-50'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
            }`}
          >
            Browse
          </Link>

          {isAuthenticated ? (
            <>
              <Link href="/listings/new">
                <Button variant="primary" size="sm" leftIcon={<Plus size={16} />}>
                  Sell
                </Button>
              </Link>

              <Link
                href="/messages"
                className="relative p-2 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors duration-fast no-underline"
                aria-label="Messages"
              >
                <MessageSquare size={20} />
              </Link>

              <NotificationBell />

              {/* Profile dropdown */}
              <div ref={dropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-md hover:bg-neutral-50 transition-colors duration-fast"
                  aria-expanded={profileDropdownOpen}
                  aria-haspopup="true"
                >
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-caption font-medium">
                      {initials}
                    </div>
                  )}
                  <ChevronDown size={14} className="text-neutral-400" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-dropdown animate-scale-in">
                    <div className="px-4 py-2 border-b border-neutral-100">
                      <p className="text-body-sm font-medium text-neutral-900 truncate">
                        {user?.displayName}
                      </p>
                      <p className="text-caption text-neutral-500 truncate">
                        {user?.email}
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-2.5 text-body-sm text-neutral-700 hover:bg-neutral-50 no-underline"
                    >
                      <User size={16} className="text-neutral-400" />
                      My Profile
                    </Link>
                    <Link
                      href="/profile?tab=listings"
                      className="flex items-center gap-3 px-4 py-2.5 text-body-sm text-neutral-700 hover:bg-neutral-50 no-underline"
                    >
                      <ShoppingBag size={16} className="text-neutral-400" />
                      My Listings
                    </Link>
                    <Link
                      href="/messages"
                      className="flex items-center gap-3 px-4 py-2.5 text-body-sm text-neutral-700 hover:bg-neutral-50 no-underline"
                    >
                      <MessageSquare size={16} className="text-neutral-400" />
                      Messages
                    </Link>
                    <div className="border-t border-neutral-100 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-body-sm text-error-600 hover:bg-error-50"
                      >
                        <LogOut size={16} />
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" size="sm">
                  Sign up
                </Button>
              </Link>
            </>
          )}
        </nav>

        {/* Mobile: hamburger */}
        <button
          type="button"
          className="lg:hidden p-2 rounded-md text-neutral-600 hover:bg-neutral-50"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile slide-out drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 top-16 z-overlay bg-neutral-950/50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav
            className="fixed top-16 right-0 bottom-0 z-overlay w-72 bg-white shadow-lg overflow-y-auto animate-slide-in-bottom lg:hidden"
            aria-label="Mobile navigation"
          >
            <div className="p-4 space-y-1">
              <Link
                href="/search"
                className="flex items-center gap-3 px-3 py-3 rounded-md text-body-sm text-neutral-700 hover:bg-neutral-50 no-underline"
              >
                <Search size={18} />
                Browse
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    href="/listings/new"
                    className="flex items-center gap-3 px-3 py-3 rounded-md text-body-sm text-neutral-700 hover:bg-neutral-50 no-underline"
                  >
                    <Plus size={18} />
                    Sell an item
                  </Link>
                  <Link
                    href="/messages"
                    className="flex items-center gap-3 px-3 py-3 rounded-md text-body-sm text-neutral-700 hover:bg-neutral-50 no-underline"
                  >
                    <MessageSquare size={18} />
                    Messages
                  </Link>
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-3 py-3 rounded-md text-body-sm text-neutral-700 hover:bg-neutral-50 no-underline"
                  >
                    <User size={18} />
                    My Profile
                  </Link>
                  <div className="border-t border-neutral-200 mt-2 pt-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-3 py-3 rounded-md text-body-sm text-error-600 hover:bg-error-50"
                    >
                      <LogOut size={18} />
                      Log out
                    </button>
                  </div>
                </>
              ) : (
                <div className="border-t border-neutral-200 mt-2 pt-4 space-y-2 px-3">
                  <Link href="/login">
                    <Button variant="outline" fullWidth>
                      Log in
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button variant="primary" fullWidth>
                      Sign up
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </>
      )}
    </header>
  );
}
