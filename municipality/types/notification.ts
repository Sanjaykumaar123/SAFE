/** Municipality officers are `users` rows too, so this app reuses the
 * shared backend's `GET /api/notifications` as-is (already scoped by JWT
 * `user_id` — see services/api/notificationsApi.ts). Mirrors
 * `backend/api/app/schemas/notification.py`. */
export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  relatedHazardId: string | null;
  relatedReportId: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  items: Notification[];
  unreadCount: number;
}
