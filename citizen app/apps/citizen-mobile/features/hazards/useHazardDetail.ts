import { useQuery } from '@tanstack/react-query';

import { hazardsApi } from '@/services/api/hazardsApi';
import { queryKeys } from '@/services/api/queryKeys';

export function useHazardDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.hazardDetail(id ?? ''),
    queryFn: () => hazardsApi.detail(id as string),
    enabled: !!id,
  });
}
