/** Normalized shape every API error is translated into by the API client —
 * screens branch on `.message` / `.status`, never a raw axios error. */
export interface ApiError {
  status: number | null;
  message: string;
  isNetworkError: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

/** §12/§79 — every list/map endpoint in this app is paginated or
 * viewport-scoped server-side; nothing ever loads a whole table (§79). */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** §82 — optimistic-concurrency fields present on every mutable admin
 * entity (hazard, city, feature flag, AI config, …). A 409 on write means
 * "this record changed elsewhere" (§82) and the screen must refetch rather
 * than silently overwrite. */
export interface Versioned {
  version: number;
  updatedAt: string;
}
