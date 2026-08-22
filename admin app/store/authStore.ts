/**
 * Admin session state. Tokens live only in expo-secure-store
 * (services/auth/tokenStorage.ts) — this store just holds the current
 * admin + permissions so screens can reactively gate on them (§05: never
 * show admin data before authorization is confirmed; §07: permission
 * checks go through `hasPermission`, never a hardcoded role check).
 */
import { create } from 'zustand';

import { authApi, type AdminLoginPayload } from '@/services/api/authApi';
import { registerSessionExpiredHandler } from '@/services/api/client';
import { tokenStorage } from '@/services/auth/tokenStorage';
import type { PermissionType } from '@/constants/permissions';
import type { AdminUser } from '@/types/admin';

export type AuthStatus = 'checking' | 'unauthenticated' | 'authenticated';

interface AuthState {
  status: AuthStatus;
  admin: AdminUser | null;
  error: string | null;
  isSubmitting: boolean;
  bootstrap: () => Promise<void>;
  login: (payload: AdminLoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  hasPermission: (permission: PermissionType) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'checking',
  admin: null,
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
      set({ status: 'authenticated', admin: me.admin });
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
      set({ status: 'authenticated', admin: response.admin, isSubmitting: false });
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
    set({ status: 'unauthenticated', admin: null });
  },

  clearError: () => set({ error: null }),

  hasPermission: (permission) => {
    const admin = get().admin;
    return admin ? admin.permissions.includes(permission) : false;
  },
}));

function extractMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string } } }).response;
    if (response?.data?.detail) return response.data.detail;
  }
  return 'Something went wrong. Please try again.';
}

registerSessionExpiredHandler(() => {
  useAuthStore.setState({ status: 'unauthenticated', admin: null });
});
