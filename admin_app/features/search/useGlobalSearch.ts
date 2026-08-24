import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { SEARCH_DEBOUNCE_MS } from '@/constants/config';
import { queryKeys } from '@/services/api/queryKeys';
import { searchApi } from '@/services/api/searchApi';

export function useGlobalSearch(rawQuery: string) {
  const [debounced, setDebounced] = useState(rawQuery);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(rawQuery), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [rawQuery]);

  return useQuery({
    queryKey: queryKeys.globalSearch(debounced),
    queryFn: () => searchApi.search(debounced),
    enabled: debounced.trim().length > 1,
  });
}
