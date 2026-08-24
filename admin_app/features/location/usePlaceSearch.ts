import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { SEARCH_DEBOUNCE_MS } from '@/constants/config';
import { queryKeys } from '@/services/api/queryKeys';
import { geocodeService } from '@/services/geo/geocodeService';

/** §concept/§57 — debounced place search backing every search bar in this
 * app. Returns the bundled "popular locations" list for an empty query so
 * the search screen never opens on a blank list. */
export function usePlaceSearch(rawQuery: string) {
  const [debounced, setDebounced] = useState(rawQuery);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(rawQuery), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [rawQuery]);

  return useQuery({
    queryKey: queryKeys.geocode(debounced),
    queryFn: () => geocodeService.search(debounced),
  });
}
