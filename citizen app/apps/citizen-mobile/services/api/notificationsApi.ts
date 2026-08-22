import { apiClient } from './client';
import { DEMO_MODE } from '@/constants/config';
import { DEMO_NOTIFICATIONS } from '@/constants/demoData';
import type { AppNotification, NotificationListResponse } from '@/types';

const demoStore = [...DEMO_NOTIFICATIONS];

export const notificationsApi = {
  async list(): Promise<NotificationListResponse> {
    if (DEMO_MODE) {
      return { items: demoStore, unreadCount: demoStore.filter((n) => !n.isRead).length };
    }
    const { data } = await apiClient.get<NotificationListResponse>('/notifications/');
    return data;
  },
  async markRead(id: string): Promise<AppNotification> {
    if (DEMO_MODE) {
      const notification = demoStore.find((n) => n.id === id);
      if (notification) notification.isRead = true;
      return notification ?? demoStore[0];
    }
    const { data } = await apiClient.patch<AppNotification>(`/notifications/${id}/read`);
    return data;
  },
  async registerDeviceToken(expoPushToken: string, platform: 'ios' | 'android'): Promise<void> {
    if (DEMO_MODE) return;
    await apiClient.post('/notifications/device-tokens', { expoPushToken, platform });
  },
};
