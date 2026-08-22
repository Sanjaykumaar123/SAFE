/** Centralized TanStack Query key factory — avoids ad-hoc key arrays
 * scattered across screens (a common cause of stale-cache bugs). Every
 * location-scoped key includes the place id + radius so switching the
 * searched place/radius (§concept) naturally invalidates the right
 * queries without a manual invalidate call. */
export const queryKeys = {
  me: () => ['admin', 'me'] as const,

  dashboard: (placeId: string | null, radiusKm: number) => ['admin', 'dashboard', placeId, radiusKm] as const,
  activity: (placeId: string | null) => ['admin', 'activity', placeId] as const,
  actionRequired: (placeId: string | null, radiusKm: number) => ['admin', 'action-required', placeId, radiusKm] as const,

  hazards: (placeId: string | null, radiusKm: number, tab: string, filters?: unknown) =>
    ['admin', 'hazards', placeId, radiusKm, tab, filters] as const,
  hazardDetail: (id: string) => ['admin', 'hazards', 'detail', id] as const,
  duplicateCandidates: (id: string) => ['admin', 'hazards', 'duplicates', id] as const,

  citizenReports: (placeId: string | null, radiusKm: number, tab: string) => ['admin', 'reports', placeId, radiusKm, tab] as const,

  users: (query: string, filters?: unknown) => ['admin', 'users', query, filters] as const,
  userDetail: (id: string) => ['admin', 'users', 'detail', id] as const,

  cities: (query: string) => ['admin', 'cities', query] as const,
  cityDetail: (id: string) => ['admin', 'cities', 'detail', id] as const,
  cityConfig: (id: string) => ['admin', 'cities', 'config', id] as const,

  municipalities: (placeId: string | null) => ['admin', 'municipalities', placeId] as const,
  municipalityDetail: (id: string) => ['admin', 'municipalities', 'detail', id] as const,

  fleetSummary: (placeId: string | null, radiusKm: number) => ['admin', 'fleet', 'summary', placeId, radiusKm] as const,
  vehicles: (placeId: string | null, radiusKm: number, status?: string) => ['admin', 'fleet', 'vehicles', placeId, radiusKm, status] as const,
  vehicleDetail: (id: string) => ['admin', 'fleet', 'vehicles', 'detail', id] as const,
  operators: (placeId: string | null, radiusKm: number) => ['admin', 'fleet', 'operators', placeId, radiusKm] as const,
  operatorDetail: (id: string) => ['admin', 'fleet', 'operators', 'detail', id] as const,
  fleetQuality: (placeId: string | null, radiusKm: number) => ['admin', 'fleet', 'quality', placeId, radiusKm] as const,
  payments: (status?: string) => ['admin', 'fleet', 'payments', status] as const,

  aiStatus: () => ['admin', 'ai', 'status'] as const,
  aiConfig: () => ['admin', 'ai', 'config'] as const,
  aiModels: () => ['admin', 'ai', 'models'] as const,
  aiPerformance: () => ['admin', 'ai', 'performance'] as const,

  analyticsSummary: (placeId: string | null, radiusKm: number) => ['admin', 'analytics', 'summary', placeId, radiusKm] as const,
  cityPerformance: () => ['admin', 'analytics', 'city-performance'] as const,
  hazardTrends: (placeId: string | null) => ['admin', 'analytics', 'trends', placeId] as const,

  dataQuality: (placeId: string | null, radiusKm: number) => ['admin', 'data-quality', placeId, radiusKm] as const,
  anomalies: (severity?: string) => ['admin', 'anomalies', severity] as const,

  systemHealth: () => ['admin', 'system', 'health'] as const,
  apiMonitoring: () => ['admin', 'system', 'api'] as const,
  databaseHealth: () => ['admin', 'system', 'database'] as const,
  storageHealth: () => ['admin', 'system', 'storage'] as const,

  notifications: () => ['admin', 'notifications'] as const,
  featureFlags: () => ['admin', 'feature-flags'] as const,
  appVersions: () => ['admin', 'app-versions'] as const,
  maintenanceMode: () => ['admin', 'maintenance-mode'] as const,

  auditLogs: (filters?: unknown) => ['admin', 'audit-logs', filters] as const,

  globalSearch: (query: string) => ['admin', 'search', query] as const,
  geocode: (query: string) => ['admin', 'geocode', query] as const,
  popularPlaces: () => ['admin', 'geocode', 'popular'] as const,
};
