import Constants from 'expo-constants';

function getResolvedApiUrl(): string {
  try {
    const envUrl = process.env.EXPO_PUBLIC_API_URL;
    if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      return envUrl;
    }
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost || (Constants as any)?.manifest?.debuggerHost;
    if (hostUri) {
      const hostIp = hostUri.split(':')[0];
      if (hostIp) {
        return `http://${hostIp}:8000/api`;
      }
    }
    return envUrl ?? 'http://10.0.2.2:8000/api';
  } catch {
    return process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000/api';
  }
}

/** Centralized environment/config reads — nothing else touches
 * `process.env.EXPO_PUBLIC_*` directly (section 40/54). */
export const API_URL = getResolvedApiUrl();
export const AI_PROVIDER = (process.env.EXPO_PUBLIC_AI_PROVIDER ?? 'yolov8') as 'mock' | 'yolov8';
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE !== 'false';

/** OSRM-compatible routing server used by the Safe Route feature
 * (`services/routing/osrmApi.ts`). Defaults to the public OSRM demo
 * server — free and keyless, but rate-limited and not meant for
 * production traffic. Point this at a self-hosted OSRM instance (or swap
 * the routing service for a commercial directions API) before shipping. */
export const ROUTING_BASE_URL = process.env.EXPO_PUBLIC_ROUTING_URL ?? 'https://router.project-osrm.org';

export const DEFAULT_CITY = 'Chennai';
export const DEFAULT_RADIUS_METERS = 5000;
export const REQUEST_TIMEOUT_MS = 15000;

/** Fallback map center used only until the device's live location resolves
 * (first launch, permission still pending, indoors with a slow GPS fix) —
 * keeps the map centered on `DEFAULT_CITY` instead of the null-island
 * (0,0) ocean coordinate. */
export const DEFAULT_MAP_CENTER = { latitude: 13.0827, longitude: 80.2707 };

