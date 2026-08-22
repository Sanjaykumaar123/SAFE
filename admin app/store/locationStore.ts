/**
 * §concept — the single source of truth for "which place is the admin
 * currently scoped to, and at what radius". Dashboard, Hazards, Fleet and
 * Analytics all read this instead of each screen owning its own place
 * state, so searching a place once (Dashboard's search hero, or the
 * global search bar) re-scopes every other tab automatically. `null`
 * place means "no place searched yet" — screens then show a National
 * Overview / prompt-to-search state rather than an unbounded nationwide
 * list (the whole point: an admin covering all of India can't browse
 * every record one city at a time, so nothing renders a full table until
 * a place narrows it down).
 */
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { DEFAULT_RADIUS_KM, RADIUS_STEPS_KM } from '@/constants/theme';
import { RECENT_SEARCHES_KEY, RECENT_SEARCHES_LIMIT } from '@/constants/config';
import type { LocationContext, PlaceResult } from '@/types/geo';

interface LocationState {
  place: LocationContext | null;
  recentSearches: PlaceResult[];
  hydrated: boolean;
  hydrateRecent: () => Promise<void>;
  setPlace: (place: PlaceResult) => void;
  setRadiusKm: (km: (typeof RADIUS_STEPS_KM)[number]) => void;
  clearPlace: () => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  place: null,
  recentSearches: [],
  hydrated: false,

  hydrateRecent: async () => {
    try {
      const raw = await SecureStore.getItemAsync(RECENT_SEARCHES_KEY);
      set({ recentSearches: raw ? (JSON.parse(raw) as PlaceResult[]) : [], hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  setPlace: (place) => {
    const radiusKm = get().place?.radiusKm ?? DEFAULT_RADIUS_KM;
    set({ place: { ...place, radiusKm } });

    const recent = [place, ...get().recentSearches.filter((p) => p.id !== place.id)].slice(0, RECENT_SEARCHES_LIMIT);
    set({ recentSearches: recent });
    SecureStore.setItemAsync(RECENT_SEARCHES_KEY, JSON.stringify(recent)).catch(() => undefined);
  },

  setRadiusKm: (km) => {
    const current = get().place;
    if (current) set({ place: { ...current, radiusKm: km } });
  },

  clearPlace: () => set({ place: null }),
}));
