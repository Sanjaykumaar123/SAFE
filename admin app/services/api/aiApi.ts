/** §30–33/§63 — AI control center: status, configuration, model versions,
 * performance. Threshold/config changes are a named, audited, permissioned
 * action (§31: "Do not let normal Admin users casually change production
 * AI parameters"; gated client-side by Permission.MANAGE_AI and re-checked
 * server-side). */
import { apiClient } from './client';
import { withFallback } from './withFallback';
import { DEMO_AI_CONFIG, DEMO_AI_MODELS, DEMO_AI_PERFORMANCE, DEMO_AI_STATUS } from '@/services/demo/mockData';
import type { AiConfig, AiModelStatus, AiModelVersion, AiPerformance } from '@/types/admin';

export const aiApi = {
  async status(): Promise<AiModelStatus> {
    return withFallback(
      async () => (await apiClient.get<AiModelStatus>('/admin/ai/status')).data,
      () => DEMO_AI_STATUS
    );
  },

  async config(): Promise<AiConfig> {
    return withFallback(
      async () => (await apiClient.get<AiConfig>('/admin/ai/config')).data,
      () => DEMO_AI_CONFIG
    );
  },

  /** §63 — `POST /api/admin/ai/config`; the audit log records old value,
   * new value, admin, and reason (see features/ai/useAiMutations.ts). */
  async updateConfig(patch: Partial<AiConfig> & { reason: string }, version: number): Promise<AiConfig> {
    return withFallback(
      async () => (await apiClient.post<AiConfig>('/admin/ai/config', { ...patch, version })).data,
      () => {
        Object.assign(DEMO_AI_CONFIG, patch);
        DEMO_AI_CONFIG.version += 1;
        DEMO_AI_CONFIG.updatedAt = new Date().toISOString();
        return DEMO_AI_CONFIG;
      }
    );
  },

  async models(): Promise<AiModelVersion[]> {
    return withFallback(
      async () => (await apiClient.get<AiModelVersion[]>('/admin/models')).data,
      () => DEMO_AI_MODELS
    );
  },

  async promoteModel(id: string, target: 'STAGING' | 'PRODUCTION'): Promise<void> {
    return withFallback(
      async () => {
        await apiClient.post(`/admin/models/${id}/promote`, { target });
      },
      () => {
        const model = DEMO_AI_MODELS.find((m) => m.id === id);
        if (model) model.status = target;
      }
    );
  },

  async rollbackModel(id: string): Promise<void> {
    return withFallback(
      async () => {
        await apiClient.post(`/admin/models/${id}/rollback`);
      },
      () => {
        const model = DEMO_AI_MODELS.find((m) => m.id === id);
        if (model) model.status = 'DEPRECATED';
      }
    );
  },

  async performance(): Promise<AiPerformance> {
    return withFallback(
      async () => (await apiClient.get<AiPerformance>('/admin/ai/performance')).data,
      () => DEMO_AI_PERFORMANCE
    );
  },
};
