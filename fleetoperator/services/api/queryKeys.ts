/** Centralized TanStack Query key factory — avoids ad-hoc key arrays
 * scattered across screens. */
export const queryKeys = {
  me: () => ['fleet', 'me'] as const,
  todayRoute: () => ['fleet', 'routes', 'today'] as const,
  currentSession: () => ['fleet', 'sessions', 'current'] as const,
  sessionDetail: (id: string) => ['fleet', 'sessions', 'detail', id] as const,
  sessionHistory: () => ['fleet', 'sessions', 'history'] as const,
  observations: () => ['fleet', 'observations'] as const,
  observationDetail: (id: string) => ['fleet', 'observations', 'detail', id] as const,
  earnings: () => ['fleet', 'earnings'] as const,
  payments: () => ['fleet', 'payments'] as const,
  notifications: () => ['fleet', 'notifications'] as const,
};
