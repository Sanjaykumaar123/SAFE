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
 * `process.env.EXPO_PUBLIC_*` directly. */
export const API_URL = getResolvedApiUrl();
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
export const MAP_KEY = process.env.EXPO_PUBLIC_MAP_KEY ?? '';

export const REQUEST_TIMEOUT_MS = 15000;

/** Dashboard/notification polling cadence (section 73 — MVP uses polling,
 * not a hardcoded aggressive refetch). */
export const DASHBOARD_POLL_MS = 45000;
export const NOTIFICATIONS_POLL_MS = 60000;

export const DEFAULT_MAP_CENTER = { latitude: 13.0827, longitude: 80.2707 }; // Chennai
export const DEFAULT_MAP_DELTA = { latitudeDelta: 0.08, longitudeDelta: 0.08 };
