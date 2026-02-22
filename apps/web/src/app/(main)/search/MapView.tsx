'use client';

import { useRef, useState, useCallback, useMemo } from 'react';
import Map, { Marker, Popup, Source, Layer, NavigationControl } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import circle from '@turf/circle';
import useSupercluster from 'use-supercluster';
import Link from 'next/link';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapListing {
  id: string;
  title: string;
  price: number | null;
  priceType: string;
  latitude: number;
  longitude: number;
  isPromoted: boolean;
  thumbnailUrl: string | null;
}

interface MapViewProps {
  listings: MapListing[];
  searchCenter: { lat: number; lng: number };
  radiusMiles: number;
  onSearchThisArea: (center: { lat: number; lng: number }) => void;
}

function formatPrice(price: number | null, priceType: string): string {
  if (!price || priceType === 'free') return 'Free';
  return `$${price.toLocaleString()}${priceType === 'hourly' ? '/hr' : ''}`;
}

export default function MapView({
  listings,
  searchCenter,
  radiusMiles,
  onSearchThisArea,
}: MapViewProps): JSX.Element {
  const mapRef = useRef<MapRef>(null);

  const [viewState, setViewState] = useState({
    latitude: searchCenter.lat,
    longitude: searchCenter.lng,
    zoom: 11,
  });
  const [selectedListing, setSelectedListing] = useState<MapListing | null>(null);
  const [hasMoved, setHasMoved] = useState(false);
  const [bounds, setBounds] = useState<[number, number, number, number]>(() => {
    const delta = (radiusMiles / 69) * 1.5;
    return [
      searchCenter.lng - delta,
      searchCenter.lat - delta,
      searchCenter.lng + delta,
      searchCenter.lat + delta,
    ];
  });

  // GeoJSON radius circle (miles → km)
  const radiusGeoJson = useMemo(
    () =>
      circle([searchCenter.lng, searchCenter.lat], radiusMiles * 1.60934, {
        steps: 64,
        units: 'kilometers',
      }),
    [searchCenter.lat, searchCenter.lng, radiusMiles],
  );

  // Supercluster points
  const points = useMemo(
    () =>
      listings.map((l) => ({
        type: 'Feature' as const,
        properties: { cluster: false, listing: l },
        geometry: { type: 'Point' as const, coordinates: [l.longitude, l.latitude] },
      })),
    [listings],
  );

  const { clusters, supercluster } = useSupercluster({
    points,
    bounds,
    zoom: viewState.zoom,
    options: { radius: 60, maxZoom: 17 },
  });

  const handleMoveEnd = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    if (b) {
      setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    }
    setHasMoved(true);
  }, []);

  const handleSearchThisArea = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const { lat, lng } = map.getCenter();
    onSearchThisArea({ lat, lng });
    setHasMoved(false);
  }, [onSearchThisArea]);

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onMoveEnd={handleMoveEnd}
        onClick={() => setSelectedListing(null)}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />

        {/* Radius circle fill + outline */}
        <Source id="radius-circle" type="geojson" data={radiusGeoJson}>
          <Layer
            id="radius-fill"
            type="fill"
            paint={{ 'fill-color': '#3B82F6', 'fill-opacity': 0.08 }}
          />
          <Layer
            id="radius-line"
            type="line"
            paint={{ 'line-color': '#3B82F6', 'line-width': 2, 'line-opacity': 0.5 }}
          />
        </Source>

        {clusters.map((feature) => {
          const lng = feature.geometry.coordinates[0] as number;
          const lat = feature.geometry.coordinates[1] as number;
          const props = feature.properties as {
            cluster: boolean;
            point_count?: number;
            listing?: MapListing;
          };

          if (props.cluster) {
            const count = props.point_count!;
            const size = Math.min(36 + Math.sqrt(count / Math.max(listings.length, 1)) * 24, 56);
            return (
              <Marker
                key={`cluster-${feature.id as number}`}
                latitude={lat}
                longitude={lng}
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  const zoom = Math.min(
                    (supercluster?.getClusterExpansionZoom(feature.id as number) ?? 16) + 1,
                    17,
                  );
                  mapRef.current?.easeTo({ center: [lng, lat], zoom });
                }}
              >
                <div
                  className="flex items-center justify-center rounded-full bg-blue-600 text-white font-bold cursor-pointer shadow-lg border-2 border-white text-sm"
                  style={{ width: size, height: size }}
                >
                  {count}
                </div>
              </Marker>
            );
          }

          const listing = props.listing!;
          return (
            <Marker
              key={listing.id}
              latitude={lat}
              longitude={lng}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedListing(listing);
              }}
            >
              <div
                className={`px-2 py-1 rounded-full text-xs font-bold text-white shadow-md cursor-pointer whitespace-nowrap border border-white/30 ${
                  listing.isPromoted ? 'bg-amber-500' : 'bg-blue-600'
                }`}
              >
                {formatPrice(listing.price, listing.priceType)}
              </div>
            </Marker>
          );
        })}

        {selectedListing && (
          <Popup
            latitude={selectedListing.latitude}
            longitude={selectedListing.longitude}
            anchor="top"
            onClose={() => setSelectedListing(null)}
            closeOnClick={false}
            maxWidth="280px"
          >
            <Link
              href={`/listings/${selectedListing.id}`}
              className="flex gap-3 no-underline text-inherit p-1"
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                {selectedListing.thumbnailUrl ? (
                  <img
                    src={selectedListing.thumbnailUrl}
                    alt={selectedListing.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">
                    📷
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate leading-tight">
                  {selectedListing.title}
                </p>
                <p className="text-blue-600 font-bold text-sm mt-0.5">
                  {formatPrice(selectedListing.price, selectedListing.priceType)}
                </p>
                {selectedListing.isPromoted && (
                  <span className="text-xs font-medium text-amber-600">Sponsored</span>
                )}
                <span className="block text-xs text-blue-500 mt-1">View listing →</span>
              </div>
            </Link>
          </Popup>
        )}
      </Map>

      {/* Search this area button — shown after panning */}
      {hasMoved && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={handleSearchThisArea}
            className="bg-white text-gray-800 text-sm font-semibold px-4 py-2 rounded-full shadow-md border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            Search this area
          </button>
        </div>
      )}
    </div>
  );
}
