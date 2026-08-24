/** §43–45 — global analytics, city performance, hazard trends. */
import { apiClient } from './client';
import { withFallback } from './withFallback';
import { DEMO_CITY_PERFORMANCE, DEMO_HAZARDS, DEMO_VEHICLES, buildAnalyticsSummary, buildHazardTrend } from '@/services/demo/mockData';
import type { AnalyticsSummary, CityPerformanceRow, TrendPoint } from '@/types/admin';
import type { GeoPoint } from '@/types/geo';
import { distanceKm } from '@/utils/geo';

export const analyticsApi = {
  async summary(place: GeoPoint | null, radiusKm: number): Promise<AnalyticsSummary> {
    return withFallback(
      async () => (await apiClient.get<AnalyticsSummary>('/admin/analytics', { params: { lat: place?.latitude, lon: place?.longitude, radiusKm } })).data,
      () => {
        const hazards = place ? DEMO_HAZARDS.filter((h) => distanceKm(place, h) <= radiusKm) : DEMO_HAZARDS;
        const vehicles = place ? DEMO_VEHICLES.filter((v) => distanceKm(place, v) <= radiusKm) : DEMO_VEHICLES;
        return buildAnalyticsSummary(hazards, vehicles);
      }
    );
  },

  async cityPerformance(): Promise<CityPerformanceRow[]> {
    return withFallback(
      async () => (await apiClient.get<CityPerformanceRow[]>('/admin/analytics/cities')).data,
      () => DEMO_CITY_PERFORMANCE
    );
  },

  async hazardTrends(place: GeoPoint | null, radiusKm: number): Promise<TrendPoint[]> {
    return withFallback(
      async () => (await apiClient.get<TrendPoint[]>('/admin/analytics/trends', { params: { lat: place?.latitude, lon: place?.longitude, radiusKm } })).data,
      () => buildHazardTrend(place ? DEMO_HAZARDS.filter((h) => distanceKm(place, h) <= radiusKm) : DEMO_HAZARDS)
    );
  },
};
