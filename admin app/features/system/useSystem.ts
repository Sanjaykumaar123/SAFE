import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { dataQualityApi, systemApi } from '@/services/api/systemApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useLocationStore } from '@/store/locationStore';
import { POLL_INTERVAL_MS } from '@/constants/config';

export function useSystemHealth() {
  return useQuery({ queryKey: queryKeys.systemHealth(), queryFn: () => systemApi.health(), refetchInterval: POLL_INTERVAL_MS });
}

export function useApiMonitoring() {
  return useQuery({ queryKey: queryKeys.apiMonitoring(), queryFn: () => systemApi.apiMonitoring() });
}

export function useDatabaseHealth() {
  return useQuery({ queryKey: queryKeys.databaseHealth(), queryFn: () => systemApi.databaseHealth() });
}

export function useStorageHealth() {
  return useQuery({ queryKey: queryKeys.storageHealth(), queryFn: () => systemApi.storageHealth() });
}

export function useDataQuality() {
  const place = useLocationStore((s) => s.place);
  return useQuery({
    queryKey: queryKeys.dataQuality(place?.id ?? null, place?.radiusKm ?? 0),
    queryFn: () => dataQualityApi.summary(place, place?.radiusKm ?? 0),
  });
}

export function useAnomalies(severity?: string) {
  return useQuery({ queryKey: queryKeys.anomalies(severity), queryFn: () => dataQualityApi.anomalies(severity) });
}

export function useResolveAnomaly() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'REVIEW' | 'IGNORE' | 'FLAG' | 'BLOCK' }) => dataQualityApi.resolveAnomaly(id, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'anomalies'] }),
  });
}
