import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { cityApi, municipalityApi } from '@/services/api/cityApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useLocationStore } from '@/store/locationStore';
import type { City, CityConfig } from '@/types/admin';

export function useCities(query = '') {
  return useQuery({ queryKey: queryKeys.cities(query), queryFn: () => cityApi.list(query) });
}

export function useCityDetail(id: string) {
  return useQuery({ queryKey: queryKeys.cityDetail(id), queryFn: () => cityApi.detail(id), enabled: !!id });
}

export function useCityConfig(id: string) {
  return useQuery({ queryKey: queryKeys.cityConfig(id), queryFn: () => cityApi.config(id), enabled: !!id });
}

export function useUpdateCityConfig(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<CityConfig>) => cityApi.updateConfig(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cityConfig(id) }),
  });
}

export function useSetCityStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: City['status'] }) => cityApi.setStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'cities'] }),
  });
}

export function useMunicipalities() {
  const place = useLocationStore((s) => s.place);
  return useQuery({
    queryKey: queryKeys.municipalities(place?.cityId ?? null),
    queryFn: () => municipalityApi.list(place?.cityId),
  });
}

export function useMunicipalityDetail(id: string) {
  return useQuery({ queryKey: queryKeys.municipalityDetail(id), queryFn: () => municipalityApi.detail(id), enabled: !!id });
}

export function useDisableMunicipalityAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => municipalityApi.disableAccess(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'municipalities'] }),
  });
}
