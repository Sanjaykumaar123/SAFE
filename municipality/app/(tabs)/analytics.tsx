import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/common/Card';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { StatCard } from '@/components/common/StatCard';
import { severityColors } from '@/constants/theme';
import { colors, spacing, typography } from '@/constants/theme';
import { useAnalyticsRecurring, useAnalyticsSeverity, useAnalyticsSummary, useAnalyticsWards } from '@/features/analytics/useAnalytics';
import { useMunicipalityStore } from '@/store/municipalityStore';

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const selectedCityId = useMunicipalityStore((s) => s.selectedCityId);

  const summary = useAnalyticsSummary(selectedCityId);
  const wards = useAnalyticsWards(selectedCityId);
  const severity = useAnalyticsSeverity(selectedCityId);
  const recurring = useAnalyticsRecurring(selectedCityId);

  if (summary.isLoading) return <LoadingState label="Loading analytics…" />;
  if (summary.isError) return <ErrorState message={(summary.error as Error)?.message ?? 'Analytics unavailable.'} onRetry={summary.refetch} />;

  const s = summary.data;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <Text style={styles.title}>Analytics</Text>

      {s ? (
        <View style={styles.statsGrid}>
          <StatCard label="Active Hazards" value={s.activeHazards} />
          <StatCard label="Critical" value={s.criticalHazards} tone="critical" />
          <StatCard label="Resolved This Week" value={s.resolvedThisWeek} tone="success" />
          <StatCard label="Avg Resolution (hrs)" value={s.avgResolutionTimeHours ?? '—'} />
          <StatCard label="Recurring Roads" value={s.recurringHazardRoads} tone="warning" />
          <StatCard label="Citizen Reports" value={s.citizenReportsCount} />
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Hazards by Ward</Text>
      <Card>
        {wards.isLoading ? (
          <LoadingState label="Loading…" />
        ) : (
          (wards.data ?? []).map((w) => (
            <BarRow key={w.wardId ?? w.wardName} label={w.wardName} value={w.activeHazards} max={maxOf(wards.data?.map((x) => x.activeHazards) ?? [1])} color={colors.primaryBlue} />
          ))
        )}
        {wards.data && wards.data.length === 0 ? <Text style={styles.emptyText}>No wards configured for this city yet.</Text> : null}
      </Card>

      <Text style={styles.sectionTitle}>Hazards by Severity</Text>
      <Card>
        {severity.isLoading ? (
          <LoadingState label="Loading…" />
        ) : (
          (severity.data ?? []).map((row) => (
            <BarRow key={row.severity} label={row.severity} value={row.count} max={maxOf(severity.data?.map((x) => x.count) ?? [1])} color={severityColors[row.severity]} />
          ))
        )}
      </Card>

      <Text style={styles.sectionTitle}>Recurring Road Issues</Text>
      {(recurring.data ?? []).length === 0 && !recurring.isLoading ? (
        <Card>
          <Text style={styles.emptyText}>No recurring hazards detected — no road has repeated failures yet.</Text>
        </Card>
      ) : (
        (recurring.data ?? []).map((item) => (
          <Card key={item.roadName} style={styles.recurringCard}>
            <Text style={styles.recurringRoad}>{item.roadName}</Text>
            <Text style={styles.recurringMeta}>
              {item.reportCount} reports · {item.recurringEventCount} recurring events
            </Text>
            <Text style={styles.recurringRecommendation}>{item.recommendation}</Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

function maxOf(values: number[]): number {
  return Math.max(1, ...values);
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const width = `${Math.max(4, Math.round((value / max) * 100))}%` as const;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width, backgroundColor: color }]} />
      </View>
      <Text style={styles.barValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  title: { ...typography.headlineLgMobile, color: colors.deepNavy },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  sectionTitle: { ...typography.headlineMd, color: colors.deepNavy, marginTop: spacing.lg, marginBottom: spacing.xs },
  emptyText: { ...typography.bodyMd, color: colors.textSecondary },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  barLabel: { ...typography.bodyMd, color: colors.text, width: 90 },
  barTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  barValue: { ...typography.labelMd, color: colors.textSecondary, width: 28, textAlign: 'right' },
  recurringCard: { marginBottom: spacing.sm },
  recurringRoad: { ...typography.bodyLg, color: colors.text, fontWeight: '600' },
  recurringMeta: { ...typography.bodyMd, color: colors.textSecondary, marginTop: 2 },
  recurringRecommendation: { ...typography.bodyMd, color: colors.amber, marginTop: spacing.xs, fontStyle: 'italic' },
});
