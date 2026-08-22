import { useQuery } from '@tanstack/react-query';

import { analyticsApi } from '@/services/api/analyticsApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useLocationStore } from '@/store/locationStore';

export function useAnalyticsSummary() {
  const place = useLocationStore((s) => s.place);
  return useQuery({
    queryKey: queryKeys.analyticsSummary(place?.id ?? null, place?.radiusKm ?? 0),
    queryFn: () => analyticsApi.summary(place, place?.radiusKm ?? 0),
  });
}

export function useCityPerformance() {
  return useQuery({ queryKey: queryKeys.cityPerformance(), queryFn: () => analyticsApi.cityPerformance() });
}

export function useHazardTrends() {
  const place = useLocationStore((s) => s.place);
  return useQuery({
    queryKey: queryKeys.hazardTrends(place?.id ?? null),
    queryFn: () => analyticsApi.hazardTrends(place, place?.radiusKm ?? 0),
  });
}
