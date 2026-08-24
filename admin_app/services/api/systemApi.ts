/** §34–37/§46/§47 — system health, API/DB/storage monitoring, data quality
 * + anomalies. */
import { apiClient } from './client';
import { withFallback } from './withFallback';
import {
  DEMO_ANOMALIES,
  DEMO_API_MONITORING,
  DEMO_DATA_QUALITY,
  DEMO_DB_HEALTH,
  DEMO_STORAGE_HEALTH,
  DEMO_SYSTEM_SERVICES,
} from '@/services/demo/mockData';
import type { ApiMonitoring, DataAnomaly, DataQualitySummary, DatabaseHealth, StorageHealth, SystemService } from '@/types/admin';
import type { GeoPoint } from '@/types/geo';

export const systemApi = {
  async health(): Promise<SystemService[]> {
    return withFallback(
      async () => (await apiClient.get<SystemService[]>('/admin/system')).data,
      () => DEMO_SYSTEM_SERVICES
    );
  },
  async apiMonitoring(): Promise<ApiMonitoring> {
    return withFallback(
      async () => (await apiClient.get<ApiMonitoring>('/admin/system/api')).data,
      () => DEMO_API_MONITORING
    );
  },
  async databaseHealth(): Promise<DatabaseHealth> {
    return withFallback(
      async () => (await apiClient.get<DatabaseHealth>('/admin/system/database')).data,
      () => DEMO_DB_HEALTH
    );
  },
  async storageHealth(): Promise<StorageHealth> {
    return withFallback(
      async () => (await apiClient.get<StorageHealth>('/admin/system/storage')).data,
      () => DEMO_STORAGE_HEALTH
    );
  },
};

export const dataQualityApi = {
  /** `place`/`radiusKm` are threaded through for the endpoint's own
   * radius-scoped breakdown; the demo fallback returns one nationwide
   * summary until a scoped mock is worth building out. */
  async summary(place: GeoPoint | null, radiusKm: number): Promise<DataQualitySummary> {
    return withFallback(
      async () => (await apiClient.get<DataQualitySummary>('/admin/data-quality', { params: { lat: place?.latitude, lon: place?.longitude, radiusKm } })).data,
      () => DEMO_DATA_QUALITY
    );
  },
  async anomalies(severity?: string): Promise<DataAnomaly[]> {
    return withFallback(
      async () => (await apiClient.get<DataAnomaly[]>('/admin/anomalies', { params: { severity } })).data,
      () => (severity && severity !== 'ALL' ? DEMO_ANOMALIES.filter((a) => a.severity === severity) : DEMO_ANOMALIES)
    );
  },
  async resolveAnomaly(id: string, action: 'REVIEW' | 'IGNORE' | 'FLAG' | 'BLOCK'): Promise<void> {
    return withFallback(
      async () => {
        await apiClient.post(`/admin/anomalies/${id}/resolve`, { action });
      },
      () => {
        const idx = DEMO_ANOMALIES.findIndex((a) => a.id === id);
        if (idx >= 0 && action !== 'REVIEW') DEMO_ANOMALIES.splice(idx, 1);
      }
    );
  },
};
