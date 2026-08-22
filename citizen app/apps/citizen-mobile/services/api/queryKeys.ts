/** Centralized TanStack Query key factory — avoids ad-hoc key arrays
 * scattered across screens, which is a common cause of stale-cache bugs. */
export const queryKeys = {
  home: (lat: number, lon: number) => ['home', lat, lon] as const,
  hazardsNearby: (lat: number, lon: number, radius: number, filters?: Record<string, unknown>) =>
    ['hazards', 'nearby', lat, lon, radius, filters] as const,
  hazardDetail: (id: string) => ['hazards', 'detail', id] as const,
  reportsMe: (tab: string) => ['reports', 'me', tab] as const,
  reportDetail: (id: string) => ['reports', 'detail', id] as const,
  notifications: () => ['notifications'] as const,
  savedLocations: () => ['locations', 'saved'] as const,
  locationSearch: (query: string) => ['locations', 'search', query] as const,
  currentUser: () => ['auth', 'me'] as const,
};
