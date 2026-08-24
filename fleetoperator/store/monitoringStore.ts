/**
 * §22/25/27 — the active-monitoring driving-screen state machine. This is
 * the one piece of client state that genuinely isn't "just a server cache"
 * (TanStack Query's job everywhere else): distance/detections/elapsed time
 * update many times a second locally while a session is live, well before
 * any of it reaches the backend.
 */
import { create } from 'zustand';
import * as Crypto from 'expo-crypto';

import { HealthState, type HealthStateType } from '@/constants/enums';
import { fleetApi } from '@/services/api/fleetApi';
import { observationQueue } from '@/services/offline/observationQueue';
import { locationService } from '@/services/location/locationService';
import type { FinalizedDetection } from '@/services/tracking/detectionTracker';
import type { CollectionSession, SessionStopResponse } from '@/types/fleet';

export type MonitoringPhase = 'idle' | 'starting' | 'active' | 'stopping' | 'stopped';

export interface DeviceHealth {
  gps: HealthStateType;
  camera: HealthStateType;
  ai: HealthStateType;
  network: HealthStateType;
}

interface MonitoringState {
  phase: MonitoringPhase;
  session: CollectionSession | null;
  startedAt: number | null;
  distanceKm: number;
  detectionCount: number;
  validObservationCount: number;
  lastDetection: FinalizedDetection | null;
  deviceHealth: DeviceHealth;
  tripSummary: SessionStopResponse | null;
  error: string | null;

  setDeviceHealth: (patch: Partial<DeviceHealth>) => void;
  canStart: () => boolean;
  start: (vehicleId: string | null, cityId: string | null) => Promise<void>;
  tickDistance: () => void;
  recordDetection: (detection: FinalizedDetection, imageUri: string | null, gpsAccuracy: number | null) => Promise<void>;
  stop: () => Promise<SessionStopResponse | null>;
  reset: () => void;
}

const initialHealth: DeviceHealth = {
  gps: HealthState.WARNING,
  camera: HealthState.WARNING,
  ai: HealthState.READY,
  network: HealthState.WARNING,
};

export const useMonitoringStore = create<MonitoringState>((set, get) => ({
  phase: 'idle',
  session: null,
  startedAt: null,
  distanceKm: 0,
  detectionCount: 0,
  validObservationCount: 0,
  lastDetection: null,
  deviceHealth: initialHealth,
  tripSummary: null,
  error: null,

  setDeviceHealth: (patch) => set((state) => ({ deviceHealth: { ...state.deviceHealth, ...patch } })),

  canStart: () => {
    const { phase } = get();
    return phase !== 'stopping';
  },

  start: async (vehicleId, cityId) => {
    set({ phase: 'starting', error: null, tripSummary: null });
    try {
      const fix = locationService.getLastFix();
      const session = await fleetApi.startSession({
        vehicleId,
        cityId,
        startLatitude: fix?.latitude ?? null,
        startLongitude: fix?.longitude ?? null,
        clientSessionId: await Crypto.randomUUID(),
      });
      await locationService.start();
      set({ phase: 'active', session, startedAt: Date.now(), distanceKm: 0, detectionCount: 0, validObservationCount: 0 });
    } catch (error) {
      set({ phase: 'idle', error: error instanceof Error ? error.message : 'Could not start monitoring.' });
      throw error;
    }
  },

  tickDistance: () => set({ distanceKm: locationService.getDistanceKm() }),

  recordDetection: async (detection, imageUri, gpsAccuracy) => {
    const { session } = get();
    if (!session) return;
    const fix = locationService.getLastFix();
    const clientObservationId = await Crypto.randomUUID();

    await observationQueue.enqueue(
      {
        clientObservationId,
        sessionId: session.id,
        latitude: fix?.latitude ?? 0,
        longitude: fix?.longitude ?? 0,
        observedAt: detection.result.frameTimestamp,
        hazardType: detection.result.hazardType ?? 'POTHOLE',
        confidence: detection.bestConfidence,
        severity: detection.result.severity,
        boundingBox: detection.result.boundingBox,
        modelName: detection.result.modelName,
        modelVersion: detection.result.modelVersion,
        gpsAccuracy: gpsAccuracy ?? fix?.accuracy ?? null,
        dataQuality: (fix?.accuracy ?? 999) <= 15 ? 'HIGH' : (fix?.accuracy ?? 999) <= 30 ? 'MEDIUM' : 'LOW',
      },
      imageUri
    );

    observationQueue.flush().catch(() => undefined);

    set((state) => ({
      detectionCount: state.detectionCount + 1,
      validObservationCount: state.validObservationCount + 1,
      lastDetection: detection,
    }));
  },

  stop: async () => {
    const { session } = get();
    if (!session) return null;
    set({ phase: 'stopping' });
    try {
      const fix = locationService.getLastFix();
      const response = await fleetApi.stopSession(session.id, {
        endLatitude: fix?.latitude ?? null,
        endLongitude: fix?.longitude ?? null,
        reportedDistanceKm: locationService.getDistanceKm(),
      });
      await locationService.stop();
      await observationQueue.flush().catch(() => undefined);
      set({ phase: 'stopped', session: response.session, tripSummary: response });
      return response;
    } catch (error) {
      set({ phase: 'active', error: error instanceof Error ? error.message : 'Could not stop monitoring.' });
      throw error;
    }
  },

  reset: () =>
    set({
      phase: 'idle',
      session: null,
      startedAt: null,
      distanceKm: 0,
      detectionCount: 0,
      validObservationCount: 0,
      lastDetection: null,
      tripSummary: null,
      error: null,
    }),
}));
