export type SavedLocationLabel = 'HOME' | 'WORK' | 'COLLEGE' | 'CUSTOM';

export interface SavedLocation {
  id: string;
  label: SavedLocationLabel;
  customLabel: string | null;
  address: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export interface CreateSavedLocationPayload {
  label: SavedLocationLabel;
  customLabel?: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface LocationSearchResult {
  label: string;
  subtitle: string | null;
  latitude: number;
  longitude: number;
  kind: 'ROAD' | 'AREA' | 'LANDMARK' | 'CITY' | 'HAZARD';
}
