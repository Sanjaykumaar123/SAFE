/** §39–42 — feature flags, app version/maintenance-mode control. These are
 * the levers §40 describes as "Admin Can Change Application Behavior":
 * every connected app reads its own config from the backend, never from a
 * client-pushed value (§39: "Mobile apps fetch them from API. Do not
 * hardcode feature access."). */
import { apiClient } from './client';
import { withFallback } from './withFallback';
import { DEMO_APP_VERSIONS, DEMO_FEATURE_FLAGS, DEMO_MAINTENANCE_MODE } from '@/services/demo/mockData';
import type { AppVersionInfo, FeatureFlag, MaintenanceModeConfig } from '@/types/admin';

export const featureFlagsApi = {
  async list(): Promise<FeatureFlag[]> {
    return withFallback(
      async () => (await apiClient.get<FeatureFlag[]>('/admin/feature-flags')).data,
      () => DEMO_FEATURE_FLAGS
    );
  },
  async toggle(key: string, enabled: boolean, version: number): Promise<FeatureFlag> {
    return withFallback(
      async () => (await apiClient.post<FeatureFlag>(`/admin/feature-flags/${key}`, { enabled, version })).data,
      () => {
        const flag = DEMO_FEATURE_FLAGS.find((f) => f.key === key);
        if (!flag) throw new Error('Feature flag not found');
        flag.enabled = enabled;
        flag.version += 1;
        flag.updatedAt = new Date().toISOString();
        return flag;
      }
    );
  },
};

export const appVersionsApi = {
  async list(): Promise<AppVersionInfo[]> {
    return withFallback(
      async () => (await apiClient.get<AppVersionInfo[]>('/admin/app-versions')).data,
      () => DEMO_APP_VERSIONS
    );
  },
  async setUpdateMode(app: AppVersionInfo['app'], updateMode: AppVersionInfo['updateMode'], minSupportedVersion?: string): Promise<void> {
    return withFallback(
      async () => {
        await apiClient.post(`/admin/app-versions/${app}`, { updateMode, minSupportedVersion });
      },
      () => {
        const v = DEMO_APP_VERSIONS.find((x) => x.app === app);
        if (v) {
          v.updateMode = updateMode;
          if (minSupportedVersion) v.minSupportedVersion = minSupportedVersion;
        }
      }
    );
  },
};

export const maintenanceApi = {
  async get(): Promise<MaintenanceModeConfig> {
    return withFallback(
      async () => (await apiClient.get<MaintenanceModeConfig>('/admin/maintenance-mode')).data,
      () => DEMO_MAINTENANCE_MODE
    );
  },
  async set(patch: Pick<MaintenanceModeConfig, 'active' | 'message' | 'target'>, version: number): Promise<MaintenanceModeConfig> {
    return withFallback(
      async () => (await apiClient.post<MaintenanceModeConfig>('/admin/maintenance-mode', { ...patch, version })).data,
      () => {
        Object.assign(DEMO_MAINTENANCE_MODE, patch);
        DEMO_MAINTENANCE_MODE.version += 1;
        DEMO_MAINTENANCE_MODE.updatedAt = new Date().toISOString();
        return DEMO_MAINTENANCE_MODE;
      }
    );
  },
};
