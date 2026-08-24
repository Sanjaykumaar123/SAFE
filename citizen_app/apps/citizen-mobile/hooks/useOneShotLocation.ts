import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_MAP_CENTER } from '@/constants/config';
import { locationService, type Coordinates } from '@/services/location/locationService';

/**
 * A single current-location fetch (section 57 — "For the map: use current
 * location when permission exists", not continuous tracking). Falls back
 * to the default city center if permission isn't granted, so the screen
 * always has something reasonable to query with.
 */
export function useOneShotLocation() {
  const [coords, setCoords] = useState<Coordinates | null>(DEFAULT_MAP_CENTER);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const status = await locationService.getPermissionStatus();
      if (status !== 'granted') {
        setPermissionDenied(status === 'denied');
        setCoords(DEFAULT_MAP_CENTER);
        return;
      }
      const current = await locationService.getCurrentLocation();
      if (current) {
        setCoords(current);
      }
    } catch {
      setCoords(DEFAULT_MAP_CENTER);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { coords, isLoading, permissionDenied, refresh };
}
