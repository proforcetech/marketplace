import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Stores in-progress listing drafts locally so users can resume
 * creation if they leave the app mid-flow. Persisted to MMKV.
 */

export interface ListingDraft {
  id: string;
  categoryId?: string;
  categoryName?: string;
  title?: string;
  description?: string;
  price?: number;
  priceType?: 'fixed' | 'obo' | 'free' | 'hourly';
  condition?: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  images: DraftImage[];
  structuredFields?: Record<string, string | number | boolean>;
  visibility?: 'public' | 'followers' | 'private_link';
  lastModified: number;
}

export interface DraftImage {
  localUri: string;
  uploadedUrl?: string;
  width: number;
  height: number;
  isUploading: boolean;
  uploadProgress: number;
}

interface ListingDraftState {
  currentDraft: ListingDraft | null;
  hasPendingDraft: boolean;

  // Actions
  startNewDraft: () => void;
  updateDraft: (updates: Partial<ListingDraft>) => void;
  addImages: (images: DraftImage[]) => void;
  removeImage: (localUri: string) => void;
  reorderImages: (fromIndex: number, toIndex: number) => void;
  updateImageUploadStatus: (localUri: string, uploadedUrl: string) => void;
  clearDraft: () => void;
}

function generateDraftId(): string {
  return `draft_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const useListingDraftStore = create<ListingDraftState>()(
  persist(
    (set, get) => ({
      currentDraft: null,
      hasPendingDraft: false,

      startNewDraft: () =>
        set({
          currentDraft: {
            id: generateDraftId(),
            images: [],
            lastModified: Date.now(),
          },
          hasPendingDraft: true,
        }),

      updateDraft: (updates) => {
        const current = get().currentDraft;
        if (!current) return;
        set({
          currentDraft: {
            ...current,
            ...updates,
            lastModified: Date.now(),
          },
        });
      },

      addImages: (images) => {
        const current = get().currentDraft;
        if (!current) return;
        set({
          currentDraft: {
            ...current,
            images: [...current.images, ...images],
            lastModified: Date.now(),
          },
        });
      },

      removeImage: (localUri) => {
        const current = get().currentDraft;
        if (!current) return;
        set({
          currentDraft: {
            ...current,
            images: current.images.filter((img) => img.localUri !== localUri),
            lastModified: Date.now(),
          },
        });
      },

      reorderImages: (fromIndex, toIndex) => {
        const current = get().currentDraft;
        if (!current) return;
        const images = [...current.images];
        const [moved] = images.splice(fromIndex, 1);
        images.splice(toIndex, 0, moved);
        set({
          currentDraft: {
            ...current,
            images,
            lastModified: Date.now(),
          },
        });
      },

      updateImageUploadStatus: (localUri, uploadedUrl) => {
        const current = get().currentDraft;
        if (!current) return;
        set({
          currentDraft: {
            ...current,
            images: current.images.map((img) =>
              img.localUri === localUri
                ? { ...img, uploadedUrl, isUploading: false, uploadProgress: 1 }
                : img
            ),
            lastModified: Date.now(),
          },
        });
      },

      clearDraft: () =>
        set({
          currentDraft: null,
          hasPendingDraft: false,
        }),
    }),
    {
      name: 'listing-draft-storage',
    }
  )
);
