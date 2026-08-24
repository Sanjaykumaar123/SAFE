import { useQuery } from '@tanstack/react-query';

import { reportsApi } from '@/services/api/reportsApi';
import { queryKeys } from '@/services/api/queryKeys';

export function useMyReports(tab: 'all' | 'active' | 'resolved') {
  return useQuery({
    queryKey: queryKeys.reportsMe(tab),
    queryFn: () => reportsApi.mine(tab),
    staleTime: 15_000,
  });
}
