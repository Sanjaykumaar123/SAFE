import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { usersApi, type UserListParams } from '@/services/api/usersApi';
import { queryKeys } from '@/services/api/queryKeys';
import type { AdminManagedUser } from '@/types/admin';

export function useUsers(params: UserListParams) {
  return useQuery({ queryKey: queryKeys.users(params.query ?? '', { role: params.role, status: params.status }), queryFn: () => usersApi.list(params) });
}

export function useUserDetail(id: string) {
  return useQuery({ queryKey: queryKeys.userDetail(id), queryFn: () => usersApi.detail(id), enabled: !!id });
}

export function useSetUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AdminManagedUser['status'] }) => usersApi.setStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useResetUserAccess() {
  return useMutation({ mutationFn: (id: string) => usersApi.resetAccess(id) });
}
