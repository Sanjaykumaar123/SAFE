import { apiClient } from './client';
import { DEMO_MODE } from '@/constants/config';
import { searchPlaces } from '../routing/geocodingService';
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
      return searchPlaces(query);
    }
    try {
      const { data } = await apiClient.get<LocationSearchResult[]>('/locations/search', { params: { q: query } });
      if (data && data.length > 0) return data;
      return searchPlaces(query);
    } catch {
      return searchPlaces(query);
    }
  },
};

