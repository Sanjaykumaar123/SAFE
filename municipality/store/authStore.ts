/**
 * Officer session state. Tokens live only in expo-secure-store
 * (services/auth/tokenStorage.ts) — this store just holds the current
 * officer + status so screens can reactively gate on it (section 11: never
 * show city data before authorization is confirmed).
 */
import { create } from 'zustand';

import { authApi, type MunicipalityLoginPayload } from '@/services/api/authApi';
import { registerSessionExpiredHandler } from '@/services/api/client';
import { tokenStorage } from '@/services/auth/tokenStorage';
import type { City, MunicipalityOfficer } from '@/types/municipality';

export type AuthStatus = 'checking' | 'unauthenticated' | 'authenticated';

interface AuthState {
  status: AuthStatus;
  officer: MunicipalityOfficer | null;
  authorizedCities: City[];
  error: string | null;
  isSubmitting: boolean;
  bootstrap: () => Promise<void>;
  login: (payload: MunicipalityLoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'checking',
  officer: null,
  authorizedCities: [],
  error: null,
  isSubmitting: false,

  bootstrap: async () => {
    const accessToken = await tokenStorage.getAccessToken();
    if (!accessToken) {
      set({ status: 'unauthenticated' });
      return;
    }
    try {
      const me = await authApi.me();
      set({ status: 'authenticated', officer: me.officer, authorizedCities: me.authorizedCities });
    } catch {
      await tokenStorage.clear();
      set({ status: 'unauthenticated' });
    }
  },

  login: async (payload) => {
    set({ isSubmitting: true, error: null });
    try {
      const response = await authApi.login(payload);
      await tokenStorage.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
      // The login response carries the officer but not the full city list
      // (section 13's `/me` call owns that shape) — fetch it once right
      // after so the dashboard never renders before city context exists
      // (section 11: never show city data before authorization is confirmed).
      const me = await authApi.me();
      set({ status: 'authenticated', officer: me.officer, authorizedCities: me.authorizedCities, isSubmitting: false });
    } catch (error) {
      set({ isSubmitting: false, error: extractMessage(error) });
      throw error;
    }
  },

  logout: async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (refreshToken) {
      authApi.logout(refreshToken).catch(() => undefined);
    }
    await tokenStorage.clear();
    set({ status: 'unauthenticated', officer: null, authorizedCities: [] });
  },

  clearError: () => set({ error: null }),
}));

function extractMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string } } }).response;
    if (response?.data?.detail) return response.data.detail;
  }
  return 'Something went wrong. Please try again.';
}

registerSessionExpiredHandler(() => {
  useAuthStore.setState({ status: 'unauthenticated', officer: null });
});
