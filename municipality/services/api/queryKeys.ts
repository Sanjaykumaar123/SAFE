/** Centralized TanStack Query key factory — avoids ad-hoc key arrays
 * scattered across screens (a common cause of stale-cache bugs). Section
 * 58's invalidation rules are implemented against these keys. */
export const queryKeys = {
  me: () => ['municipality', 'me'] as const,
  cities: () => ['municipality', 'cities'] as const,
  dashboard: (cityId: string) => ['municipality', 'dashboard', cityId] as const,
  hazards: (cityId: string, filters?: unknown) => ['municipality', 'hazards', cityId, filters] as const,
  hazardsMap: (cityId: string, viewport?: unknown, filters?: unknown) => ['municipality', 'hazards', 'map', cityId, viewport, filters] as const,
  hazardDetail: (id: string) => ['municipality', 'hazards', 'detail', id] as const,
  hazardVerification: (id: string) => ['municipality', 'hazards', 'verification', id] as const,
  hazardTimeline: (id: string) => ['municipality', 'hazards', 'timeline', id] as const,
  repairs: (cityId: string, status?: string) => ['municipality', 'repairs', cityId, status] as const,
  repairDetail: (id: string) => ['municipality', 'repairs', 'detail', id] as const,
  analyticsSummary: (cityId: string) => ['municipality', 'analytics', 'summary', cityId] as const,
  analyticsWards: (cityId: string) => ['municipality', 'analytics', 'wards', cityId] as const,
  analyticsSeverity: (cityId: string) => ['municipality', 'analytics', 'severity', cityId] as const,
  analyticsResolution: (cityId: string) => ['municipality', 'analytics', 'resolution', cityId] as const,
  analyticsRecurring: (cityId: string) => ['municipality', 'analytics', 'recurring', cityId] as const,
  analyticsCoverage: (cityId: string) => ['municipality', 'analytics', 'coverage', cityId] as const,
  notifications: () => ['municipality', 'notifications'] as const,
};
