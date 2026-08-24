/** §20/§56 — cross-role user directory + support actions. §84: never
 * expose more than operationally necessary (email is shown, no raw
 * credentials/tokens/payment details ever appear in these types). */
import { apiClient } from './client';
import { withFallback } from './withFallback';
import { DEMO_MANAGED_USERS } from '@/services/demo/mockData';
import type { AdminManagedUser } from '@/types/admin';
import type { Paginated } from '@/types/api';

export interface UserListParams {
  query?: string;
  role?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export const usersApi = {
  async list(params: UserListParams): Promise<Paginated<AdminManagedUser>> {
    return withFallback(
      async () => (await apiClient.get<Paginated<AdminManagedUser>>('/admin/users', { params })).data,
      () => {
        let items = DEMO_MANAGED_USERS.slice();
        if (params.role && params.role !== 'ALL') items = items.filter((u) => u.role === params.role);
        if (params.status && params.status !== 'ALL') items = items.filter((u) => u.status === params.status);
        if (params.query?.trim()) {
          const q = params.query.trim().toLowerCase();
          items = items.filter((u) => u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
        }
        const page = params.page ?? 1;
        const pageSize = params.pageSize ?? 30;
        const start = (page - 1) * pageSize;
        return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize, hasMore: start + pageSize < items.length };
      }
    );
  },

  async detail(id: string): Promise<AdminManagedUser> {
    return withFallback(
      async () => (await apiClient.get<AdminManagedUser>(`/admin/users/${id}`)).data,
      () => {
        const user = DEMO_MANAGED_USERS.find((u) => u.id === id);
        if (!user) throw new Error('User not found');
        return user;
      }
    );
  },

  async setStatus(id: string, status: AdminManagedUser['status']): Promise<void> {
    return withFallback(
      async () => {
        await apiClient.post(`/admin/users/${id}/status`, { status });
      },
      () => {
        const user = DEMO_MANAGED_USERS.find((u) => u.id === id);
        if (user) user.status = status;
      }
    );
  },

  async resetAccess(id: string): Promise<void> {
    return withFallback(
      async () => {
        await apiClient.post(`/admin/users/${id}/reset-access`);
      },
      () => undefined
    );
  },
};
