import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { citizenReportsApi } from '@/services/api/citizenReportsApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useLocationStore } from '@/store/locationStore';
import type { CitizenReport } from '@/types/admin';

export function useCitizenReports(tab: 'ALL' | CitizenReport['status']) {
  const place = useLocationStore((s) => s.place);
  return useQuery({
    queryKey: queryKeys.citizenReports(place?.id ?? null, place?.radiusKm ?? 0, tab),
    queryFn: () => citizenReportsApi.list({ place, radiusKm: place?.radiusKm ?? 0, tab }),
  });
}

export function useVerifyReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => citizenReportsApi.verify(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  });
}

export function useRejectReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => citizenReportsApi.reject(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] }),
  });
}
