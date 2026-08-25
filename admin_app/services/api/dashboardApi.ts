/** §11/§70 — control-center dashboard: KPIs, system status, activity feed,
 * action-required queue, all optionally scoped to a searched place/radius. */
import { apiClient } from './client';
import { withFallback } from './withFallback';
import { DEMO_ACTIVITY, DEMO_HAZARDS, DEMO_SYSTEM_STATUS, DEMO_VEHICLES, buildActionRequired, buildGlobalKpis } from '@/services/demo/mockData';
import type { ActionRequiredItem, ActivityEvent, GlobalKpis, SystemStatusSummary } from '@/types/admin';
import type { GeoPoint } from '@/types/geo';
import { distanceKm } from '@/utils/geo';

export const dashboardApi = {
  async kpis(place: GeoPoint | null, radiusKm: number): Promise<GlobalKpis> {
    const hazards = place ? DEMO_HAZARDS.filter((h) => distanceKm(place, h) <= radiusKm) : DEMO_HAZARDS;
    const vehicles = place ? DEMO_VEHICLES.filter((v) => distanceKm(place, v) <= radiusKm) : DEMO_VEHICLES;
    const fallbackKpis = buildGlobalKpis(hazards, vehicles);

    return withFallback(
      async () => {
        const { data } = await apiClient.get<GlobalKpis>('/admin/dashboard', { params: { lat: place?.latitude, lon: place?.longitude, radiusKm } });
        if (data && typeof data === 'object' && (data.activeHazards || data.citizenReportsToday)) {
          return { ...fallbackKpis, ...data };
        }
        return fallbackKpis;
      },
      () => fallbackKpis
    );
  },

  async systemStatus(): Promise<SystemStatusSummary> {
    return withFallback(
      async () => {
        const { data } = await apiClient.get<SystemStatusSummary>('/admin/system/summary');
        if (data && typeof data === 'object' && data.overall) return data;
        return DEMO_SYSTEM_STATUS;
      },
      () => DEMO_SYSTEM_STATUS
    );
  },

  async activity(): Promise<ActivityEvent[]> {
    return withFallback(
      async () => {
        const { data } = await apiClient.get<ActivityEvent[]>('/admin/dashboard/activity');
        if (Array.isArray(data) && data.length > 0) return data;
        return DEMO_ACTIVITY;
      },
      () => DEMO_ACTIVITY
    );
  },

  async actionRequired(place: GeoPoint | null, radiusKm: number): Promise<ActionRequiredItem[]> {
    const hazards = place ? DEMO_HAZARDS.filter((h) => distanceKm(place, h) <= radiusKm) : DEMO_HAZARDS.filter((h) => h.severity === 'CRITICAL').slice(0, 10);
    const fallbackItems = buildActionRequired(place, hazards);

    return withFallback(
      async () => {
        const { data } = await apiClient.get<ActionRequiredItem[]>('/admin/dashboard/action-required', { params: { lat: place?.latitude, lon: place?.longitude, radiusKm } });
        if (Array.isArray(data) && data.length > 0) return data;
        return fallbackItems;
      },
      () => fallbackItems
    );
  },
};
