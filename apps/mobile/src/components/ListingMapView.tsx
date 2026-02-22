import { useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import ClusteredMapView from 'react-native-map-clustering';
import { Marker, Circle, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useThemeColors } from '@/hooks/useColorScheme';
import { Config } from '@/constants/config';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';

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

interface ListingMapViewProps {
  listings: MapListing[];
  searchCenter: { latitude: number; longitude: number };
  radiusMiles: number;
  onSearchThisArea: (center: { latitude: number; longitude: number }) => void;
}

function formatPrice(price: number | null, priceType: string): string {
  if (!price || priceType === 'free') return 'Free';
  return `$${price.toLocaleString()}${priceType === 'hourly' ? '/hr' : ''}`;
}

export default function ListingMapView({
  listings,
  searchCenter,
  radiusMiles,
  onSearchThisArea,
}: ListingMapViewProps): JSX.Element {
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<InstanceType<typeof ClusteredMapView>>(null);

  const [selectedListing, setSelectedListing] = useState<MapListing | null>(null);
  const [hasMoved, setHasMoved] = useState(false);
  const [currentCenter, setCurrentCenter] = useState(searchCenter);

  const latitudeDelta = Math.max((radiusMiles / 69) * 2.5, Config.defaultMapDelta);
  const longitudeDelta = latitudeDelta;

  const initialRegion: Region = {
    latitude: searchCenter.latitude,
    longitude: searchCenter.longitude,
    latitudeDelta,
    longitudeDelta,
  };

  const handleRegionChangeComplete = useCallback(
    (region: Region) => {
      const latDiff = Math.abs(region.latitude - searchCenter.latitude);
      const lngDiff = Math.abs(region.longitude - searchCenter.longitude);
      if (latDiff > 0.001 || lngDiff > 0.001) {
        setCurrentCenter({ latitude: region.latitude, longitude: region.longitude });
        setHasMoved(true);
      }
    },
    [searchCenter],
  );

  const handleSearchThisArea = useCallback(() => {
    onSearchThisArea(currentCenter);
    setHasMoved(false);
  }, [currentCenter, onSearchThisArea]);

  return (
    <View style={styles.container}>
      <ClusteredMapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        onRegionChangeComplete={handleRegionChangeComplete}
        onPress={() => setSelectedListing(null)}
        clusterColor={colors.primary}
        clusterTextColor="#FFFFFF"
        radius={Config.clusterRadius}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Radius circle */}
        <Circle
          center={searchCenter}
          radius={radiusMiles * 1609.34}
          strokeColor="rgba(74,144,217,0.5)"
          fillColor="rgba(74,144,217,0.05)"
          strokeWidth={2}
        />

        {/* Listing markers */}
        {listings.map((listing) => (
          <Marker
            key={listing.id}
            coordinate={{ latitude: listing.latitude, longitude: listing.longitude }}
            onPress={() => setSelectedListing(listing)}
            tracksViewChanges={false}
          >
            <View
              style={[
                styles.markerBubble,
                {
                  backgroundColor: listing.isPromoted ? colors.warning : colors.primary,
                },
              ]}
            >
              <Text style={styles.markerText}>{formatPrice(listing.price, listing.priceType)}</Text>
            </View>
          </Marker>
        ))}
      </ClusteredMapView>

      {/* Search this area button */}
      {hasMoved && (
        <View style={styles.searchButtonContainer}>
          <Pressable
            style={[styles.searchButton, { backgroundColor: colors.surfaceElevated }]}
            onPress={handleSearchThisArea}
          >
            <Text style={[styles.searchButtonText, { color: colors.text }]}>Search this area</Text>
          </Pressable>
        </View>
      )}

      {/* Selected listing preview card */}
      {selectedListing && (
        <View
          style={[
            styles.previewCard,
            {
              bottom: insets.bottom + Spacing.lg,
              backgroundColor: colors.surfaceElevated,
              shadowColor: colors.cardShadow,
            },
          ]}
        >
          <View style={styles.previewContent}>
            <View style={[styles.previewThumbnail, { backgroundColor: colors.skeleton }]}>
              {selectedListing.thumbnailUrl && (
                <Image
                  source={{ uri: selectedListing.thumbnailUrl }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              )}
            </View>
            <View style={styles.previewInfo}>
              <Text style={[styles.previewTitle, { color: colors.text }]} numberOfLines={2}>
                {selectedListing.title}
              </Text>
              <Text style={[styles.previewPrice, { color: colors.primary }]}>
                {formatPrice(selectedListing.price, selectedListing.priceType)}
              </Text>
              {selectedListing.isPromoted && (
                <Text style={[styles.previewSponsored, { color: colors.warning }]}>Sponsored</Text>
              )}
            </View>
            <Pressable
              style={[styles.viewButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push(`/listing/${selectedListing.id}` as never)}
            >
              <Text style={styles.viewButtonText}>View</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerBubble: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  markerText: {
    ...Typography.caption1,
    fontWeight: '700',
    color: '#FFFFFF',
    fontSize: 11,
  },
  searchButtonContainer: {
    position: 'absolute',
    top: Spacing.lg,
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  searchButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  searchButtonText: {
    ...Typography.footnote,
    fontWeight: '600',
  },
  previewCard: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  previewThumbnail: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    flexShrink: 0,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewInfo: {
    flex: 1,
    gap: 2,
  },
  previewTitle: {
    ...Typography.subhead,
    fontWeight: '600',
  },
  previewPrice: {
    ...Typography.footnote,
    fontWeight: '700',
  },
  previewSponsored: {
    ...Typography.caption2,
    fontWeight: '500',
  },
  viewButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    flexShrink: 0,
  },
  viewButtonText: {
    ...Typography.footnote,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
