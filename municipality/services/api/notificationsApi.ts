import { apiClient } from './client';
import type { Notification, NotificationListResponse } from '@/types/notification';

/** Reuses the shared backend's citizen/municipality-agnostic notifications
 * endpoint — see the module doc on `types/notification.ts`. */
export const notificationsApi = {
  async list(): Promise<NotificationListResponse> {
    const response = await apiClient.get<NotificationListResponse>('/notifications/');
    return response.data;
  },
  async markRead(id: string): Promise<Notification> {
    const response = await apiClient.patch<Notification>(`/notifications/${id}/read`);
    return response.data;
  },
};
