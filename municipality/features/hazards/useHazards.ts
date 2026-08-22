import { useQuery } from '@tanstack/react-query';

import { municipalityApi, type HazardFilters, type MapViewport } from '@/services/api/municipalityApi';
import { queryKeys } from '@/services/api/queryKeys';

/** Section 18/20/57 — always server-filtered (city + optional viewport +
 * filters), never "fetch everything, filter on the client". */
export function useHazards(cityId: string | null, filters: HazardFilters = {}, viewport?: MapViewport) {
  return useQuery({
    queryKey: cityId ? (viewport ? queryKeys.hazardsMap(cityId, viewport, filters) : queryKeys.hazards(cityId, filters)) : ['municipality', 'hazards', 'disabled'],
    queryFn: () => municipalityApi.hazards(cityId!, filters, viewport),
    enabled: cityId !== null,
    staleTime: 15_000,
  });
}
