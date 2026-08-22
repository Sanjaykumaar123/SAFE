/**
 * Small geometry helpers for the map/safe-route feature — haversine
 * distance, point-to-polyline distance (used to decide whether a hazard
 * sits "on" a candidate route), and human-readable distance/duration
 * formatting. Nothing here talks to the network; see
 * `services/routing/osrmApi.ts` and `features/routes/useSafeRoute.ts`.
 */
import type { RoutePoint } from '@/types';

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance between two points, in meters. */
export function haversineDistanceMeters(a: RoutePoint, b: RoutePoint): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Projects a point to local planar meters around `origin` — accurate
 * enough for the short (city-block scale) segments a route is split into;
 * not meant for anything spanning more than a few kilometers. */
function toLocalMeters(point: RoutePoint, origin: RoutePoint): { x: number; y: number } {
  const dLat = toRadians(point.latitude - origin.latitude);
  const dLon = toRadians(point.longitude - origin.longitude);
  return {
    x: dLon * Math.cos(toRadians(origin.latitude)) * EARTH_RADIUS_METERS,
    y: dLat * EARTH_RADIUS_METERS,
  };
}

function distanceToSegmentMeters(point: RoutePoint, segStart: RoutePoint, segEnd: RoutePoint): number {
  const p = toLocalMeters(point, segStart);
  const a = { x: 0, y: 0 };
  const b = toLocalMeters(segEnd, segStart);
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq));
  const closest = { x: a.x + abx * t, y: a.y + aby * t };
  const dx = p.x - closest.x;
  const dy = p.y - closest.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Shortest distance from `point` to any segment of `coordinates`, in
 * meters — used to score how close a hazard sits to a candidate route. */
export function distanceToPolylineMeters(point: RoutePoint, coordinates: RoutePoint[]): number {
  if (coordinates.length === 0) return Infinity;
  if (coordinates.length === 1) return haversineDistanceMeters(point, coordinates[0]);
  let min = Infinity;
  for (let i = 0; i < coordinates.length - 1; i += 1) {
    const distance = distanceToSegmentMeters(point, coordinates[i], coordinates[i + 1]);
    if (distance < min) min = distance;
  }
  return min;
}

/** Bounding-circle center + radius for a set of points, padded slightly —
 * used to pick the (lat, lon, radius) center query the backend's
 * `/hazards/nearby` endpoint expects when scoring a whole route corridor. */
export function boundingCircle(coordinates: RoutePoint[]): { latitude: number; longitude: number; radiusMeters: number } {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const point of coordinates) {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLon = Math.min(minLon, point.longitude);
    maxLon = Math.max(maxLon, point.longitude);
  }
  const center = { latitude: (minLat + maxLat) / 2, longitude: (minLon + maxLon) / 2 };
  const radiusMeters =
    Math.max(
      haversineDistanceMeters(center, { latitude: minLat, longitude: minLon }),
      haversineDistanceMeters(center, { latitude: maxLat, longitude: maxLon })
    ) + 250;
  return { ...center, radiusMeters };
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${remainder}m`;
}
