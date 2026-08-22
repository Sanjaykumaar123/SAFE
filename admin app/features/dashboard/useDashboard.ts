import { useQuery } from '@tanstack/react-query';

import { dashboardApi } from '@/services/api/dashboardApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useLocationStore } from '@/store/locationStore';

export function useDashboardKpis() {
  const place = useLocationStore((s) => s.place);
  return useQuery({
    queryKey: queryKeys.dashboard(place?.id ?? null, place?.radiusKm ?? 0),
    queryFn: () => dashboardApi.kpis(place, place?.radiusKm ?? 0),
  });
}

export function useSystemStatusSummary() {
  return useQuery({ queryKey: ['admin', 'system', 'summary'], queryFn: () => dashboardApi.systemStatus(), staleTime: 30_000 });
}

export function useActivityFeed() {
  const place = useLocationStore((s) => s.place);
  return useQuery({ queryKey: queryKeys.activity(place?.id ?? null), queryFn: () => dashboardApi.activity() });
}

export function useActionRequired() {
  const place = useLocationStore((s) => s.place);
  return useQuery({
    queryKey: queryKeys.actionRequired(place?.id ?? null, place?.radiusKm ?? 0),
    queryFn: () => dashboardApi.actionRequired(place, place?.radiusKm ?? 0),
  });
}
