/**
 * Safe Route calculation: fetches real road-snapped route alternatives
 * from OSRM, cross-references each against hazards along its corridor, and
 * ranks them by a severity-weighted risk score so the lowest-risk option
 * can be recommended as the "safest route" (mirrors the scoring described
 * for map markers/status badges in the design system — severity always
 * drives color + ranking, never distance/time alone).
 */
import { useCallback, useMemo, useState } from 'react';

import { Severity, type SeverityType } from '@/constants/severity';
import { hazardsApi } from '@/services/api/hazardsApi';
import { fetchDrivingRoutes } from '@/services/routing/osrmApi';
import type { Hazard, RouteHazardWarning, RoutePoint, SafeRouteOption } from '@/types';
import { boundingCircle, distanceToPolylineMeters } from '@/utils/geo';

export type SafeRouteStatus = 'idle' | 'loading' | 'error' | 'ready';

/** How close (meters) a hazard has to sit to a route's line to count as
 * "on" that route. Also used by `MapScreen` to detect newly-appeared
 * hazards on the currently active route during live polling. */
export const HAZARD_CORRIDOR_METERS = 60;

const SEVERITY_WEIGHT: Record<SeverityType, number> = {
  [Severity.LOW]: 1,
  [Severity.MEDIUM]: 2,
  [Severity.HIGH]: 3,
  [Severity.CRITICAL]: 5,
};

function scoreRoute(coordinates: RoutePoint[], hazards: Hazard[]): { hazardsOnRoute: RouteHazardWarning[]; riskScore: number } {
  const hazardsOnRoute: RouteHazardWarning[] = [];
  let riskScore = 0;
  for (const hazard of hazards) {
    const distanceFromRouteMeters = distanceToPolylineMeters({ latitude: hazard.latitude, longitude: hazard.longitude }, coordinates);
    if (distanceFromRouteMeters <= HAZARD_CORRIDOR_METERS) {
      hazardsOnRoute.push({ hazard, distanceFromRouteMeters });
      riskScore += SEVERITY_WEIGHT[hazard.severity];
    }
  }
  hazardsOnRoute.sort((a, b) => a.distanceFromRouteMeters - b.distanceFromRouteMeters);
  return { hazardsOnRoute, riskScore };
}

export function useSafeRoute() {
  const [status, setStatus] = useState<SafeRouteStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [options, setOptions] = useState<SafeRouteOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const calculate = useCallback(async (origin: RoutePoint, destination: RoutePoint) => {
    setStatus('loading');
    setErrorMessage(null);
    try {
      const routes = await fetchDrivingRoutes(origin, destination);
      const allCoordinates = routes.flatMap((route) => route.coordinates);
      const { latitude, longitude, radiusMeters } = boundingCircle(allCoordinates.length > 0 ? allCoordinates : [origin, destination]);

      const hazardResponse = await hazardsApi.nearby({
        latitude,
        longitude,
        radius: Math.min(Math.max(radiusMeters, 500), 50000),
        limit: 500,
      });

      const scored: SafeRouteOption[] = routes.map((route, index) => {
        const { hazardsOnRoute, riskScore } = scoreRoute(route.coordinates, hazardResponse.items);
        return {
          id: `route-${index}`,
          coordinates: route.coordinates,
          distanceMeters: route.distanceMeters,
          durationSeconds: route.durationSeconds,
          riskScore,
          hazardsOnRoute,
          isSafest: false,
        };
      });

      scored.sort((a, b) => a.riskScore - b.riskScore || a.durationSeconds - b.durationSeconds);
      if (scored.length > 0) scored[0].isSafest = true;

      setOptions(scored);
      setSelectedId(scored[0]?.id ?? null);
      setStatus('ready');
    } catch (error) {
      setOptions([]);
      setSelectedId(null);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Could not calculate a safe route.');
    }
  }, []);

  const clear = useCallback(() => {
    setStatus('idle');
    setErrorMessage(null);
    setOptions([]);
    setSelectedId(null);
  }, []);

  const selected = useMemo(() => options.find((option) => option.id === selectedId) ?? null, [options, selectedId]);

  return { status, errorMessage, options, selected, selectedId, setSelectedId, calculate, clear };
}
