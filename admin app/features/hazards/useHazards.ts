import { useQuery } from '@tanstack/react-query';

import type { HazardTab } from '@/constants/enums';
import { hazardsApi } from '@/services/api/hazardsApi';
import { queryKeys } from '@/services/api/queryKeys';
import { useLocationStore } from '@/store/locationStore';

export function useHazards(tab: HazardTab, query?: string) {
  const place = useLocationStore((s) => s.place);
  return useQuery({
    queryKey: queryKeys.hazards(place?.id ?? null, place?.radiusKm ?? 0, tab, query),
    queryFn: () => hazardsApi.list({ place, radiusKm: place?.radiusKm ?? 0, tab, query }),
  });
}
