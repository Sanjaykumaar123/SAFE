/** §43–45 — global analytics, city performance, hazard trends. */
import { apiClient } from './client';
import { withFallback } from './withFallback';
import { DEMO_CITY_PERFORMANCE, DEMO_HAZARDS, DEMO_VEHICLES, buildAnalyticsSummary, buildHazardTrend } from '@/services/demo/mockData';
import type { AnalyticsSummary, CityPerformanceRow, TrendPoint } from '@/types/admin';
import type { GeoPoint } from '@/types/geo';
import { distanceKm } from '@/utils/geo';

export const analyticsApi = {
  async summary(place: GeoPoint | null, radiusKm: number): Promise<AnalyticsSummary> {
    const hazards = place ? DEMO_HAZARDS.filter((h) => distanceKm(place, h) <= radiusKm) : DEMO_HAZARDS;
    const vehicles = place ? DEMO_VEHICLES.filter((v) => distanceKm(place, v) <= radiusKm) : DEMO_VEHICLES;
    const fallbackSummary = buildAnalyticsSummary(hazards, vehicles);

    return withFallback(
      async () => {
        const { data } = await apiClient.get<AnalyticsSummary>('/admin/analytics/summary', { params: { lat: place?.latitude, lon: place?.longitude, radiusKm } });
        if (data && typeof data === 'object' && (data.totalHazards || data.citizenReports)) {
          return { ...fallbackSummary, ...data };
        }
        return fallbackSummary;
      },
      () => fallbackSummary
    );
  },

  async cityPerformance(): Promise<CityPerformanceRow[]> {
    return withFallback(
      async () => {
        const { data } = await apiClient.get<CityPerformanceRow[]>('/admin/analytics/cities');
        if (Array.isArray(data) && data.length > 0) return data;
        return DEMO_CITY_PERFORMANCE;
      },
      () => DEMO_CITY_PERFORMANCE
    );
  },

  async hazardTrends(place: GeoPoint | null, radiusKm: number): Promise<TrendPoint[]> {
    const hazards = place ? DEMO_HAZARDS.filter((h) => distanceKm(place, h) <= radiusKm) : DEMO_HAZARDS;
    const fallbackTrends = buildHazardTrend(hazards);

    return withFallback(
      async () => {
        const { data } = await apiClient.get<TrendPoint[]>('/admin/analytics/trends', { params: { lat: place?.latitude, lon: place?.longitude, radiusKm } });
        if (Array.isArray(data) && data.length > 0) return data;
        return fallbackTrends;
      },
      () => fallbackTrends
    );
  },
};
