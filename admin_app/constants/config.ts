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
    return envUrl ? envUrl.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2') : 'http://10.0.2.2:8000/api';
  } catch {
    return process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000/api';
  }
}

/** Centralized environment/config reads — nothing else touches
 * `process.env.EXPO_PUBLIC_*` directly (§80: no database URL ever lives in
 * a client env var, only this HTTP API base). */
export const API_URL = getResolvedApiUrl();
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
export const MAP_KEY = process.env.EXPO_PUBLIC_MAP_KEY ?? '';
export const GEOCODE_URL = process.env.EXPO_PUBLIC_GEOCODE_URL ?? 'https://nominatim.openstreetmap.org';

export const REQUEST_TIMEOUT_MS = 15000;

/** §11 — polling interval for admin notifications / live system status
 * while a relevant screen is focused (no realtime/websocket layer in this
 * pass, see DEFERRED.md). */
export const POLL_INTERVAL_MS = 30_000;

/** India, roughly centered — the map's starting viewport before any place
 * is searched (§concept: "this is for all over India"). */
export const INDIA_MAP_CENTER = { latitude: 22.3511, longitude: 78.6677 };
export const INDIA_MAP_DELTA = { latitudeDelta: 24, longitudeDelta: 24 };
export const DEFAULT_MAP_DELTA = { latitudeDelta: 0.35, longitudeDelta: 0.35 };

/** §57 — global search debounce, shared by the place-search bar and the
 * entity global-search screen. */
export const SEARCH_DEBOUNCE_MS = 350;

export const RECENT_SEARCHES_KEY = 'safepath.admin.recentSearches';
export const RECENT_SEARCHES_LIMIT = 8;
