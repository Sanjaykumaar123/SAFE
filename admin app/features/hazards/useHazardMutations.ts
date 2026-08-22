/** §17/§53/§55 — hazard validation/merge/reopen mutations. Every mutation
 * invalidates both the detail and every list query so the funnel tabs
 * (§14) and dashboard KPIs stay consistent after an action (§62: admin
 * changes propagate through the backend, and every cache that reads the
 * same entity must reflect it). */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { hazardsApi } from '@/services/api/hazardsApi';

function useInvalidateHazards() {
  const queryClient = useQueryClient();
  return (id: string) => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'hazards'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'hazards', 'detail', id] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'action-required'] });
  };
}

export function useVerifyHazard() {
  const invalidate = useInvalidateHazards();
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) => hazardsApi.verify(id, version),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });
}

export function useRejectHazard() {
  const invalidate = useInvalidateHazards();
  return useMutation({
    mutationFn: ({ id, version, reason }: { id: string; version: number; reason: string }) => hazardsApi.reject(id, version, reason),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });
}

export function useReopenHazard() {
  const invalidate = useInvalidateHazards();
  return useMutation({
    mutationFn: ({ id, version, reason }: { id: string; version: number; reason: string }) => hazardsApi.reopen(id, version, reason),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });
}

export function useFlagHazard() {
  const invalidate = useInvalidateHazards();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => hazardsApi.flag(id, reason),
    onSuccess: (_data, vars) => invalidate(vars.id),
  });
}

export function useMergeHazards() {
  const invalidate = useInvalidateHazards();
  return useMutation({
    mutationFn: ({ canonicalId, mergedId, version }: { canonicalId: string; mergedId: string; version: number }) => hazardsApi.merge(canonicalId, mergedId, version),
    onSuccess: (_data, vars) => {
      invalidate(vars.canonicalId);
      invalidate(vars.mergedId);
    },
  });
}
