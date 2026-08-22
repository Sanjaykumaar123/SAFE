/** Section 20/57/79 — map viewport + filters live here (UI state), never
 * duplicated hazard data (that's TanStack Query, keyed off these values —
 * see `services/api/queryKeys.ts::hazardsMap`). */
import { create } from 'zustand';

export interface MapViewport {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface HazardFilters {
  status?: string;
  severity?: string;
  wardId?: string;
  source?: string;
  dateFrom?: string;
}

interface MapState {
  viewport: MapViewport | null;
  filters: HazardFilters;
  selectedHazardId: string | null;
  setViewport: (viewport: MapViewport) => void;
  setFilters: (filters: HazardFilters) => void;
  clearFilters: () => void;
  selectHazard: (id: string | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  viewport: null,
  filters: {},
  selectedHazardId: null,
  setViewport: (viewport) => set({ viewport }),
  setFilters: (filters) => set({ filters }),
  clearFilters: () => set({ filters: {} }),
  selectHazard: (id) => set({ selectedHazardId: id }),
}));
