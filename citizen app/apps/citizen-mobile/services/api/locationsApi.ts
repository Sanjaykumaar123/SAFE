import { apiClient } from './client';
import { DEMO_MODE } from '@/constants/config';
import { DEMO_HAZARDS } from '@/constants/demoData';
import type { CreateSavedLocationPayload, LocationSearchResult, SavedLocation } from '@/types';

const demoLocations: SavedLocation[] = [];

export const locationsApi = {
  async list(): Promise<SavedLocation[]> {
    if (DEMO_MODE) return demoLocations;
    const { data } = await apiClient.get<SavedLocation[]>('/locations/');
    return data;
  },
  async create(payload: CreateSavedLocationPayload): Promise<SavedLocation> {
    if (DEMO_MODE) {
      const location: SavedLocation = { id: `demo-loc-${demoLocations.length + 1}`, customLabel: payload.customLabel ?? null, createdAt: new Date().toISOString(), ...payload };
      demoLocations.unshift(location);
      return location;
    }
    const { data } = await apiClient.post<SavedLocation>('/locations/', payload);
    return data;
  },
  async remove(id: string): Promise<void> {
    if (DEMO_MODE) {
      const index = demoLocations.findIndex((l) => l.id === id);
      if (index >= 0) demoLocations.splice(index, 1);
      return;
    }
    await apiClient.delete(`/locations/${id}`);
  },
  async search(query: string): Promise<LocationSearchResult[]> {
    if (DEMO_MODE) {
      const lower = query.toLowerCase();
      return DEMO_HAZARDS.filter((h) => h.locationText.toLowerCase().includes(lower) || h.roadName?.toLowerCase().includes(lower)).map((h) => ({
        label: h.locationText,
        subtitle: h.roadName,
        latitude: h.latitude,
        longitude: h.longitude,
        kind: 'HAZARD' as const,
      }));
    }
    const { data } = await apiClient.get<LocationSearchResult[]>('/locations/search', { params: { q: query } });
    return data;
  },
};
