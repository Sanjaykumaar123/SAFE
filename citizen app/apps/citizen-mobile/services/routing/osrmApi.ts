/**
 * Thin client for OSRM's public HTTP routing API — road-snapped driving
 * directions with alternatives, used by the Safe Route feature
 * (`features/routes/useSafeRoute.ts`) to get real routes to score against
 * hazard data. This is the only place that talks to the routing server;
 * it does NOT go through `services/api/client.ts` because it's a
 * third-party service, not the SafePath backend.
 *
 * `ROUTING_BASE_URL` defaults to the free OSRM demo server — no API key,
 * but rate-limited and explicitly not for production use. Swap it for a
 * self-hosted OSRM instance (or rewrite this file against a commercial
 * directions API) before shipping.
 */
import { ROUTING_BASE_URL } from '@/constants/config';
import type { RoutePoint } from '@/types';

export interface OsrmRoute {
  coordinates: RoutePoint[];
  distanceMeters: number;
  durationSeconds: number;
}

interface OsrmRouteResponse {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
  }[];
}

export async function fetchDrivingRoutes(origin: RoutePoint, destination: RoutePoint): Promise<OsrmRoute[]> {
  const coords = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const url = `${ROUTING_BASE_URL}/route/v1/driving/${coords}?alternatives=true&overview=full&geometries=geojson&steps=false`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('You appear to be offline. Connect to the internet to calculate a route.');
  }

  if (!response.ok) {
    throw new Error('Could not reach the routing service. Please try again.');
  }

  const data = (await response.json()) as OsrmRouteResponse;
  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error('No route found between these two points.');
  }

  return data.routes.map((route) => ({
    coordinates: route.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  }));
}
