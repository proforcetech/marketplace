import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  city?: string;
  state?: string;
}

interface UseLocationResult {
  location: UserLocation | null;
  isLoading: boolean;
  error: string | null;
  permissionStatus: Location.PermissionStatus | null;
  requestPermission: () => Promise<boolean>;
  refreshLocation: () => Promise<void>;
}

/**
 * Hook for managing location state and permissions.
 *
 * Does NOT automatically request permission. The UI should present
 * a rationale screen before calling requestPermission().
 */
export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<Location.PermissionStatus | null>(null);

  // Check current permission status on mount (does not trigger prompt)
  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ status }) => {
      setPermissionStatus(status);
      if (status === Location.PermissionStatus.GRANTED) {
        fetchLocation();
      }
    });
  }, []);

  const fetchLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const userLocation: UserLocation = {
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
        accuracy: result.coords.accuracy,
      };

      // Reverse geocode to get city/state for display
      try {
        const [geocode] = await Location.reverseGeocodeAsync({
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
        });
        if (geocode) {
          userLocation.city = geocode.city ?? undefined;
          userLocation.state = geocode.region ?? undefined;
        }
      } catch {
        // Reverse geocoding failure is non-critical
      }

      setLocation(userLocation);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to get location'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setPermissionStatus(status);

    if (status === Location.PermissionStatus.GRANTED) {
      await fetchLocation();
      return true;
    }

    return false;
  }, [fetchLocation]);

  const refreshLocation = useCallback(async () => {
    if (permissionStatus === Location.PermissionStatus.GRANTED) {
      await fetchLocation();
    }
  }, [permissionStatus, fetchLocation]);

  return {
    location,
    isLoading,
    error,
    permissionStatus,
    requestPermission,
    refreshLocation,
  };
}
