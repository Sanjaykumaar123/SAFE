import { useQuery } from '@tanstack/react-query';

import { hazardsApi } from '@/services/api/hazardsApi';
import { queryKeys } from '@/services/api/queryKeys';

export function useHazardDetail(id: string) {
  return useQuery({ queryKey: queryKeys.hazardDetail(id), queryFn: () => hazardsApi.detail(id), enabled: !!id });
}

export function useDuplicateCandidates(id: string) {
  return useQuery({ queryKey: queryKeys.duplicateCandidates(id), queryFn: () => hazardsApi.duplicateCandidates(id), enabled: !!id });
}
