import { create } from 'zustand';

import { DEFAULT_RADIUS_METERS } from '@/constants/config';
import type { HazardStatusType } from '@/constants/hazardStatus';
import type { SeverityType } from '@/constants/severity';
import type { Hazard } from '@/types';

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface HazardFilters {
  severity?: SeverityType;
  status?: HazardStatusType;
}

interface MapState {
  region: MapRegion | null;
  radiusMeters: number;
  filters: HazardFilters;
  selectedHazard: Hazard | null;
  setRegion: (region: MapRegion) => void;
  setFilters: (filters: HazardFilters) => void;
  clearFilters: () => void;
  selectHazard: (hazard: Hazard | null) => void;
}

export const CHENNAI_DEFAULT_REGION: MapRegion = {
  latitude: 13.0827,
  longitude: 80.2707,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export const useMapStore = create<MapState>((set) => ({
  region: null,
  radiusMeters: DEFAULT_RADIUS_METERS,
  filters: {},
  selectedHazard: null,
  setRegion: (region) => set({ region }),
  setFilters: (filters) => set({ filters }),
  clearFilters: () => set({ filters: {} }),
  selectHazard: (hazard) => set({ selectedHazard: hazard }),
}));
