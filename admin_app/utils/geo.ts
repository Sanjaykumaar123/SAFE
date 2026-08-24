import type { GeoPoint } from '@/types/geo';

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in km — used both to label "X km away" on cards
 * (§14/§17) and, in demo mode, to filter the mock dataset to a radius
 * around a searched place (§concept) the same way a real backend's PostGIS
 * `ST_DWithin` query would server-side. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** A bounding box roughly covering a radius around a center point — passed
 * as the `bbox`/`radius_km` query params a real backend endpoint would use
 * for a viewport/radius-scoped query (§12: "Use viewport-based backend
 * queries" — the same idea applied to a radius instead of a map viewport). */
export function boundingBoxForRadius(center: GeoPoint, radiusKm: number) {
  const latDelta = radiusKm / 111; // ~111km per degree latitude
  const lonDelta = radiusKm / (111 * Math.cos(toRad(center.latitude)) || 1);
  return {
    north: center.latitude + latDelta,
    south: center.latitude - latDelta,
    east: center.longitude + lonDelta,
    west: center.longitude - lonDelta,
    latitudeDelta: latDelta * 2.4,
    longitudeDelta: lonDelta * 2.4,
  };
}
