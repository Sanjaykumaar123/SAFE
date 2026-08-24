/** §28 — Fleet Data Quality dashboard. */
import { StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useFleetQuality } from '@/features/fleet/useFleet';

const METRICS = [
  { key: 'gpsAccuracyPct', label: 'GPS Accuracy' },
  { key: 'imageQualityPct', label: 'Image Quality' },
  { key: 'avgAiConfidencePct', label: 'Avg AI Confidence' },
  { key: 'uploadCompletionPct', label: 'Upload Completion' },
  { key: 'coveragePct', label: 'Coverage' },
] as const;

const INVERSE_METRICS = [
  { key: 'duplicateRatePct', label: 'Duplicate Rate' },
  { key: 'invalidObservationsPct', label: 'Invalid Observations' },
] as const;

export default function FleetQualityScreen() {
  const { data } = useFleetQuality();

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Fleet Data Quality" />
      <View style={styles.content}>
        {METRICS.map((m) => (
          <MetricBar key={m.key} label={m.label} value={data?.[m.key] ?? 0} good />
        ))}
        <Text style={styles.sectionLabel}>ISSUES TO WATCH</Text>
        {INVERSE_METRICS.map((m) => (
          <MetricBar key={m.key} label={m.label} value={data?.[m.key] ?? 0} good={false} />
        ))}
      </View>
    </View>
  );
}

function MetricBar({ label, value, good }: { label: string; value: number; good: boolean }) {
  const color = good ? (value > 80 ? colors.green : value > 60 ? colors.warning : colors.critical) : value < 5 ? colors.green : value < 15 ? colors.warning : colors.critical;
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
  content: { padding: spacing.md, gap: spacing.sm },
  sectionLabel: { ...typography.caps, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs },
  metricRow: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm + 2, gap: 6 },
  metricHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  metricLabel: { ...typography.bodyMd, color: colors.text },
  metricValue: { ...typography.numeric, fontSize: 15 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  fill: { height: '100%' },
});
