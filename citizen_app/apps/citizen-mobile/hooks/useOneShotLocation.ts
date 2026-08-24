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
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const status = await locationService.getPermissionStatus();
    if (status !== 'granted') {
      const requested = await locationService.requestPermission();
      if (requested !== 'granted') {
        setPermissionDenied(true);
        setCoords(DEFAULT_MAP_CENTER);
        setIsLoading(false);
        return;
      }
    }
    const current = await locationService.getCurrentLocation();
    setCoords(current ?? DEFAULT_MAP_CENTER);
    setPermissionDenied(current === null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { coords, isLoading, permissionDenied, refresh };
}
