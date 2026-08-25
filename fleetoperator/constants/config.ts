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

/** §07 — which IAIInferenceService implementation `services/ai/index.ts`
 * hands out. "ondevice" throws until a real native model is wired up (see
 * DEFERRED.md). */
export type AIMode = 'mock' | 'server' | 'ondevice';
export const AI_MODE: AIMode = (process.env.EXPO_PUBLIC_AI_MODE as AIMode) ?? 'server';

/** §09 — inferences per second while monitoring is active, at low speed
 * (see `resolveMonitoringParams` below for the speed-adaptive schedule
 * this is the baseline/fallback for). The camera preview itself is
 * unaffected; this only throttles how often a frame is handed to the
 * inference service. */
export const AI_FRAME_RATE = Number(process.env.EXPO_PUBLIC_AI_FRAME_RATE ?? 5);

/** §82 — a detection below this confidence never becomes a road
 * observation (mirrors the backend's own AI_CONFIDENCE_THRESHOLD in
 * app/api/v1/fleet/observations.py — kept in sync manually, both are
 * documented constants rather than hardcoded numbers scattered around). */
export const AI_CONFIDENCE_THRESHOLD = 0.5;

/** §10/26 — temporal dedup baseline (low speed, see `resolveMonitoringParams`
 * below): this many consecutive detections of the same hazard within
 * TRACKING_WINDOW_MS finalize into one observation. */
export const TRACKING_CONFIRM_COUNT = 3;
export const TRACKING_WINDOW_MS = 4000;
/** Minimum time after finalizing an observation before the tracker will
 * start a new one for the same physical spot (§26 "cooldown"). Not
 * speed-scaled — its job is spacing between *distinct* detections, not
 * fitting one detection's visibility window, so a fixed 8s (covering
 * ~50-180m depending on speed) is the right amount of "don't re-trigger
 * immediately" at any speed. */
export const TRACKING_COOLDOWN_MS = 8000;

/**
 * §speed-adaptive-detection — "if a car moves at 80kmph, potholes should
 * still be detected". A pothole is only in a dashcam frame's clearly-
 * identifiable field of view for a limited stretch of road ahead of the
 * vehicle (assumed here as ~8m — the frame stops giving a clean, croppable
 * view of it much closer than that as the hazard nears the bottom edge).
 * At a fixed 5fps/3-confirms/4s-window (the low-speed defaults above),
 * that 8m window passes in well under a second once the vehicle is doing
 * highway speed, so the tracker never accumulates enough consecutive
 * detections to finalize an observation — the pothole is real, seen, but
 * silently dropped. This table scales inference rate up and the
 * confirmation requirement down as measured GPS speed increases, so the
 * same physical hazard still gets enough frames inside its visibility
 * window to confirm before it's behind the vehicle.
 *
 * `minSpeedMps` are inclusive lower bounds — buckets are checked from the
 * end of this array backwards (fastest bucket whose threshold the current
 * speed clears wins). 22.2 m/s ≈ 80 km/h, the speed named explicitly in
 * the product requirement.
 */
export interface MonitoringParams {
  frameRateFps: number;
  trackingConfirmCount: number;
  trackingWindowMs: number;
}

export const SPEED_MONITORING_BUCKETS: (MonitoringParams & { minSpeedMps: number })[] = [
  { minSpeedMps: 0, frameRateFps: AI_FRAME_RATE, trackingConfirmCount: TRACKING_CONFIRM_COUNT, trackingWindowMs: TRACKING_WINDOW_MS }, // <30 km/h
  { minSpeedMps: 8.33, frameRateFps: 8, trackingConfirmCount: 3, trackingWindowMs: 1800 }, // 30-60 km/h
  { minSpeedMps: 16.67, frameRateFps: 12, trackingConfirmCount: 2, trackingWindowMs: 900 }, // 60-90 km/h — covers the 80km/h requirement
  { minSpeedMps: 25.0, frameRateFps: 15, trackingConfirmCount: 2, trackingWindowMs: 700 }, // >90 km/h
];

/** `speedMps` is `LocationFix.speed` from `services/location/locationService.ts`
 * (null before the first GPS fix, or on devices that don't report speed —
 * falls back to the low-speed baseline, the safe default). */
export function resolveMonitoringParams(speedMps: number | null): MonitoringParams {
  if (speedMps == null || !Number.isFinite(speedMps) || speedMps < 0) {
    return SPEED_MONITORING_BUCKETS[0];
  }
  let params = SPEED_MONITORING_BUCKETS[0];
  for (const bucket of SPEED_MONITORING_BUCKETS) {
    if (speedMps >= bucket.minSpeedMps) params = bucket;
  }
  return params;
}

/** §24 — GPS sampling while monitoring, not a raw per-second write. */
export const LOCATION_SAMPLE_INTERVAL_MS = 2000;
export const LOCATION_SAMPLE_DISTANCE_M = 5;

/** §29 — batch upload size and retry cadence for the offline queue. */
export const SYNC_BATCH_SIZE = 20;
export const SYNC_RETRY_BASE_DELAY_MS = 4000;
export const SYNC_MAX_RETRIES = 6;

export const DEFAULT_MAP_CENTER = { latitude: 13.0827, longitude: 80.2707 }; // Chennai
export const DEFAULT_MAP_DELTA = { latitudeDelta: 0.08, longitudeDelta: 0.08 };
