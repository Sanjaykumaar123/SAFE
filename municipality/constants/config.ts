/** Centralized environment/config reads — nothing else touches
 * `process.env.EXPO_PUBLIC_*` directly. */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000/api';
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
export const MAP_KEY = process.env.EXPO_PUBLIC_MAP_KEY ?? '';

export const REQUEST_TIMEOUT_MS = 15000;

/** Dashboard/notification polling cadence (section 73 — MVP uses polling,
 * not a hardcoded aggressive refetch). */
export const DASHBOARD_POLL_MS = 45000;
export const NOTIFICATIONS_POLL_MS = 60000;

export const DEFAULT_MAP_CENTER = { latitude: 13.0827, longitude: 80.2707 }; // Chennai
export const DEFAULT_MAP_DELTA = { latitudeDelta: 0.08, longitudeDelta: 0.08 };
