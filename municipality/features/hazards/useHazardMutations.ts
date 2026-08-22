import { useMutation, useQueryClient } from '@tanstack/react-query';

import { municipalityApi } from '@/services/api/municipalityApi';
import { queryKeys } from '@/services/api/queryKeys';
import type { ResolveHazardPayload } from '@/types/municipality';

/** Section 58 — HAZARD_RESOLVED invalidates active hazards, dashboard,
 * repair list, notifications, and map, not just the one hazard. */
function invalidateAfterHazardChange(queryClient: ReturnType<typeof useQueryClient>, hazardId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.hazardDetail(hazardId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.hazardVerification(hazardId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.hazardTimeline(hazardId) });
  queryClient.invalidateQueries({ queryKey: ['municipality', 'hazards'] });
  queryClient.invalidateQueries({ queryKey: ['municipality', 'dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['municipality', 'repairs'] });
  queryClient.invalidateQueries({ queryKey: ['municipality', 'notifications'] });
  queryClient.invalidateQueries({ queryKey: ['municipality', 'analytics'] });
}

export function useResolveHazard(hazardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ResolveHazardPayload) => municipalityApi.resolveHazard(hazardId, payload),
    onSuccess: () => invalidateAfterHazardChange(queryClient, hazardId),
  });
}

export function useReopenHazard(hazardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (note?: string) => municipalityApi.reopenHazard(hazardId, note),
    onSuccess: () => invalidateAfterHazardChange(queryClient, hazardId),
  });
}
