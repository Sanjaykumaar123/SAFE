/** §08/§09 — admin login + session bootstrap. §05: the backend is always
 * the authority on role/permissions; this client only renders what
 * `/admin/me` reports. */
import { apiClient } from './client';
import { withFallback } from './withFallback';
import { DEMO_ADMINS, DEMO_TOKENS } from '@/services/demo/mockData';
import type { AdminUser } from '@/types/admin';
import type { TokenPair } from '@/types/api';

export interface AdminLoginPayload {
  adminId: string;
  password: string;
  mfaCode?: string;
}

export interface AdminAuthResponse {
  admin: AdminUser;
  tokens: TokenPair;
  mfaRequired?: boolean;
}

export interface AdminMeResponse {
  admin: AdminUser;
}

export const authApi = {
  async login(payload: AdminLoginPayload): Promise<AdminAuthResponse> {
    return withFallback(
      async () => {
        const response = await apiClient.post<AdminAuthResponse>('/admin/auth/login', payload);
        return response.data;
      },
      () => {
        const idOrEmail = payload.adminId.trim().toLowerCase();
        const admin = Object.values(DEMO_ADMINS).find((a) => a.email.toLowerCase() === idOrEmail || a.adminId.toLowerCase() === idOrEmail) ?? DEMO_ADMINS['super.admin@safepath.ai'];
        return { admin, tokens: DEMO_TOKENS };
      }
    );
  },

  async me(): Promise<AdminMeResponse> {
    return withFallback(
      async () => {
        const response = await apiClient.get<AdminMeResponse>('/admin/me');
        return response.data;
      },
      () => ({ admin: DEMO_ADMINS['super.admin@safepath.ai'] })
    );
  },

  async logout(refreshToken: string): Promise<void> {
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch {
      // Ignore logout failure in demo/offline mode — tokens are cleared
      // locally regardless (see store/authStore.ts).
    }
  },
};
