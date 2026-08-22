import { useQuery } from '@tanstack/react-query';

import { fleetApi } from '@/services/api/fleetApi';
import { queryKeys } from '@/services/api/queryKeys';

export function useMyObservations() {
  return useQuery({
    queryKey: queryKeys.observations(),
    queryFn: () => fleetApi.myObservations(),
  });
}

export function useObservationDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.observationDetail(id ?? 'disabled'),
    queryFn: () => fleetApi.getObservation(id as string),
    enabled: Boolean(id),
  });
}
