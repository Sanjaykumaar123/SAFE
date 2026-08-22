/**
 * §concept/§12/§57 — turns whatever the admin typed into the search bar
 * (a city, an area, a road, a landmark, a PIN code, or raw coordinates)
 * into a `PlaceResult` every location-scoped screen can filter around.
 * Tries the shared backend's own gazetteer first (`GET
 * /admin/maps/geocode`), then falls back to the bundled Indian places list
 * (`services/demo/geoGazetteer.ts`) so search works nationwide even
 * offline or before that endpoint exists — see DEFERRED.md.
 */
import axios from 'axios';

import { DEMO_MODE, GEOCODE_URL } from '@/constants/config';
import type { PlaceResult } from '@/types/geo';
import { apiClient, isNetworkError } from '@/services/api/client';
import { ALL_PLACES, POPULAR_PLACES, tryParseCoordinatesOrPin } from '@/services/demo/geoGazetteer';

function localSearch(query: string): PlaceResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return POPULAR_PLACES;

  const direct = tryParseCoordinatesOrPin(query);
  const matches = ALL_PLACES.filter((p) => p.name.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q));
  return direct ? [direct, ...matches] : matches;
}

export const geocodeService = {
  async search(query: string): Promise<PlaceResult[]> {
    if (!query.trim()) return POPULAR_PLACES;

    if (!DEMO_MODE) {
      try {
        const response = await apiClient.get<PlaceResult[]>('/admin/maps/geocode', { params: { q: query } });
        if (response.data?.length) return response.data;
      } catch (error) {
        if (!isNetworkError(error)) throw error;
        // fall through to local gazetteer / Nominatim below
      }

      const local = localSearch(query);
      if (local.length) return local;

      try {
        const response = await axios.get(`${GEOCODE_URL}/search`, {
          params: { q: `${query}, India`, format: 'jsonv2', limit: 6, countrycodes: 'in' },
          headers: { 'Accept-Language': 'en' },
          timeout: 8000,
        });
        return (response.data as Array<{ place_id: number; display_name: string; lat: string; lon: string }>).map((r) => ({
          id: String(r.place_id),
          name: r.display_name.split(',')[0],
          subtitle: r.display_name,
          type: 'landmark' as const,
          latitude: Number(r.lat),
          longitude: Number(r.lon),
        }));
      } catch {
        return [];
      }
    }

    return localSearch(query);
  },

  async popular(): Promise<PlaceResult[]> {
    return POPULAR_PLACES;
  },
};
