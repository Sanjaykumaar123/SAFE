/** §38/§58/§59 — admin notification inbox + outbound system announcements. */
import { apiClient } from './client';
import { withFallback } from './withFallback';
import { DEMO_NOTIFICATIONS } from '@/services/demo/mockData';
import type { NotificationPriorityType } from '@/constants/enums';
import type { AdminNotification } from '@/types/admin';

export interface AnnouncementPayload {
  title: string;
  message: string;
  priority: NotificationPriorityType;
  target: string;
  scheduledFor?: string;
  expiresAt?: string;
}

export const notificationsApi = {
  async list(): Promise<AdminNotification[]> {
    return withFallback(
      async () => (await apiClient.get<AdminNotification[]>('/admin/notifications')).data,
      () => DEMO_NOTIFICATIONS
    );
  },
  async markRead(id: string): Promise<void> {
    return withFallback(
      async () => {
        await apiClient.post(`/admin/notifications/${id}/read`);
      },
      () => {
        const n = DEMO_NOTIFICATIONS.find((x) => x.id === id);
        if (n) n.read = true;
      }
    );
  },
  async send(payload: AnnouncementPayload): Promise<void> {
    return withFallback(
      async () => {
        await apiClient.post('/admin/notifications', payload);
      },
      () => {
        DEMO_NOTIFICATIONS.unshift({ id: `ntf-${Date.now()}`, title: payload.title, message: payload.message, priority: payload.priority, target: payload.target, createdAt: new Date().toISOString(), read: false });
      }
    );
  },
};
