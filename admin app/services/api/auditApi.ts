/** §49/§50 — audit log query. Read-only from the client: "Do not allow
 * ordinary admins to delete audit logs" (§50). */
import { apiClient } from './client';
import { withFallback } from './withFallback';
import { DEMO_AUDIT_LOGS } from '@/services/demo/mockData';
import type { AuditLogEntry } from '@/types/admin';
import type { Paginated } from '@/types/api';

export interface AuditLogFilters {
  actorRole?: string;
  entityType?: string;
  cityName?: string;
  action?: string;
  query?: string;
  page?: number;
  pageSize?: number;
}

export const auditApi = {
  async list(filters: AuditLogFilters): Promise<Paginated<AuditLogEntry>> {
    return withFallback(
      async () => (await apiClient.get<Paginated<AuditLogEntry>>('/admin/audit-logs', { params: filters })).data,
      () => {
        let items = DEMO_AUDIT_LOGS.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        if (filters.actorRole && filters.actorRole !== 'ALL') items = items.filter((e) => e.actorRole === filters.actorRole);
        if (filters.entityType && filters.entityType !== 'ALL') items = items.filter((e) => e.entityType === filters.entityType);
        if (filters.cityName && filters.cityName !== 'ALL') items = items.filter((e) => e.cityName === filters.cityName);
        if (filters.query?.trim()) {
          const q = filters.query.trim().toLowerCase();
          items = items.filter((e) => e.actorName.toLowerCase().includes(q) || e.entityId.toLowerCase().includes(q) || e.action.toLowerCase().includes(q));
        }
        const page = filters.page ?? 1;
        const pageSize = filters.pageSize ?? 25;
        const start = (page - 1) * pageSize;
        return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize, hasMore: start + pageSize < items.length };
      }
    );
  },
};
