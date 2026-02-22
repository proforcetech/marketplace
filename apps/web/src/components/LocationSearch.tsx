'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2, Navigation } from 'lucide-react';

interface LocationResult {
  city: string;
  state: string;
  lat: number;
  lng: number;
}

interface LocationSearchProps {
  onSelect: (location: LocationResult) => void;
  placeholder?: string;
  defaultValue?: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    state?: string;
    state_code?: string;
    county?: string;
    country?: string;
    country_code?: string;
  };
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const DEBOUNCE_MS = 400;

function extractCity(address: NominatimResult['address']): string {
  return address.city ?? address.town ?? address.village ?? address.hamlet ?? address.county ?? '';
}

function extractState(address: NominatimResult['address']): string {
  if (address.state_code) return address.state_code.toUpperCase();
  if (address.state && address.state.length >= 2) {
    return address.state.substring(0, 2).toUpperCase();
  }
  return '';
}

export default function LocationSearch({
  onSelect,
  placeholder = 'Search city or address...',
  defaultValue = '',
}: LocationSearchProps): JSX.Element {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchNominatim = useCallback(async (q: string): Promise<void> => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    // Abort previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setIsSearching(true);
    try {
      const url = new URL(`${NOMINATIM_BASE}/search`);
      url.searchParams.set('q', q);
      url.searchParams.set('format', 'json');
      url.searchParams.set('countrycodes', 'us');
      url.searchParams.set('addressdetails', '1');
      url.searchParams.set('limit', '5');

      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'Marketplace/1.0' },
        signal: controller.signal,
      });

      if (!res.ok) {
        setSuggestions([]);
        return;
      }

      const data = (await res.json()) as NominatimResult[];
      setSuggestions(data);
      setIsOpen(data.length > 0);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Intentionally aborted -- ignore
        return;
      }
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInputChange = (value: string): void => {
    setQuery(value);
    setGeoError(null);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      void searchNominatim(value);
    }, DEBOUNCE_MS);
  };

  const handleSelect = (result: NominatimResult): void => {
    const city = extractCity(result.address);
    const state = extractState(result.address);
    const displayText = [city, state].filter(Boolean).join(', ');

    setQuery(displayText || result.display_name);
    setIsOpen(false);
    setSuggestions([]);

    onSelect({
      city,
      state,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    });
  };

  const handleUseMyLocation = (): void => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setIsGeolocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const url = new URL(`${NOMINATIM_BASE}/reverse`);
          url.searchParams.set('lat', String(latitude));
          url.searchParams.set('lon', String(longitude));
          url.searchParams.set('format', 'json');
          url.searchParams.set('addressdetails', '1');

          const res = await fetch(url.toString(), {
            headers: { 'User-Agent': 'Marketplace/1.0' },
          });

          if (!res.ok) {
            setGeoError('Could not determine your location. Please try again.');
            setIsGeolocating(false);
            return;
          }

          const data = (await res.json()) as NominatimResult;
          const city = extractCity(data.address);
          const state = extractState(data.address);
          const displayText = [city, state].filter(Boolean).join(', ');

          setQuery(displayText || data.display_name);
          setIsOpen(false);
          setSuggestions([]);

          onSelect({
            city,
            state,
            lat: latitude,
            lng: longitude,
          });
        } catch {
          setGeoError('Failed to reverse geocode your location.');
        } finally {
          setIsGeolocating(false);
        }
      },
      (err) => {
        setIsGeolocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location permission denied. Please enable it in your browser settings.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGeoError('Location information is unavailable.');
        } else {
          setGeoError('Location request timed out. Please try again.');
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          autoComplete="off"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Use my location button */}
      <button
        type="button"
        onClick={handleUseMyLocation}
        disabled={isGeolocating}
        className="flex items-center gap-1.5 mt-2 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        {isGeolocating ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Navigation className="w-3.5 h-3.5" />
        )}
        {isGeolocating ? 'Finding your location...' : 'Use my location'}
      </button>

      {/* Geo error */}
      {geoError && (
        <p className="text-xs text-red-500 mt-1">{geoError}</p>
      )}

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((result) => (
            <li key={result.place_id}>
              <button
                type="button"
                onClick={() => handleSelect(result)}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <span className="block truncate">{result.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
