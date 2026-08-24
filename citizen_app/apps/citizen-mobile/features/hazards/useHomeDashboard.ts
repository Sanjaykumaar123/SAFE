import { useQuery } from '@tanstack/react-query';

import { citizenApi } from '@/services/api/citizenApi';
import { queryKeys } from '@/services/api/queryKeys';

/** Backs the Home screen with the single optimized `/citizen/home` payload
 * (section 42) instead of firing several separate requests. */
export function useHomeDashboard(coords: { latitude: number; longitude: number } | null) {
  return useQuery({
    queryKey: coords ? queryKeys.home(coords.latitude, coords.longitude) : ['home', 'disabled'],
    queryFn: () => citizenApi.home(coords!.latitude, coords!.longitude),
    enabled: coords !== null,
    staleTime: 30_000,
    refetchInterval: 60_000, // gentle poll — see services/realtime/RealtimeService.ts
  });
}
