/** §14/§15/§17/§18/§54/§55 — hazard list/detail/validation/merge/reopen.
 * Every write here is the client half of §51's
 * `Admin App -> API -> Authorization -> Validation -> DB Transaction ->
 * Audit Event -> Connected Systems` pattern; nothing mutates local state
 * optimistically without a server round-trip. */
import { apiClient } from './client';
import { withFallback } from './withFallback';
import { DEMO_HAZARDS, buildHazardDetail } from '@/services/demo/mockData';
import type { AdminHazard, AdminHazardDetail, DuplicateCandidate } from '@/types/admin';
import type { Paginated } from '@/types/api';
import type { GeoPoint } from '@/types/geo';
import { distanceKm } from '@/utils/geo';
import type { HazardTab } from '@/constants/enums';

export interface HazardListParams {
  place: GeoPoint | null;
  radiusKm: number;
  tab: HazardTab;
  query?: string;
  page?: number;
  pageSize?: number;
}

const TAB_STATUS: Partial<Record<HazardTab, AdminHazard['status'][]>> = {
  NEW: ['NEW', 'REPORTED'],
  UNDER_REVIEW: ['UNDER_REVIEW'],
  ACTIVE: ['ACTIVE', 'VERIFIED'],
  DUPLICATE: ['DUPLICATE'],
  RESOLVED: ['RESOLVED'],
  REOPENED: ['REOPENED'],
};

function demoList(params: HazardListParams): Paginated<AdminHazard> {
  const { place, radiusKm, tab, query, page = 1, pageSize = 20 } = params;
  let items = DEMO_HAZARDS.slice();

  if (place) {
    items = items
      .map((h) => ({ h, d: distanceKm(place, h) }))
      .filter(({ d }) => d <= radiusKm)
      .sort((a, b) => a.d - b.d)
      .map(({ h, d }) => ({ ...h, distanceKm: d }));
  } else {
    // No place searched yet — surface only the highest-severity items
    // nationwide rather than the full unfiltered table (§concept).
    items = items.filter((h) => h.severity === 'CRITICAL' || h.severity === 'HIGH').sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  if (tab === 'HIGH_PRIORITY') {
    items = items.filter((h) => h.severity === 'CRITICAL' || h.severity === 'HIGH');
  } else if (tab !== 'ALL' && TAB_STATUS[tab]) {
    items = items.filter((h) => TAB_STATUS[tab]!.includes(h.status));
  }

  if (query?.trim()) {
    const q = query.trim().toLowerCase();
    items = items.filter((h) => h.code.toLowerCase().includes(q) || h.title.toLowerCase().includes(q) || h.locationText.toLowerCase().includes(q));
  }

  const total = items.length;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total, page, pageSize, hasMore: start + pageSize < total };
}

export const hazardsApi = {
  async list(params: HazardListParams): Promise<Paginated<AdminHazard>> {
    return withFallback(
      async () => {
        const response = await apiClient.get<Paginated<AdminHazard>>('/admin/hazards', {
          params: {
            lat: params.place?.latitude,
            lon: params.place?.longitude,
            radiusKm: params.radiusKm,
            tab: params.tab,
            q: params.query,
            page: params.page ?? 1,
            pageSize: params.pageSize ?? 20,
          },
        });
        return response.data;
      },
      () => demoList(params)
    );
  },

  async detail(id: string): Promise<AdminHazardDetail> {
    return withFallback(
      async () => {
        const response = await apiClient.get<AdminHazardDetail>(`/admin/hazards/${id}`);
        return response.data;
      },
      () => {
        const hazard = DEMO_HAZARDS.find((h) => h.id === id || h.code === id) ?? DEMO_HAZARDS[0];
        return buildHazardDetail(hazard);
      }
    );
  },

  async verify(id: string, version: number): Promise<AdminHazardDetail> {
    return withFallback(
      async () => {
        const response = await apiClient.post<AdminHazardDetail>(`/admin/hazards/${id}/verify`, { version });
        return response.data;
      },
      () => {
        const hazard = DEMO_HAZARDS.find((h) => h.id === id || h.code === id) ?? DEMO_HAZARDS[0];
        hazard.status = 'VERIFIED';
        hazard.version += 1;
        return buildHazardDetail(hazard);
      }
    );
  },

  async reject(id: string, version: number, reason: string): Promise<AdminHazardDetail> {
    return withFallback(
      async () => {
        const response = await apiClient.post<AdminHazardDetail>(`/admin/hazards/${id}/reject`, { version, reason });
        return response.data;
      },
      () => {
        const hazard = DEMO_HAZARDS.find((h) => h.id === id || h.code === id) ?? DEMO_HAZARDS[0];
        hazard.status = 'REJECTED';
        hazard.version += 1;
        return buildHazardDetail(hazard);
      }
    );
  },

  async reopen(id: string, version: number, reason: string): Promise<AdminHazardDetail> {
    return withFallback(
      async () => {
        const response = await apiClient.post<AdminHazardDetail>(`/admin/hazards/${id}/reopen`, { version, reason });
        return response.data;
      },
      () => {
        const hazard = DEMO_HAZARDS.find((h) => h.id === id || h.code === id) ?? DEMO_HAZARDS[0];
        hazard.status = 'REOPENED';
        hazard.version += 1;
        return buildHazardDetail(hazard);
      }
    );
  },

  async flag(id: string, reason: string): Promise<void> {
    return withFallback(
      async () => {
        await apiClient.post(`/admin/hazards/${id}/flag`, { reason });
      },
      () => undefined
    );
  },

  /** §18 — candidates near this hazard within 150m that might be the same
   * physical defect, for the merge flow. */
  async duplicateCandidates(id: string): Promise<DuplicateCandidate[]> {
    return withFallback(
      async () => {
        const response = await apiClient.get<DuplicateCandidate[]>(`/admin/hazards/${id}/duplicates`);
        return response.data;
      },
      () => {
        const hazard = DEMO_HAZARDS.find((h) => h.id === id || h.code === id) ?? DEMO_HAZARDS[0];
        return DEMO_HAZARDS.filter((h) => h.id !== hazard.id && h.cityId === hazard.cityId && distanceKm(hazard, h) < 0.15)
          .slice(0, 5)
          .map((h) => ({ hazardA: hazard, hazardB: h, distanceMeters: Math.round(distanceKm(hazard, h) * 1000), sameRoad: h.roadName === hazard.roadName }));
      }
    );
  },

  async merge(canonicalId: string, mergedId: string, version: number): Promise<AdminHazardDetail> {
    return withFallback(
      async () => {
        const response = await apiClient.post<AdminHazardDetail>(`/admin/hazards/${canonicalId}/merge`, { mergedId, version });
        return response.data;
      },
      () => {
        const canonical = DEMO_HAZARDS.find((h) => h.id === canonicalId || h.code === canonicalId) ?? DEMO_HAZARDS[0];
        const merged = DEMO_HAZARDS.find((h) => h.id === mergedId || h.code === mergedId) ?? DEMO_HAZARDS[1];
        merged.status = 'DUPLICATE';
        merged.duplicateOfId = canonical.id;
        merged.version += 1;
        canonical.linkedHazardIds = [...new Set([...canonical.linkedHazardIds, merged.id])];
        canonical.citizenReportCount += merged.citizenReportCount;
        canonical.fleetObservationCount += merged.fleetObservationCount;
        canonical.version += 1;
        return buildHazardDetail(canonical);
      }
    );
  },
};
