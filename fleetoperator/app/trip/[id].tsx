import { useLocalSearchParams, router } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SessionStatusBadge } from '@/components/common/Badge';
import { colors, spacing, typography } from '@/constants/theme';
import { useSessionDetail } from '@/features/session/useSession';
import { toApiError } from '@/services/api/client';
import { useMonitoringStore } from '@/store/monitoringStore';

/**
 * §37/50 — trip summary. Reused for both the immediate post-stop screen
 * (uses the just-finished `tripSummary` in `monitoringStore`, which also
 * carries `durationMinutes`/`estimatedEarnings` the list/detail API alone
 * doesn't) and for tapping into trip history later (falls back to
 * `GET /fleet/sessions/{id}`).
 */
export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripSummary = useMonitoringStore((s) => s.tripSummary);
  const isImmediateSummary = tripSummary?.session.id === id;

  const detailQuery = useSessionDetail(isImmediateSummary ? undefined : id);

  if (!isImmediateSummary && detailQuery.isLoading) return <LoadingState label="Loading trip…" />;
  if (!isImmediateSummary && detailQuery.isError) return <ErrorState message={toApiError(detailQuery.error).message} onRetry={() => detailQuery.refetch()} />;

  const session = isImmediateSummary ? tripSummary!.session : detailQuery.data!;
  const distanceKm = session.validatedDistanceKm ?? session.reportedDistanceKm;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!isImmediateSummary ? <ScreenHeader title="Trip Detail" /> : null}

      {isImmediateSummary ? (
        <View style={styles.completeBanner}>
          <CheckCircle2 size={40} color={colors.green} />
          <Text style={styles.completeTitle}>TRIP COMPLETED</Text>
        </View>
      ) : null}

      <Card style={styles.card}>
        <StatRow label="Distance" value={`${distanceKm.toFixed(1)} km`} />
        {isImmediateSummary ? <StatRow label="Duration" value={formatDuration(tripSummary!.durationMinutes)} /> : null}
        <StatRow label="Detections" value={String(session.observationCount)} />
        <StatRow label="Valid observations" value={String(session.validObservationCount)} />
        {session.dataQualityScore != null ? <StatRow label="Data quality" value={`${Math.round(session.dataQualityScore)}%`} /> : null}
        <View style={styles.statusRow}>
          <Text style={styles.statLabel}>Status</Text>
          <SessionStatusBadge status={session.status} />
        </View>
      </Card>

      {isImmediateSummary ? (
        <Card style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>ESTIMATED EARNINGS</Text>
          <Text style={styles.earningsValue}>₹{Math.round(tripSummary!.estimatedEarnings)}</Text>
          <Text style={styles.earningsNote}>Final payout is confirmed once the trip is fully validated.</Text>
        </Card>
      ) : null}

      {isImmediateSummary ? <Button label="Back to Home" onPress={() => router.replace('/(tabs)/home')} /> : null}
    </ScrollView>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  completeBanner: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  completeTitle: { ...typography.headlineMd, color: colors.deepNavy, letterSpacing: 1 },
  card: { gap: spacing.sm },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { ...typography.bodyMd, color: colors.textSecondary },
  statValue: { ...typography.bodyMd, color: colors.text, fontWeight: '600' },
  earningsCard: { alignItems: 'center', gap: spacing.xxs },
  earningsLabel: { ...typography.labelMd, color: colors.textSecondary },
  earningsValue: { ...typography.headlineLg, color: colors.green },
  earningsNote: { ...typography.labelSm, color: colors.textSecondary, textAlign: 'center' },
});
