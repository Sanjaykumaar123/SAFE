/**
 * The fleet operational-context store — mirrors `municipality/store/
 * municipalityStore.ts`'s role in that app. A fleet operator has exactly
 * one city/vehicle (no multi-city switcher like a municipality officer
 * has), so there's less state to hold here than in that app; this stays
 * the single place a permission check happens rather than every screen
 * reaching into `authStore.operator.permissions` directly.
 */
import { create } from 'zustand';

import { useAuthStore } from './authStore';

interface FleetState {
  hasPermission: (permission: string) => boolean;
}

export const useFleetStore = create<FleetState>(() => ({
  hasPermission: (permission) => useAuthStore.getState().operator?.permissions.includes(permission) ?? false,
}));
