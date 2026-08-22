import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { municipalityApi } from '@/services/api/municipalityApi';
import { queryKeys } from '@/services/api/queryKeys';
import type { InspectionDecisionPayload, RepairCreatePayload, RepairProgressPayload } from '@/types/municipality';

export function useRepairs(cityId: string | null, status?: string) {
  return useQuery({
    queryKey: cityId ? queryKeys.repairs(cityId, status) : ['municipality', 'repairs', 'disabled'],
    queryFn: () => municipalityApi.repairs(cityId!, status),
    enabled: cityId !== null,
    staleTime: 15_000,
  });
}

export function useRepairDetail(repairId: string | null) {
  return useQuery({
    queryKey: repairId ? queryKeys.repairDetail(repairId) : ['municipality', 'repairs', 'detail', 'disabled'],
    queryFn: () => municipalityApi.repairDetail(repairId!),
    enabled: repairId !== null,
    staleTime: 10_000,
  });
}

function invalidateRepairs(queryClient: ReturnType<typeof useQueryClient>, hazardId?: string) {
  queryClient.invalidateQueries({ queryKey: ['municipality', 'repairs'] });
  queryClient.invalidateQueries({ queryKey: ['municipality', 'dashboard'] });
  if (hazardId) {
    queryClient.invalidateQueries({ queryKey: queryKeys.hazardDetail(hazardId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.hazardTimeline(hazardId) });
  }
  queryClient.invalidateQueries({ queryKey: ['municipality', 'hazards'] });
}

export function useAssignRepair() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RepairCreatePayload) => municipalityApi.createRepair(payload),
    onSuccess: (repair) => invalidateRepairs(queryClient, repair.hazardId),
  });
}

export function useAddRepairProgress(repairId: string, hazardId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RepairProgressPayload) => municipalityApi.addRepairProgress(repairId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.repairDetail(repairId) });
      invalidateRepairs(queryClient, hazardId);
    },
  });
}

export function useMarkReadyForInspection(repairId: string, hazardId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => municipalityApi.markReadyForInspection(repairId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.repairDetail(repairId) });
      invalidateRepairs(queryClient, hazardId);
    },
  });
}

export function useCreateInspection(repairId: string, hazardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InspectionDecisionPayload) => municipalityApi.createInspection(repairId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.repairDetail(repairId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.hazardDetail(hazardId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.hazardVerification(hazardId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.hazardTimeline(hazardId) });
      invalidateRepairs(queryClient, hazardId);
    },
  });
}
