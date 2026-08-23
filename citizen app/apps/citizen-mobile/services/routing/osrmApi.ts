/**
 * Client for OSRM's HTTP routing API — road-snapped driving directions
 * with alternatives and turn-by-turn steps, used by the Safe Route feature.
 */
import { ROUTING_BASE_URL } from '@/constants/config';
import type { RoutePoint, RouteStep } from '@/types';

export interface OsrmRoute {
  coordinates: RoutePoint[];
  distanceMeters: number;
  durationSeconds: number;
  steps: RouteStep[];
}

interface OsrmStep {
  distance: number;
  duration: number;
  name?: string;
  maneuver?: {
    type?: string;
    modifier?: string;
    location?: [number, number];
  };
}

interface OsrmLeg {
  distance: number;
  duration: number;
  steps?: OsrmStep[];
}

interface OsrmRouteResponse {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
    legs?: OsrmLeg[];
  }[];
}

function buildStepInstruction(step: OsrmStep, index: number, isLast: boolean): string {
  if (isLast || step.maneuver?.type === 'arrive') {
    return 'Arrive at destination';
  }
  if (index === 0 || step.maneuver?.type === 'depart') {
    return step.name ? `Head on ${step.name}` : 'Head towards destination';
  }

  const type = step.maneuver?.type;
  const modifier = step.maneuver?.modifier;
  const road = step.name || 'the road';

  if (type === 'turn') {
    if (modifier === 'left') return `Turn left onto ${road}`;
    if (modifier === 'right') return `Turn right onto ${road}`;
    if (modifier === 'slight left') return `Slight left onto ${road}`;
    if (modifier === 'slight right') return `Slight right onto ${road}`;
    if (modifier === 'sharp left') return `Sharp left onto ${road}`;
    if (modifier === 'sharp right') return `Sharp right onto ${road}`;
    if (modifier === 'uturn') return `Make a U-turn onto ${road}`;
    return `Turn onto ${road}`;
  }

  if (type === 'new name' || type === 'continue') {
    return `Continue onto ${road}`;
  }

  if (type === 'roundabout') {
    return `At the roundabout, take exit onto ${road}`;
  }

  if (type === 'fork') {
    return `Keep ${modifier || 'straight'} at the fork onto ${road}`;
  }

  if (type === 'merge') {
    return `Merge onto ${road}`;
  }

  if (type === 'on ramp') {
    return `Take the ramp onto ${road}`;
  }

  if (type === 'off ramp') {
    return `Take the exit onto ${road}`;
  }

  if (type === 'end of road') {
    return `Turn ${modifier || ''} at the end of the road onto ${road}`.trim();
  }

  if (modifier) {
    return `Go ${modifier} onto ${road}`;
  }

  return `Continue on ${road}`;
}

export async function fetchDrivingRoutes(origin: RoutePoint, destination: RoutePoint): Promise<OsrmRoute[]> {
  const coords = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
  const url = `${ROUTING_BASE_URL}/route/v1/driving/${coords}?alternatives=true&overview=full&geometries=geojson&steps=true`;

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

  return data.routes.map((route) => {
    const rawSteps = (route.legs ?? []).flatMap((leg) => leg.steps ?? []);
    const steps: RouteStep[] = rawSteps.map((step, idx) => ({
      instruction: buildStepInstruction(step, idx, idx === rawSteps.length - 1),
      roadName: step.name || '',
      distanceMeters: step.distance,
      durationSeconds: step.duration,
      maneuverType: step.maneuver?.type,
      maneuverModifier: step.maneuver?.modifier,
    }));

    return {
      coordinates: route.geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      steps,
    };
  });
}
