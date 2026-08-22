import { useQuery } from '@tanstack/react-query';

import { DASHBOARD_POLL_MS } from '@/constants/config';
import { municipalityApi } from '@/services/api/municipalityApi';
import { queryKeys } from '@/services/api/queryKeys';

/** Section 15 — one aggregated call backs the whole Dashboard screen. */
export function useDashboard(cityId: string | null) {
  return useQuery({
    queryKey: cityId ? queryKeys.dashboard(cityId) : ['municipality', 'dashboard', 'disabled'],
    queryFn: () => municipalityApi.dashboard(cityId!),
    enabled: cityId !== null,
    staleTime: 20_000,
    refetchInterval: DASHBOARD_POLL_MS, // section 73: gentle poll, not aggressive
  });
}
