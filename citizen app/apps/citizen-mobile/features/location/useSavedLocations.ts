import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { locationsApi } from '@/services/api/locationsApi';
import { queryKeys } from '@/services/api/queryKeys';
import type { CreateSavedLocationPayload } from '@/types';

export function useSavedLocations() {
  return useQuery({ queryKey: queryKeys.savedLocations(), queryFn: () => locationsApi.list() });
}

export function useCreateSavedLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSavedLocationPayload) => locationsApi.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.savedLocations() }),
  });
}

export function useDeleteSavedLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => locationsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.savedLocations() }),
  });
}
