/**
 * Hazards visible in the map's current viewport — polled on an interval so
 * the map reflects newly reported/verified hazards without a manual
 * refresh. There's no push/WS channel from the backend yet (see the note
 * in `backend/api/app/main.py`); swap `refetchInterval` for a live
 * subscription once one exists.
 */
import { useQuery } from '@tanstack/react-query';

import { DEFAULT_RADIUS_METERS } from '@/constants/config';
import { hazardsApi } from '@/services/api/hazardsApi';
import { queryKeys } from '@/services/api/queryKeys';
import type { RoutePoint } from '@/types';

const POLL_INTERVAL_MS = 20000;

export function useNearbyHazards(center: RoutePoint | null, radiusMeters: number = DEFAULT_RADIUS_METERS) {
  return useQuery({
    queryKey: center
      ? queryKeys.hazardsNearby(center.latitude, center.longitude, radiusMeters)
      : (['hazards', 'nearby', 'idle'] as const),
    queryFn: () => hazardsApi.nearby({ latitude: center!.latitude, longitude: center!.longitude, radius: radiusMeters, limit: 200 }),
    enabled: center !== null,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: 10000,
  });
}
