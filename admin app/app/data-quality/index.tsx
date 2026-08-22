/** §46 — Data Quality Center. */
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAnomalies, useDataQuality } from '@/features/system/useSystem';

const METRICS = [
  { key: 'citizenDataQualityPct', label: 'Citizen Data Quality' },
  { key: 'fleetDataQualityPct', label: 'Fleet Data Quality' },
  { key: 'aiQualityPct', label: 'AI Quality' },
  { key: 'gpsQualityPct', label: 'GPS Quality' },
  { key: 'mediaQualityPct', label: 'Media Quality' },
] as const;

export default function DataQualityScreen() {
  const { data } = useDataQuality();
  const { data: anomalies } = useAnomalies();

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Data Quality Center" />
      <ScrollView contentContainerStyle={styles.content}>
        {METRICS.map((m) => (
          <MetricBar key={m.key} label={m.label} value={data?.[m.key] ?? 0} />
        ))}
        <MetricBar label="Duplicate Rate" value={data?.duplicateRatePct ?? 0} inverse />

        <TouchableOpacity style={styles.anomalyCard} onPress={() => router.push('/data-quality/anomalies')}>
          <View>
            <Text style={styles.anomalyTitle}>Data Anomalies</Text>
            <Text style={styles.anomalySub}>{anomalies?.length ?? data?.unresolvedAnomalies ?? 0} unresolved — GPS jumps, duplicates, low confidence…</Text>
          </View>
          <Text style={styles.anomalyArrow}>→</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function MetricBar({ label, value, inverse }: { label: string; value: number; inverse?: boolean }) {
  const color = inverse ? (value < 5 ? colors.green : value < 15 ? colors.warning : colors.critical) : value > 80 ? colors.green : value > 60 ? colors.warning : colors.critical;
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={[styles.metricValue, { color }]}>{value}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(value, 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl },
  metricRow: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm + 2, gap: 6 },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  metricLabel: { ...typography.bodyMd, color: colors.text },
  metricValue: { ...typography.numeric, fontSize: 15 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  fill: { height: '100%' },
  anomalyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.deepNavy, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm },
  anomalyTitle: { ...typography.bodyMd, fontWeight: '700', color: colors.white },
  anomalySub: { ...typography.labelSm, color: 'rgba(255,255,255,0.75)', marginTop: 2, maxWidth: 260 },
  anomalyArrow: { color: colors.white, fontSize: 20 },
});
