import type { MapRegion } from '@/store/mapStore';

/** Approximates a search radius (meters) that covers the visible map
 * region, so panning/zooming the map re-queries only what's on screen
 * (section 43) instead of a fixed oversized radius. */
export function radiusForRegion(region: MapRegion): number {
  const metersPerDegreeLat = 111_320;
  const heightMeters = region.latitudeDelta * metersPerDegreeLat;
  const widthMeters = region.longitudeDelta * metersPerDegreeLat * Math.cos((region.latitude * Math.PI) / 180);
  const radius = Math.max(heightMeters, widthMeters) / 2;
  return Math.min(Math.max(radius, 500), 50_000);
}
