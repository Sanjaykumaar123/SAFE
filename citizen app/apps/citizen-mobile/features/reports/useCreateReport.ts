import { useMutation, useQueryClient } from '@tanstack/react-query';

import { reportsApi } from '@/services/api/reportsApi';
import type { CreateReportPayload } from '@/types';

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReportPayload) => reportsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });
      queryClient.invalidateQueries({ queryKey: ['hazards'] });
    },
  });
}
