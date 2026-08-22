/** §30–33/§63 — AI Control Center hooks. `useUpdateAiConfig` is the client
 * half of §63's flow: admin submits a reason, backend persists the config
 * + audit event, fleet inference reads the new threshold next cycle. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { aiApi } from '@/services/api/aiApi';
import { queryKeys } from '@/services/api/queryKeys';
import type { AiConfig } from '@/types/admin';

export function useAiStatus() {
  return useQuery({ queryKey: queryKeys.aiStatus(), queryFn: () => aiApi.status(), staleTime: 15_000 });
}

export function useAiConfig() {
  return useQuery({ queryKey: queryKeys.aiConfig(), queryFn: () => aiApi.config() });
}

export function useUpdateAiConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patch, version }: { patch: Partial<AiConfig> & { reason: string }; version: number }) => aiApi.updateConfig(patch, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiConfig() });
      queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] });
    },
  });
}

export function useAiModels() {
  return useQuery({ queryKey: queryKeys.aiModels(), queryFn: () => aiApi.models() });
}

export function usePromoteModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, target }: { id: string; target: 'STAGING' | 'PRODUCTION' }) => aiApi.promoteModel(id, target),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.aiModels() }),
  });
}

export function useRollbackModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aiApi.rollbackModel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.aiModels() }),
  });
}

export function useAiPerformance() {
  return useQuery({ queryKey: queryKeys.aiPerformance(), queryFn: () => aiApi.performance() });
}
