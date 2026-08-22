import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { appVersionsApi, featureFlagsApi, maintenanceApi } from '@/services/api/platformApi';
import { queryKeys } from '@/services/api/queryKeys';
import type { AppVersionInfo, MaintenanceModeConfig } from '@/types/admin';

export function useFeatureFlags() {
  return useQuery({ queryKey: queryKeys.featureFlags(), queryFn: () => featureFlagsApi.list() });
}

export function useToggleFeatureFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, enabled, version }: { key: string; enabled: boolean; version: number }) => featureFlagsApi.toggle(key, enabled, version),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.featureFlags() }),
  });
}

export function useAppVersions() {
  return useQuery({ queryKey: queryKeys.appVersions(), queryFn: () => appVersionsApi.list() });
}

export function useSetAppUpdateMode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ app, updateMode, minSupportedVersion }: { app: AppVersionInfo['app']; updateMode: AppVersionInfo['updateMode']; minSupportedVersion?: string }) =>
      appVersionsApi.setUpdateMode(app, updateMode, minSupportedVersion),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.appVersions() }),
  });
}

export function useMaintenanceMode() {
  return useQuery({ queryKey: queryKeys.maintenanceMode(), queryFn: () => maintenanceApi.get() });
}

export function useSetMaintenanceMode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ patch, version }: { patch: Pick<MaintenanceModeConfig, 'active' | 'message' | 'target'>; version: number }) => maintenanceApi.set(patch, version),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceMode() }),
  });
}
