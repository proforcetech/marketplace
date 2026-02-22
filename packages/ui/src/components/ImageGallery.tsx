'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '../lib/cn.js';

export interface GalleryImage {
  url: string;
  thumbnailUrl?: string;
  alt?: string;
}

export interface ImageGalleryProps {
  /** Array of images to display. */
  images: GalleryImage[];
  /** Default alt text prefix when individual alt is not provided. */
  alt?: string;
  className?: string;
}

export function ImageGallery({
  images,
  alt = 'Listing image',
  className,
}: ImageGalleryProps): JSX.Element {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mainImageLoaded, setMainImageLoaded] = useState(false);
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);

  // Touch/swipe state for lightbox
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const hasImages = images.length > 0;
  const currentImage = hasImages ? images[activeIndex] : null;
  const totalImages = images.length;

  // Reset loaded state when active image changes
  useEffect(() => {
    setMainImageLoaded(false);
  }, [activeIndex]);

  // Scroll active thumbnail into view
  useEffect(() => {
    if (thumbnailContainerRef.current) {
      const activeThumb = thumbnailContainerRef.current.children[activeIndex] as HTMLElement | undefined;
      activeThumb?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeIndex]);

  const goToNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % totalImages);
  }, [totalImages]);

  const goToPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + totalImages) % totalImages);
  }, [totalImages]);

  const openLightbox = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    previousFocusRef.current?.focus();
  }, []);

  // Lightbox keyboard and body scroll management
  useEffect(() => {
    if (!lightboxOpen) return;

    document.body.style.overflow = 'hidden';

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
    }

    document.addEventListener('keydown', handleKeyDown);

    // Focus the lightbox for keyboard navigation
    requestAnimationFrame(() => {
      lightboxRef.current?.focus();
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [lightboxOpen, closeLightbox, goToNext, goToPrev]);

  // Touch handlers for swipe navigation
  const handleTouchStart = (e: React.TouchEvent): void => {
    touchStartX.current = e.touches[0]?.clientX ?? 0;
  };

  const handleTouchMove = (e: React.TouchEvent): void => {
    touchEndX.current = e.touches[0]?.clientX ?? 0;
  };

  const handleTouchEnd = (): void => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (diff > threshold) goToNext();
    else if (diff < -threshold) goToPrev();
  };

  if (!hasImages) {
    return (
      <div
        className={cn(
          'aspect-[4/3] bg-neutral-100 rounded-lg flex items-center justify-center',
          className,
        )}
      >
        <div className="text-center text-neutral-300">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p className="mt-2 text-body-sm text-neutral-400">No images</p>
        </div>
      </div>
    );
  }

  const getAltText = (image: GalleryImage, index: number): string =>
    image.alt ?? `${alt} ${index + 1} of ${totalImages}`;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Main image */}
      <div
        className="relative aspect-[4/3] bg-neutral-100 rounded-lg overflow-hidden cursor-pointer group"
        onClick={openLightbox}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openLightbox();
          }
        }}
        aria-label="Open fullscreen image viewer"
      >
        {/* Skeleton while loading */}
        {!mainImageLoaded && (
          <div className="absolute inset-0 skeleton" />
        )}
        {currentImage && (
          <img
            src={currentImage.url}
            alt={getAltText(currentImage, activeIndex)}
            onLoad={() => setMainImageLoaded(true)}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-normal',
              mainImageLoaded ? 'opacity-100' : 'opacity-0',
            )}
          />
        )}

        {/* Image counter */}
        {totalImages > 1 && (
          <span className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-neutral-900/70 text-white text-caption font-medium backdrop-blur-sm">
            {activeIndex + 1} / {totalImages}
          </span>
        )}

        {/* Expand icon hint */}
        <span className="absolute top-3 right-3 p-1.5 rounded-md bg-neutral-900/50 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-fast backdrop-blur-sm" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </span>
      </div>

      {/* Thumbnail strip */}
      {totalImages > 1 && (
        <div
          ref={thumbnailContainerRef}
          className="flex gap-2 overflow-x-auto scrollbar-none scroll-horizontal"
          role="tablist"
          aria-label="Image thumbnails"
        >
          {images.map((image, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={getAltText(image, index)}
              onClick={() => setActiveIndex(index)}
              className={cn(
                'shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all duration-fast',
                index === activeIndex
                  ? 'border-primary-500 ring-1 ring-primary-400/30'
                  : 'border-transparent opacity-60 hover:opacity-100',
              )}
            >
              <img
                src={image.thumbnailUrl ?? image.url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox overlay */}
      {lightboxOpen && (
        <div
          ref={lightboxRef}
          className="fixed inset-0 z-modal bg-neutral-950/95 flex flex-col items-center justify-center animate-fade-in-up"
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery fullscreen view"
          tabIndex={-1}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
            <span className="text-white text-body-sm font-medium">
              {activeIndex + 1} / {totalImages}
            </span>
            <button
              type="button"
              onClick={closeLightbox}
              className="p-2 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-fast"
              aria-label="Close fullscreen view"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Navigation arrows */}
          {totalImages > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrev();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors duration-fast backdrop-blur-sm z-10"
                aria-label="Previous image"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors duration-fast backdrop-blur-sm z-10"
                aria-label="Next image"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </>
          )}

          {/* Image */}
          {currentImage && (
            <img
              src={currentImage.url}
              alt={getAltText(currentImage, activeIndex)}
              className="max-w-full max-h-[85vh] object-contain select-none"
              draggable={false}
            />
          )}
        </div>
      )}
    </div>
  );
}
