import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notificationsApi, type AnnouncementPayload } from '@/services/api/notificationsApi';
import { queryKeys } from '@/services/api/queryKeys';
import { POLL_INTERVAL_MS } from '@/constants/config';

export function useNotifications() {
  return useQuery({ queryKey: queryKeys.notifications(), queryFn: () => notificationsApi.list(), refetchInterval: POLL_INTERVAL_MS });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications() }),
  });
}

export function useSendAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AnnouncementPayload) => notificationsApi.send(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications() }),
  });
}
