'use client';

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { Button } from './Button.js';
import { Avatar } from './Avatar.js';
import type { User } from '@marketplace/shared';
import {
  Menu,
  X,
  Search,
  MessageSquare,
  Plus,
  User as UserIcon,
  ChevronDown,
  LogOut,
} from 'lucide-react';

export interface HeaderProps {
  /** Authenticated user data. When absent, show login/signup buttons. */
  user?: User | null;
  /** Number of unread messages for the badge. */
  unreadMessageCount?: number;
  /** Called when a search is submitted from the header search bar. */
  onSearch?: (query: string) => void;
  /** Called when login button is clicked. */
  onLogin?: () => void;
  /** Called when signup button is clicked. */
  onSignup?: () => void;
  /** Called when logout is triggered. */
  onLogout?: () => void;
  className?: string;
}

function UnreadBadge({ count }: { count: number }): JSX.Element | null {
  if (count <= 0) return null;
  const display = count > 99 ? '99+' : String(count);
  return (
    <span
      className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-error-500 text-white text-[10px] font-bold leading-none"
      aria-label={`${count} unread message${count !== 1 ? 's' : ''}`}
    >
      {display}
    </span>
  );
}

export function Header({
  user,
  unreadMessageCount = 0,
  onSearch,
  onLogin,
  onSignup,
  onLogout,
  className,
}: HeaderProps): JSX.Element {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const userDropdownRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const isAuthenticated = Boolean(user);

  // Close user dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(e.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    }
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userDropdownOpen]);

  // Close mobile menu on escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setMobileSearchOpen(false);
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen || mobileSearchOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [mobileMenuOpen, mobileSearchOpen]);

  // Focus search input when mobile search opens
  useEffect(() => {
    if (mobileSearchOpen) {
      requestAnimationFrame(() => {
        mobileSearchInputRef.current?.focus();
      });
    }
  }, [mobileSearchOpen]);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = searchQuery.trim();
      if (trimmed && onSearch) {
        onSearch(trimmed);
        setMobileSearchOpen(false);
      }
    },
    [searchQuery, onSearch],
  );

  return (
    <>
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="skip-to-content"
      >
        Skip to main content
      </a>

      <header
        className={cn(
          'sticky top-0 z-sticky bg-white border-b border-neutral-200 shadow-xs',
          className,
        )}
      >
        <div className="container-page flex items-center justify-between h-14 lg:h-16 gap-4">
          {/* Left: Logo */}
          <a
            href="/"
            className="shrink-0 flex items-center gap-2 hover:no-underline"
            aria-label="Marketplace home"
          >
            <div className="w-8 h-8 rounded-md bg-primary-500 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <span className="hidden sm:block text-heading-sm text-neutral-900">
              Marketplace
            </span>
          </a>

          {/* Center: Desktop search bar */}
          <form
            role="search"
            aria-label="Search marketplace"
            onSubmit={handleSearchSubmit}
            className="hidden lg:flex items-center flex-1 max-w-[480px] mx-4"
          >
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                <Search size={18} aria-hidden="true" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cars, furniture, jobs..."
                className="w-full h-10 pl-10 pr-4 rounded-full border border-neutral-200 bg-neutral-50 text-body-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:border-primary-500 focus:bg-white transition-colors duration-fast"
                aria-label="Search keywords"
              />
            </div>
          </form>

          {/* Right: Navigation */}
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main navigation">
            {/* Mobile search toggle */}
            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              className="lg:hidden p-2 rounded-md text-neutral-600 hover:bg-neutral-100 transition-colors duration-fast"
              aria-label="Open search"
            >
              <Search size={20} aria-hidden="true" />
            </button>

            {/* Desktop nav links */}
            <a
              href="/browse"
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 text-body-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-md transition-colors duration-fast hover:no-underline"
            >
              Browse
            </a>

            {isAuthenticated && (
              <>
                <a
                  href="/listings/new"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-body-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-md transition-colors duration-fast hover:no-underline"
                >
                  <Plus size={16} aria-hidden="true" />
                  <span className="hidden lg:inline">Sell</span>
                </a>

                <a
                  href="/messages"
                  className="relative p-2 rounded-md text-neutral-600 hover:bg-neutral-100 transition-colors duration-fast hover:no-underline"
                  aria-label={`Messages${unreadMessageCount > 0 ? `, ${unreadMessageCount} unread` : ''}`}
                >
                  <MessageSquare size={20} aria-hidden="true" />
                  <UnreadBadge count={unreadMessageCount} />
                </a>

                {/* User dropdown */}
                <div ref={userDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-1.5 p-1 pr-2 rounded-full hover:bg-neutral-100 transition-colors duration-fast"
                    aria-expanded={userDropdownOpen}
                    aria-haspopup="true"
                    aria-label="User menu"
                  >
                    <Avatar
                      name={user?.displayName ?? ''}
                      src={user?.avatarUrl}
                      size="sm"
                    />
                    <ChevronDown
                      size={14}
                      className={cn(
                        'hidden sm:block text-neutral-400 transition-transform duration-fast',
                        userDropdownOpen && 'rotate-180',
                      )}
                      aria-hidden="true"
                    />
                  </button>

                  {userDropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 bg-white border border-neutral-200 rounded-lg shadow-md py-1 z-dropdown animate-fade-in-up"
                      role="menu"
                      aria-label="User options"
                    >
                      <div className="px-4 py-3 border-b border-neutral-100">
                        <p className="text-body-sm font-medium text-neutral-900 truncate">
                          {user?.displayName}
                        </p>
                        <p className="text-caption text-neutral-500 truncate">
                          {user?.email}
                        </p>
                      </div>
                      <a
                        href="/profile"
                        role="menuitem"
                        className="flex items-center gap-2 px-4 py-2.5 text-body-sm text-neutral-700 hover:bg-neutral-50 transition-colors duration-fast hover:no-underline"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <UserIcon size={16} aria-hidden="true" />
                        My Profile
                      </a>
                      <a
                        href="/my-listings"
                        role="menuitem"
                        className="flex items-center gap-2 px-4 py-2.5 text-body-sm text-neutral-700 hover:bg-neutral-50 transition-colors duration-fast hover:no-underline"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <Plus size={16} aria-hidden="true" />
                        My Listings
                      </a>
                      <div className="border-t border-neutral-100 mt-1 pt-1">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onLogout?.();
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2.5 text-body-sm text-error-600 hover:bg-error-50 transition-colors duration-fast"
                        >
                          <LogOut size={16} aria-hidden="true" />
                          Log Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {!isAuthenticated && (
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onLogin}>
                  Log In
                </Button>
                <Button variant="primary" size="sm" onClick={onSignup}>
                  Sign Up
                </Button>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-md text-neutral-600 hover:bg-neutral-100 transition-colors duration-fast"
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <Menu size={20} aria-hidden="true" />
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-modal bg-white flex flex-col animate-fade-in-up">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200">
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              className="p-2 -ml-2 rounded-md text-neutral-600 hover:bg-neutral-100 transition-colors duration-fast"
              aria-label="Close search"
            >
              <X size={20} aria-hidden="true" />
            </button>
            <form
              role="search"
              aria-label="Search marketplace"
              onSubmit={handleSearchSubmit}
              className="flex-1"
            >
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">
                  <Search size={18} aria-hidden="true" />
                </span>
                <input
                  ref={mobileSearchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search cars, furniture, jobs..."
                  className="w-full h-10 pl-10 pr-4 rounded-md border border-neutral-200 bg-neutral-50 text-body-md placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:border-primary-500"
                  aria-label="Search keywords"
                />
              </div>
            </form>
          </div>
          <div className="flex-1 p-4">
            <p className="text-body-sm text-neutral-500">
              Search for listings by keyword, category, or location.
            </p>
          </div>
        </div>
      )}

      {/* Mobile slide-out drawer */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-overlay bg-neutral-950/50 animate-fade-in-up lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div
            ref={mobileMenuRef}
            className="fixed top-0 right-0 bottom-0 z-modal w-[280px] bg-white shadow-xl animate-slide-in-bottom lg:hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
              <span className="text-heading-sm text-neutral-900">Menu</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 -mr-2 rounded-md text-neutral-600 hover:bg-neutral-100 transition-colors duration-fast"
                aria-label="Close menu"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-2" aria-label="Mobile navigation">
              {isAuthenticated && user && (
                <div className="px-4 py-3 border-b border-neutral-100">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={user.displayName}
                      src={user.avatarUrl}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="text-body-sm font-medium text-neutral-900 truncate">
                        {user.displayName}
                      </p>
                      <p className="text-caption text-neutral-500 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <a
                href="/browse"
                className="flex items-center gap-3 px-4 py-3 text-body-md text-neutral-700 hover:bg-neutral-50 transition-colors duration-fast hover:no-underline"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Search size={20} className="text-neutral-400" aria-hidden="true" />
                Browse
              </a>

              {isAuthenticated && (
                <>
                  <a
                    href="/listings/new"
                    className="flex items-center gap-3 px-4 py-3 text-body-md text-neutral-700 hover:bg-neutral-50 transition-colors duration-fast hover:no-underline"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Plus size={20} className="text-neutral-400" aria-hidden="true" />
                    Sell an Item
                  </a>
                  <a
                    href="/messages"
                    className="flex items-center gap-3 px-4 py-3 text-body-md text-neutral-700 hover:bg-neutral-50 transition-colors duration-fast hover:no-underline"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="relative">
                      <MessageSquare size={20} className="text-neutral-400" aria-hidden="true" />
                      <UnreadBadge count={unreadMessageCount} />
                    </div>
                    Messages
                  </a>
                  <a
                    href="/profile"
                    className="flex items-center gap-3 px-4 py-3 text-body-md text-neutral-700 hover:bg-neutral-50 transition-colors duration-fast hover:no-underline"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <UserIcon size={20} className="text-neutral-400" aria-hidden="true" />
                    My Profile
                  </a>
                </>
              )}
            </nav>

            {/* Bottom actions */}
            <div className="border-t border-neutral-200 p-4 pb-safe">
              {isAuthenticated ? (
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout?.();
                  }}
                  leftIcon={<LogOut size={16} aria-hidden="true" />}
                  className="text-error-600 hover:bg-error-50"
                >
                  Log Out
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onSignup?.();
                    }}
                  >
                    Sign Up
                  </Button>
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogin?.();
                    }}
                  >
                    Log In
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
