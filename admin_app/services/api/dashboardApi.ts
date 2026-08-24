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
    return withFallback(
      async () => (await apiClient.get<GlobalKpis>('/admin/dashboard', { params: { lat: place?.latitude, lon: place?.longitude, radiusKm } })).data,
      () => {
        const hazards = place ? DEMO_HAZARDS.filter((h) => distanceKm(place, h) <= radiusKm) : DEMO_HAZARDS;
        const vehicles = place ? DEMO_VEHICLES.filter((v) => distanceKm(place, v) <= radiusKm) : DEMO_VEHICLES;
        return buildGlobalKpis(hazards, vehicles);
      }
    );
  },

  async systemStatus(): Promise<SystemStatusSummary> {
    return withFallback(
      async () => (await apiClient.get<SystemStatusSummary>('/admin/system/summary')).data,
      () => DEMO_SYSTEM_STATUS
    );
  },

  async activity(): Promise<ActivityEvent[]> {
    return withFallback(
      async () => (await apiClient.get<ActivityEvent[]>('/admin/dashboard/activity')).data,
      () => DEMO_ACTIVITY
    );
  },

  async actionRequired(place: GeoPoint | null, radiusKm: number): Promise<ActionRequiredItem[]> {
    return withFallback(
      async () => (await apiClient.get<ActionRequiredItem[]>('/admin/dashboard/action-required', { params: { lat: place?.latitude, lon: place?.longitude, radiusKm } })).data,
      () => {
        const hazards = place ? DEMO_HAZARDS.filter((h) => distanceKm(place, h) <= radiusKm) : DEMO_HAZARDS.filter((h) => h.severity === 'CRITICAL').slice(0, 10);
        return buildActionRequired(place, hazards);
      }
    );
  },
};
