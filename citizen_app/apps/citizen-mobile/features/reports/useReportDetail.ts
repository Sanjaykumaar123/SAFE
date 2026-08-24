import { useQuery } from '@tanstack/react-query';

import { reportsApi } from '@/services/api/reportsApi';
import { queryKeys } from '@/services/api/queryKeys';

export function useReportDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.reportDetail(id ?? ''),
    queryFn: () => reportsApi.detail(id as string),
    enabled: !!id,
  });
}
