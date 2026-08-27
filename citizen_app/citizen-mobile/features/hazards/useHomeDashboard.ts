import { useQuery } from '@tanstack/react-query';
import { DEFAULT_MAP_CENTER } from '@/constants/config';
import { DEMO_HOME } from '@/constants/demoData';
import { citizenApi } from '@/services/api/citizenApi';
import { queryKeys } from '@/services/api/queryKeys';

/** Backs the Home screen with the single optimized `/citizen/home` payload
 * (section 42) instead of firing several separate requests. Always enabled with
 * fallback center & DEMO_HOME on network error so mock data is always visible. */
export function useHomeDashboard(coords: { latitude: number; longitude: number } | null) {
  const effectiveCoords = coords ?? DEFAULT_MAP_CENTER;
  return useQuery({
    queryKey: queryKeys.home(effectiveCoords.latitude, effectiveCoords.longitude),
    queryFn: async () => {
      try {
        const data = await citizenApi.home(effectiveCoords.latitude, effectiveCoords.longitude);
        if (!data || (!data.nearbyHazards?.length && !data.mapMarkers?.length)) {
          return DEMO_HOME;
        }
        return data;
      } catch (error) {
        console.warn('Backend API error on home, falling back to DEMO_HOME:', error);
        return DEMO_HOME;
      }
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
