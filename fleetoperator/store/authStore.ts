import { create } from 'zustand';

import { authApi, type FleetLoginPayload } from '@/services/api/authApi';
import { registerSessionExpiredHandler } from '@/services/api/client';
import { tokenStorage } from '@/services/auth/tokenStorage';
import type { FleetOperator, TodayTarget } from '@/types/fleet';

export type AuthStatus = 'checking' | 'unauthenticated' | 'authenticated';

interface AuthState {
  status: AuthStatus;
  operator: FleetOperator | null;
  todayTarget: TodayTarget | null;
  error: string | null;
  isSubmitting: boolean;
  bootstrap: () => Promise<void>;
  login: (payload: FleetLoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'checking',
  operator: null,
  todayTarget: null,
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
      set({ status: 'authenticated', operator: me.operator, todayTarget: me.todayTarget });
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
      const me = await authApi.me();
      set({ status: 'authenticated', operator: me.operator, todayTarget: me.todayTarget, isSubmitting: false });
    } catch (error) {
      set({ isSubmitting: false, error: extractMessage(error) });
      throw error;
    }
  },

  logout: async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    if (refreshToken) authApi.logout(refreshToken).catch(() => undefined);
    await tokenStorage.clear();
    set({ status: 'unauthenticated', operator: null, todayTarget: null });
  },

  clearError: () => set({ error: null }),
}));

function extractMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string } } }).response;
    if (response?.data?.detail) return response.data.detail;
  }
  return 'Login failed. Please check your operator ID and password.';
}

registerSessionExpiredHandler(() => {
  useAuthStore.setState({ status: 'unauthenticated', operator: null, todayTarget: null });
});
