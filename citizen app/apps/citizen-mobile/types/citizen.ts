import type { Hazard } from './hazard';

export interface HomeStats {
  nearbyCount: number;
  criticalCount: number;
  warningCount: number;
}

export interface HomeResponse {
  greeting: string;
  userName: string;
  cityName: string;
  stats: HomeStats;
  nearbyHazards: Hazard[];
  mapMarkers: Hazard[];
}
