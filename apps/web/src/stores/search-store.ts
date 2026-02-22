import { create } from 'zustand';
import type { ListingSummary, SearchSortBy, ItemCondition, SearchResults } from '@marketplace/shared';
import { search as searchApi } from '@/lib/api';

interface SearchState {
  query: string;
  lat: number;
  lng: number;
  radiusMiles: number;
  categoryId: string | undefined;
  conditions: ItemCondition[];
  priceMin: number | undefined;
  priceMax: number | undefined;
  postedWithin: string | undefined;
  sortBy: SearchSortBy;
  results: ListingSummary[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  hasSearched: boolean;
}

interface SearchActions {
  setQuery: (query: string) => void;
  setLocation: (lat: number, lng: number) => void;
  setRadius: (radiusMiles: number) => void;
  setCategory: (categoryId: string | undefined) => void;
  setConditions: (conditions: ItemCondition[]) => void;
  setPriceRange: (min: number | undefined, max: number | undefined) => void;
  setPostedWithin: (value: string | undefined) => void;
  setSortBy: (sortBy: SearchSortBy) => void;
  search: () => Promise<void>;
  loadMore: () => Promise<void>;
  clearFilters: () => void;
  reset: () => void;
}

const DEFAULT_STATE: SearchState = {
  query: '',
  lat: 30.2672,
  lng: -97.7431,
  radiusMiles: 25,
  categoryId: undefined,
  conditions: [],
  priceMin: undefined,
  priceMax: undefined,
  postedWithin: undefined,
  sortBy: 'distance',
  results: [],
  totalCount: 0,
  currentPage: 1,
  totalPages: 0,
  isLoading: false,
  hasSearched: false,
};

export const useSearchStore = create<SearchState & SearchActions>()((set, get) => ({
  ...DEFAULT_STATE,

  setQuery: (query) => set({ query }),
  setLocation: (lat, lng) => set({ lat, lng }),
  setRadius: (radiusMiles) => set({ radiusMiles }),
  setCategory: (categoryId) => set({ categoryId }),
  setConditions: (conditions) => set({ conditions }),
  setPriceRange: (priceMin, priceMax) => set({ priceMin, priceMax }),
  setPostedWithin: (postedWithin) => set({ postedWithin }),
  setSortBy: (sortBy) => set({ sortBy }),

  search: async () => {
    const state = get();
    set({ isLoading: true });
    try {
      const res = await searchApi.search({
        lat: state.lat,
        lng: state.lng,
        radius: state.radiusMiles,
        q: state.query || undefined,
        category: state.categoryId,
        condition: state.conditions.length > 0 ? state.conditions : undefined,
        priceMin: state.priceMin,
        priceMax: state.priceMax,
        sort: state.sortBy,
        page: 1,
        limit: 20,
      });
      const data: SearchResults = res.data;
      set({
        results: data.listings,
        totalCount: data.total,
        currentPage: data.page,
        totalPages: data.totalPages,
        isLoading: false,
        hasSearched: true,
      });
    } catch {
      set({ isLoading: false, hasSearched: true });
    }
  },

  loadMore: async () => {
    const state = get();
    if (state.isLoading || state.currentPage >= state.totalPages) return;

    set({ isLoading: true });
    try {
      const res = await searchApi.search({
        lat: state.lat,
        lng: state.lng,
        radius: state.radiusMiles,
        q: state.query || undefined,
        category: state.categoryId,
        condition: state.conditions.length > 0 ? state.conditions : undefined,
        priceMin: state.priceMin,
        priceMax: state.priceMax,
        sort: state.sortBy,
        page: state.currentPage + 1,
        limit: 20,
      });
      const data: SearchResults = res.data;
      set({
        results: [...state.results, ...data.listings],
        totalCount: data.total,
        currentPage: data.page,
        totalPages: data.totalPages,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  clearFilters: () => {
    set({
      categoryId: undefined,
      conditions: [],
      priceMin: undefined,
      priceMax: undefined,
      postedWithin: undefined,
      sortBy: 'distance',
    });
  },

  reset: () => set(DEFAULT_STATE),
}));
