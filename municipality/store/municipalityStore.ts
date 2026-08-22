/**
 * Section 14 — the global operational context every screen reads the
 * selected city/ward from, instead of each screen deciding independently.
 * Deliberately holds only UI/session state (selected ids, permission
 * checks) — NOT a cache of server data (dashboard/hazard/etc. all live in
 * TanStack Query, per section 55).
 */
import { create } from 'zustand';

import type { City, MunicipalityOfficer } from '@/types/municipality';

interface MunicipalityState {
  selectedCityId: string | null;
  selectedWardId: string | null;
  authorizedCities: City[];
  officer: MunicipalityOfficer | null;
  hydrate: (officer: MunicipalityOfficer, authorizedCities: City[]) => void;
  selectCity: (cityId: string) => void;
  selectWard: (wardId: string | null) => void;
  hasPermission: (permission: string) => boolean;
  reset: () => void;
}

export const useMunicipalityStore = create<MunicipalityState>((set, get) => ({
  selectedCityId: null,
  selectedWardId: null,
  authorizedCities: [],
  officer: null,

  hydrate: (officer, authorizedCities) => {
    const current = get().selectedCityId;
    const stillValid = current && authorizedCities.some((c) => c.id === current);
    set({
      officer,
      authorizedCities,
      selectedCityId: stillValid ? current : officer.defaultCityId ?? authorizedCities[0]?.id ?? null,
    });
  },

  selectCity: (cityId) => set({ selectedCityId: cityId, selectedWardId: null }),
  selectWard: (wardId) => set({ selectedWardId: wardId }),

  hasPermission: (permission) => get().officer?.permissions.includes(permission) ?? false,

  reset: () => set({ selectedCityId: null, selectedWardId: null, authorizedCities: [], officer: null }),
}));
