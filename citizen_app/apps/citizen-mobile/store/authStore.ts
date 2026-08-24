/**
 * Client-side auth state. Tokens themselves live only in expo-secure-store
 * (services/auth/tokenStorage.ts) — this store just holds the current user
 * + status so screens can reactively gate on it.
 */
import { create } from 'zustand';

import { authApi } from '@/services/api/authApi';
import { registerSessionExpiredHandler } from '@/services/api/client';
import { tokenStorage } from '@/services/auth/tokenStorage';
import type { LoginPayload, RegisterPayload, User } from '@/types';

export type AuthStatus = 'checking' | 'guest' | 'authenticated';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  error: string | null;
  isSubmitting: boolean;
  bootstrap: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'checking',
  user: null,
  error: null,
  isSubmitting: false,

  bootstrap: async () => {
    const accessToken = await tokenStorage.getAccessToken();
    if (!accessToken) {
      set({ status: 'guest' });
      return;
    }
    try {
      const user = await authApi.me();
      set({ status: 'authenticated', user });
    } catch {
      await tokenStorage.clear();
      set({ status: 'guest' });
    }
  },

  login: async (payload) => {
    set({ isSubmitting: true, error: null });
    try {
      const response = await authApi.login(payload);
      await tokenStorage.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
      set({ status: 'authenticated', user: response.user, isSubmitting: false });
    } catch (error) {
      set({ isSubmitting: false, error: extractMessage(error) });
      throw error;
    }
  },

  register: async (payload) => {
    set({ isSubmitting: true, error: null });
    try {
      const response = await authApi.register(payload);
      await tokenStorage.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
      set({ status: 'authenticated', user: response.user, isSubmitting: false });
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
    set({ status: 'guest', user: null });
  },

  continueAsGuest: () => set({ status: 'guest', user: null }),

  clearError: () => set({ error: null }),
}));

function extractMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string } } }).response;
    if (response?.data?.detail) return response.data.detail;
  }
  return 'Something went wrong. Please try again.';
}

// Wire the API client's 401-after-refresh-failure signal to a real logout
// so an expired session always drops the user back to the login screen.
registerSessionExpiredHandler(() => {
  useAuthStore.setState({ status: 'guest', user: null });
});
