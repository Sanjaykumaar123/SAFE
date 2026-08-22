import { useQuery } from '@tanstack/react-query';

import { municipalityApi } from '@/services/api/municipalityApi';
import { queryKeys } from '@/services/api/queryKeys';

export function useAnalyticsSummary(cityId: string | null) {
  return useQuery({
    queryKey: cityId ? queryKeys.analyticsSummary(cityId) : ['municipality', 'analytics', 'summary', 'disabled'],
    queryFn: () => municipalityApi.analyticsSummary(cityId!),
    enabled: cityId !== null,
    staleTime: 30_000,
  });
}

export function useAnalyticsWards(cityId: string | null) {
  return useQuery({
    queryKey: cityId ? queryKeys.analyticsWards(cityId) : ['municipality', 'analytics', 'wards', 'disabled'],
    queryFn: () => municipalityApi.analyticsWards(cityId!),
    enabled: cityId !== null,
    staleTime: 30_000,
  });
}

export function useAnalyticsSeverity(cityId: string | null) {
  return useQuery({
    queryKey: cityId ? queryKeys.analyticsSeverity(cityId) : ['municipality', 'analytics', 'severity', 'disabled'],
    queryFn: () => municipalityApi.analyticsSeverity(cityId!),
    enabled: cityId !== null,
    staleTime: 30_000,
  });
}

export function useAnalyticsResolution(cityId: string | null) {
  return useQuery({
    queryKey: cityId ? queryKeys.analyticsResolution(cityId) : ['municipality', 'analytics', 'resolution', 'disabled'],
    queryFn: () => municipalityApi.analyticsResolution(cityId!),
    enabled: cityId !== null,
    staleTime: 30_000,
  });
}

export function useAnalyticsRecurring(cityId: string | null) {
  return useQuery({
    queryKey: cityId ? queryKeys.analyticsRecurring(cityId) : ['municipality', 'analytics', 'recurring', 'disabled'],
    queryFn: () => municipalityApi.analyticsRecurring(cityId!),
    enabled: cityId !== null,
    staleTime: 30_000,
  });
}

export function useAnalyticsCoverage(cityId: string | null) {
  return useQuery({
    queryKey: cityId ? queryKeys.analyticsCoverage(cityId) : ['municipality', 'analytics', 'coverage', 'disabled'],
    queryFn: () => municipalityApi.analyticsCoverage(cityId!),
    enabled: cityId !== null,
    staleTime: 30_000,
  });
}
