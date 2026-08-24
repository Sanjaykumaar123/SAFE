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

import { DEMO_ME_RESPONSE, DEMO_OPERATOR } from '@/services/demo/mockData';

export const useAuthStore = create<AuthState>((set) => ({
  status: 'checking',
  operator: null,
  todayTarget: null,
  error: null,
  isSubmitting: false,

  bootstrap: async () => {
    try {
      const accessToken = await Promise.race([
        tokenStorage.getAccessToken(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
      ]);
      if (!accessToken) {
        set({ status: 'unauthenticated' });
        return;
      }

      const me = await Promise.race([
        authApi.me(),
        new Promise<typeof DEMO_ME_RESPONSE>((resolve) =>
          setTimeout(() => resolve(DEMO_ME_RESPONSE), 2000)
        ),
      ]);
      set({ status: 'authenticated', operator: me.operator || DEMO_OPERATOR, todayTarget: me.todayTarget || DEMO_ME_RESPONSE.todayTarget });
    } catch {
      await tokenStorage.clear().catch(() => undefined);
      set({ status: 'unauthenticated' });
    }
  },

  login: async (payload) => {
    set({ isSubmitting: true, error: null });
    try {
      const response = await authApi.login(payload);
      if (response?.tokens) {
        await tokenStorage.setTokens(response.tokens.accessToken, response.tokens.refreshToken).catch(() => undefined);
      }
      let me = DEMO_ME_RESPONSE;
      try {
        me = await Promise.race([
          authApi.me(),
          new Promise<typeof DEMO_ME_RESPONSE>((resolve) => setTimeout(() => resolve(DEMO_ME_RESPONSE), 2000)),
        ]);
      } catch {
        // Fallback to response operator
        me = {
          operator: response.operator || DEMO_OPERATOR,
          todayTarget: DEMO_ME_RESPONSE.todayTarget,
        };
      }
      set({
        status: 'authenticated',
        operator: me.operator || response.operator || DEMO_OPERATOR,
        todayTarget: me.todayTarget || DEMO_ME_RESPONSE.todayTarget,
        isSubmitting: false,
      });
    } catch (error) {
      set({ isSubmitting: false, error: extractMessage(error) });
      throw error;
    }
  },

  logout: async () => {
    const refreshToken = await tokenStorage.getRefreshToken().catch(() => null);
    if (refreshToken) authApi.logout(refreshToken).catch(() => undefined);
    await tokenStorage.clear().catch(() => undefined);
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
