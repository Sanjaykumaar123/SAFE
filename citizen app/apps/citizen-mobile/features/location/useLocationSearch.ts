import { useQuery } from '@tanstack/react-query';

import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { locationsApi } from '@/services/api/locationsApi';
import { queryKeys } from '@/services/api/queryKeys';

export function useLocationSearch(rawQuery: string) {
  const query = useDebouncedValue(rawQuery.trim(), 350);
  return useQuery({
    queryKey: queryKeys.locationSearch(query),
    queryFn: () => locationsApi.search(query),
    enabled: query.length >= 2,
  });
}
