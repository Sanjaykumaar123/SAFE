import { apiClient } from './client';
import { DEMO_MODE } from '@/constants/config';
import { DEMO_HAZARDS } from '@/constants/demoData';
import type { Hazard, HazardDetail, HazardListResponse } from '@/types';
import type { HazardStatusType } from '@/constants/hazardStatus';
import type { SeverityType } from '@/constants/severity';

export interface NearbyHazardsParams {
  latitude: number;
  longitude: number;
  radius?: number;
  severity?: SeverityType;
  status?: HazardStatusType;
  limit?: number;
}

function applyDemoFilters(items: Hazard[], severity?: SeverityType, status?: HazardStatusType): Hazard[] {
  return items.filter((h) => (severity ? h.severity === severity : true) && (status ? h.status === status : true));
}

export const hazardsApi = {
  async nearby(params: NearbyHazardsParams): Promise<HazardListResponse> {
    if (DEMO_MODE) {
      const items = applyDemoFilters(DEMO_HAZARDS, params.severity, params.status);
      return { items, total: items.length };
    }
    const { data } = await apiClient.get<HazardListResponse>('/hazards/nearby', { params });
    return data;
  },
  async list(params: { cityId?: string; severity?: SeverityType; status?: HazardStatusType; limit?: number; offset?: number }): Promise<HazardListResponse> {
    if (DEMO_MODE) {
      const items = applyDemoFilters(DEMO_HAZARDS, params.severity, params.status);
      return { items, total: items.length };
    }
    const { data } = await apiClient.get<HazardListResponse>('/hazards/', { params });
    return data;
  },
  async detail(id: string): Promise<HazardDetail> {
    if (DEMO_MODE) {
      const hazard = DEMO_HAZARDS.find((h) => h.id === id) ?? DEMO_HAZARDS[0];
      return { ...hazard, media: hazard.imageUrl ? [hazard.imageUrl] : [] };
    }
    const { data } = await apiClient.get<HazardDetail>(`/hazards/${id}`);
    return data;
  },
};

export type { Hazard };
