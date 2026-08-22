/**
 * §24 — continuous GPS while monitoring is active. citizen-mobile's own
 * `locationService.ts` deliberately reserves this job for the Fleet
 * Operator app ("Continuous road monitoring is the Fleet Operator app's
 * job, not this one") — this is that module.
 *
 * Samples on a time/distance threshold (never every raw GPS tick into the
 * database — that's a client-side concern too: this only keeps a rolling
 * last-fix + running distance total in memory) and accumulates distance
 * via the haversine formula between consecutive accepted fixes.
 */
import * as Location from 'expo-location';

import { LOCATION_SAMPLE_DISTANCE_M, LOCATION_SAMPLE_INTERVAL_MS } from '@/constants/config';

export interface LocationFix {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

function haversineMeters(a: LocationFix, b: LocationFix): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

class LocationService {
  private subscription: Location.LocationSubscription | null = null;
  private lastFix: LocationFix | null = null;
  private distanceMeters = 0;
  private listeners = new Set<(fix: LocationFix) => void>();

  async requestPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  }

  async hasPermission(): Promise<boolean> {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  }

  /** Starts (or restarts, resetting the distance total) a monitoring
   * session's GPS tracking. */
  async start(): Promise<void> {
    this.reset();
    const granted = await this.hasPermission();
    if (!granted) {
      const ok = await this.requestPermission();
      if (!ok) throw new Error('Location permission was not granted.');
    }

    this.subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: LOCATION_SAMPLE_INTERVAL_MS,
        distanceInterval: LOCATION_SAMPLE_DISTANCE_M,
      },
      (position) => {
        const fix: LocationFix = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp,
        };
        if (this.lastFix) {
          this.distanceMeters += haversineMeters(this.lastFix, fix);
        }
        this.lastFix = fix;
        this.listeners.forEach((listener) => listener(fix));
      }
    );
  }

  async stop(): Promise<void> {
    this.subscription?.remove();
    this.subscription = null;
  }

  reset(): void {
    this.lastFix = null;
    this.distanceMeters = 0;
  }

  getLastFix(): LocationFix | null {
    return this.lastFix;
  }

  getDistanceKm(): number {
    return this.distanceMeters / 1000;
  }

  subscribe(listener: (fix: LocationFix) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const locationService = new LocationService();
