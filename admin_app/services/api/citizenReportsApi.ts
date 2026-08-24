/** §19 — citizen report review queue, scoped by place/radius like hazards. */
import { apiClient } from './client';
import { withFallback } from './withFallback';
import { DEMO_CITIZEN_REPORTS } from '@/services/demo/mockData';
import type { CitizenReport } from '@/types/admin';
import type { Paginated } from '@/types/api';
import type { GeoPoint } from '@/types/geo';

export interface ReportListParams {
  place: GeoPoint | null;
  radiusKm: number;
  tab: 'ALL' | CitizenReport['status'];
  page?: number;
  pageSize?: number;
}

export const citizenReportsApi = {
  async list(params: ReportListParams): Promise<Paginated<CitizenReport>> {
    return withFallback(
      async () => {
        const response = await apiClient.get<Paginated<CitizenReport>>('/admin/citizen-reports', {
          params: { lat: params.place?.latitude, lon: params.place?.longitude, radiusKm: params.radiusKm, tab: params.tab, page: params.page ?? 1, pageSize: params.pageSize ?? 20 },
        });
        return response.data;
      },
      () => {
        // Demo reports don't carry independent coordinates (they mirror
        // their source hazard's location text only), so unlike
        // hazardsApi/fleetApi this fallback doesn't radius-filter — it
        // returns the tab-filtered set nationwide. A real backend scopes
        // this by lat/lon/radiusKm like every other list endpoint here.
        let items = DEMO_CITIZEN_REPORTS.slice();
        if (params.tab !== 'ALL') items = items.filter((r) => r.status === params.tab);
        const page = params.page ?? 1;
        const pageSize = params.pageSize ?? 20;
        const start = (page - 1) * pageSize;
        return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize, hasMore: start + pageSize < items.length };
      }
    );
  },

  async verify(id: string): Promise<void> {
    return withFallback(
      async () => {
        await apiClient.post(`/admin/citizen-reports/${id}/verify`);
      },
      () => undefined
    );
  },
  async reject(id: string, reason: string): Promise<void> {
    return withFallback(
      async () => {
        await apiClient.post(`/admin/citizen-reports/${id}/reject`, { reason });
      },
      () => undefined
    );
  },
};
