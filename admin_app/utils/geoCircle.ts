/**
 * §map-provider — MapLibre has no built-in "Circle" primitive the way
 * react-native-maps did (its `<Circle radius={meters}>` drew a real
 * geodesic circle). MapLibre's `CircleLayer` draws circles in fixed
 * *screen* pixels, which don't represent a real ground radius and would
 * shrink/grow as the map zooms — wrong for "this is a 20km radius" (§12).
 * This generates an actual geodesic circle as a GeoJSON polygon instead,
 * rendered via `ShapeSource` + `FillLayer`/`LineLayer` — a real radius
 * that scales correctly with zoom because it's genuine map geometry.
 */
import type { GeoPoint } from '@/types/geo';

const EARTH_RADIUS_KM = 6371;

/** Returns `[lng, lat]` pairs (GeoJSON coordinate order) tracing a circle
 * of `radiusKm` around `center`, closed (first point repeated last). */
export function circlePolygonCoordinates(center: GeoPoint, radiusKm: number, points = 64): [number, number][] {
  const coords: [number, number][] = [];
  const latRad = (center.latitude * Math.PI) / 180;
  const cosLat = Math.cos(latRad) || 1e-9;

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = radiusKm * Math.cos(angle);
    const dy = radiusKm * Math.sin(angle);
    const dLat = dy / EARTH_RADIUS_KM;
    const dLon = dx / (EARTH_RADIUS_KM * cosLat);
    const pointLat = center.latitude + (dLat * 180) / Math.PI;
    const pointLon = center.longitude + (dLon * 180) / Math.PI;
    coords.push([pointLon, pointLat]);
  }
  return coords;
}

export function circlePolygonGeoJSON(center: GeoPoint, radiusKm: number) {
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'Polygon' as const,
      coordinates: [circlePolygonCoordinates(center, radiusKm)],
    },
  };
}

/** `[longitude, latitude]` — the coordinate order every MapLibre component
 * expects, the opposite of react-native-maps' `{latitude, longitude}`.
 * Named (rather than an inline `[p.longitude, p.latitude]` at every call
 * site) so a lat/lng swap bug is a one-place fix, not a hunt. */
export function toMapLibreCoordinate(point: GeoPoint): [number, number] {
  return [point.longitude, point.latitude];
}

/** MapLibre's `Camera` takes a `zoom` level, not a react-native-maps-style
 * `latitudeDelta`/`longitudeDelta` region — this maps each of the app's
 * fixed radius steps (§concept) to a zoom level that comfortably frames a
 * circle of that radius on a phone screen. A lookup table rather than a
 * general formula since RADIUS_STEPS_KM is a small, fixed set. */
const ZOOM_FOR_RADIUS_KM: Record<number, number> = {
  5: 11.4,
  10: 10.5,
  20: 9.5,
  30: 8.9,
  50: 8.2,
};

export function zoomForRadiusKm(radiusKm: number): number {
  return ZOOM_FOR_RADIUS_KM[radiusKm] ?? 9.5;
}
