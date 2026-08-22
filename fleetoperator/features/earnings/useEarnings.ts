import { useQuery } from '@tanstack/react-query';

import { fleetApi } from '@/services/api/fleetApi';
import { queryKeys } from '@/services/api/queryKeys';

export function useEarnings() {
  return useQuery({
    queryKey: queryKeys.earnings(),
    queryFn: () => fleetApi.earnings(),
  });
}

export function usePayments() {
  return useQuery({
    queryKey: queryKeys.payments(),
    queryFn: () => fleetApi.payments(),
  });
}
