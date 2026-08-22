import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { NOTIFICATIONS_POLL_MS } from '@/constants/config';
import { notificationsApi } from '@/services/api/notificationsApi';
import { queryKeys } from '@/services/api/queryKeys';

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () => notificationsApi.list(),
    staleTime: 20_000,
    refetchInterval: NOTIFICATIONS_POLL_MS,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications() }),
  });
}
