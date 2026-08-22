/** §35/§36 — API monitoring + database health. */
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { HealthBadge } from '@/components/common/Badge';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { StatCard } from '@/components/common/StatCard';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useApiMonitoring, useDatabaseHealth } from '@/features/system/useSystem';
import { formatDateTime } from '@/utils/format';

export default function ApiMonitoringScreen() {
  const { data: api } = useApiMonitoring();
  const { data: db } = useDatabaseHealth();
  const maxSeries = Math.max(1, ...(api?.requestSeries.map((p) => p.value) ?? [1]));

  return (
    <View style={styles.flex}>
      <ScreenHeader title="API & Database" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>API MONITORING</Text>
        <View style={styles.kpiGrid}>
          <StatCard label="Requests/min" value={api?.requestsPerMinute ?? '—'} tone="default" />
          <StatCard label="Error Rate" value={`${api?.errorRatePct ?? 0}%`} tone={api && api.errorRatePct > 2 ? 'critical' : 'default'} />
          <StatCard label="Avg Response" value={`${api?.avgResponseMs ?? 0}ms`} tone="default" />
          <StatCard label="5xx/hr" value={api?.errors5xxPerHour ?? '—'} tone="critical" />
          <StatCard label="4xx/hr" value={api?.errors4xxPerHour ?? '—'} tone="warning" />
        </View>

        <View style={styles.chartCard}>
          <View style={styles.trendChart}>
            {api?.requestSeries.map((point) => (
              <View key={point.label} style={styles.trendBarWrap}>
                <View style={[styles.trendBar, { height: Math.max(3, (point.value / maxSeries) * 70) }]} />
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.sectionLabel}>SLOW ENDPOINTS</Text>
        {api?.slowEndpoints.map((e) => (
          <View key={e.path} style={styles.endpointRow}>
            <Text style={styles.endpointPath} numberOfLines={1}>
              {e.path}
            </Text>
            <Text style={styles.endpointMs}>{e.avgMs}ms</Text>
          </View>
        ))}

        <Text style={styles.sectionLabel}>DATABASE HEALTH</Text>
        <View style={styles.dbCard}>
          <View style={styles.dbRow}>
            <Text style={styles.dbLabel}>Status</Text>
            {db ? <HealthBadge status={db.status} /> : null}
          </View>
          <DbMetric label="Connections" value={db?.connectionCount} />
          <DbMetric label="Storage used" value={db ? `${db.storageUsedPct}%` : undefined} />
          <DbMetric label="Query latency" value={db ? `${db.queryLatencyMs}ms` : undefined} />
          <View style={styles.dbRow}>
            <Text style={styles.dbLabel}>PostGIS</Text>
            {db ? <HealthBadge status={db.postgisStatus} /> : null}
          </View>
          <DbMetric label="Last backup" value={db ? formatDateTime(db.lastBackupAt) : undefined} />
        </View>
      </ScrollView>
    </View>
  );
}

function DbMetric({ label, value }: { label: string; value?: string | number }) {
  return (
    <View style={styles.dbRow}>
      <Text style={styles.dbLabel}>{label}</Text>
      <Text style={styles.dbValue}>{value ?? '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xxl },
  sectionLabel: { ...typography.caps, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chartCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  trendChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 80 },
  trendBarWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  trendBar: { width: '70%', backgroundColor: colors.primaryBlue, borderRadius: 2, minHeight: 3 },
  endpointRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.white, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 8 },
  endpointPath: { ...typography.numeric, fontSize: 11, color: colors.text, flex: 1 },
  endpointMs: { ...typography.numeric, color: colors.primaryBlue },
  dbCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm + 2, gap: 6 },
  dbRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dbLabel: { ...typography.bodyMd, color: colors.textSecondary },
  dbValue: { ...typography.bodyMd, color: colors.text, fontWeight: '600' },
});
