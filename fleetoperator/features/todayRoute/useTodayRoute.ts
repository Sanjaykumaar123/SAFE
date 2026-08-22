import { useQuery } from '@tanstack/react-query';

import { fleetApi } from '@/services/api/fleetApi';
import { queryKeys } from '@/services/api/queryKeys';

export function useTodayRoute() {
  return useQuery({
    queryKey: queryKeys.todayRoute(),
    queryFn: () => fleetApi.todayRoute(),
  });
}
