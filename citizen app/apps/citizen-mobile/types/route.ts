import type { Hazard } from './hazard';

/** A single lat/lng point — used for route origins/destinations/polylines. */
export interface RoutePoint {
  latitude: number;
  longitude: number;
}

/** Represents a selected origin or destination in the route planner */
export interface RoutePlannerLocation {
  point: RoutePoint;
  label: string;
  isCurrentLocation?: boolean;
}

/** A single turn-by-turn navigation step */
export interface RouteStep {
  instruction: string;
  roadName: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuverType?: string;
  maneuverModifier?: string;
}

/** A hazard that falls within the safety corridor of a calculated route. */
export interface RouteHazardWarning {
  hazard: Hazard;
  distanceFromRouteMeters: number;
}

/** One candidate route returned by the Safe Route calculation — either the
 * recommended "safest" option or an alternative, ranked by `riskScore`
 * (see `features/routes/useSafeRoute.ts`). */
export interface SafeRouteOption {
  id: string;
  coordinates: RoutePoint[];
  distanceMeters: number;
  durationSeconds: number;
  riskScore: number;
  hazardsOnRoute: RouteHazardWarning[];
  steps?: RouteStep[];
  isSafest: boolean;
}
