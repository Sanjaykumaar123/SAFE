import type { AlertTypeType } from '@/constants/alertType';

export interface AppNotification {
  id: string;
  type: AlertTypeType;
  title: string;
  body: string;
  isRead: boolean;
  relatedHazardId: string | null;
  relatedReportId: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  items: AppNotification[];
  unreadCount: number;
}
