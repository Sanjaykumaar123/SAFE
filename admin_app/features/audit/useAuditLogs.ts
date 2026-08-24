import { useQuery } from '@tanstack/react-query';

import { auditApi, type AuditLogFilters } from '@/services/api/auditApi';
import { queryKeys } from '@/services/api/queryKeys';

export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery({ queryKey: queryKeys.auditLogs(filters), queryFn: () => auditApi.list(filters) });
}
