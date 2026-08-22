import { useQuery, useQueryClient } from '@tanstack/react-query';

import { fleetApi } from '@/services/api/fleetApi';
import { queryKeys } from '@/services/api/queryKeys';

export function useCurrentSession() {
  return useQuery({
    queryKey: queryKeys.currentSession(),
    queryFn: () => fleetApi.currentSession(),
  });
}

export function useSessionHistory() {
  return useQuery({
    queryKey: queryKeys.sessionHistory(),
    queryFn: () => fleetApi.sessionHistory(),
  });
}

export function useSessionDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sessionDetail(id ?? 'disabled'),
    queryFn: () => fleetApi.getSession(id as string),
    enabled: Boolean(id),
  });
}

/** Invalidate the wide cluster of queries a session start/stop affects —
 * same "wide invalidation on state-changing mutation" rule
 * `municipality/features/hazards/useHazardMutations.ts` follows. */
export function useInvalidateAfterSessionChange() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.currentSession() });
    queryClient.invalidateQueries({ queryKey: queryKeys.sessionHistory() });
    queryClient.invalidateQueries({ queryKey: queryKeys.me() });
    queryClient.invalidateQueries({ queryKey: queryKeys.earnings() });
    queryClient.invalidateQueries({ queryKey: queryKeys.payments() });
  };
}
