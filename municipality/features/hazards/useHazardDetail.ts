import { useQuery } from '@tanstack/react-query';

import { municipalityApi } from '@/services/api/municipalityApi';
import { queryKeys } from '@/services/api/queryKeys';

export function useHazardDetail(hazardId: string | null) {
  return useQuery({
    queryKey: hazardId ? queryKeys.hazardDetail(hazardId) : ['municipality', 'hazards', 'detail', 'disabled'],
    queryFn: () => municipalityApi.hazardDetail(hazardId!),
    enabled: hazardId !== null,
    staleTime: 10_000,
  });
}

export function useHazardVerification(hazardId: string | null) {
  return useQuery({
    queryKey: hazardId ? queryKeys.hazardVerification(hazardId) : ['municipality', 'hazards', 'verification', 'disabled'],
    queryFn: () => municipalityApi.hazardVerification(hazardId!),
    enabled: hazardId !== null,
    staleTime: 10_000,
  });
}

export function useHazardTimeline(hazardId: string | null) {
  return useQuery({
    queryKey: hazardId ? queryKeys.hazardTimeline(hazardId) : ['municipality', 'hazards', 'timeline', 'disabled'],
    queryFn: () => municipalityApi.hazardTimeline(hazardId!),
    enabled: hazardId !== null,
    staleTime: 10_000,
  });
}
