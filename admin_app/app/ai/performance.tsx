/** §33 — AI Performance: precision, recall, mAP, latency, FP/km,
 * confidence distribution. False positives/km is called out as
 * "especially relevant for the fleet-monitoring use case" (§33). */
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { StatCard } from '@/components/common/StatCard';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAiPerformance } from '@/features/ai/useAi';

export default function AiPerformanceScreen() {
  const { data } = useAiPerformance();
  const maxBucket = Math.max(1, ...(data?.confidenceDistribution.map((b) => b.count) ?? [1]));

  return (
    <View style={styles.flex}>
      <ScreenHeader title="AI Performance" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.kpiGrid}>
          <StatCard label="Precision" value={`${data?.precisionPct ?? 0}%`} tone="success" />
          <StatCard label="Recall" value={`${data?.recallPct ?? 0}%`} tone="info" />
          <StatCard label="mAP50" value={data?.mAP50.toFixed(2) ?? '—'} tone="default" />
          <StatCard label="mAP50-95" value={data?.mAP5095.toFixed(2) ?? '—'} tone="default" />
          <StatCard label="Avg Latency" value={`${data?.avgLatencyMs ?? 0}ms`} tone="default" />
          <StatCard label="FPS" value={data?.fps.toFixed(1) ?? '—'} tone="default" />
          <StatCard label="False Positives/km" value={data?.falsePositivesPerKm.toFixed(1) ?? '—'} tone="warning" sub="Fleet-monitoring relevance" />
          <StatCard label="Missed Detections/km" value={data?.missedDetectionsPerKm.toFixed(1) ?? '—'} tone="critical" />
        </View>

        <Text style={styles.sectionLabel}>CONFIDENCE DISTRIBUTION</Text>
        <View style={styles.chartCard}>
          {data?.confidenceDistribution.map((bucket) => (
            <View key={bucket.bucket} style={styles.bucketRow}>
              <Text style={styles.bucketLabel}>{bucket.bucket}</Text>
              <View style={styles.bucketTrack}>
                <View style={[styles.bucketFill, { width: `${(bucket.count / maxBucket) * 100}%` }]} />
              </View>
              <Text style={styles.bucketCount}>{bucket.count}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xxl },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  sectionLabel: { ...typography.caps, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs },
  chartCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm + 2, gap: spacing.xs },
  bucketRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bucketLabel: { ...typography.labelSm, color: colors.textSecondary, width: 64 },
  bucketTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  bucketFill: { height: '100%', backgroundColor: colors.primaryBlue },
  bucketCount: { ...typography.numeric, color: colors.text, width: 44, textAlign: 'right' },
});
