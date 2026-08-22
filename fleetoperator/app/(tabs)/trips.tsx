import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { Route } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SessionStatusBadge } from '@/components/common/Badge';
import { colors, spacing, typography } from '@/constants/theme';
import { useSessionHistory } from '@/features/session/useSession';
import { toApiError } from '@/services/api/client';
import type { CollectionSession } from '@/types/fleet';

/** §37/49 — trip history. Every number here is the backend's, including
 * whether a trip is still `PARTIALLY_VALIDATED` (§39 — never assume a trip
 * is instantly, fully payable). */
export default function TripsScreen() {
  const history = useSessionHistory();

  if (history.isLoading) return <LoadingState label="Loading trips…" />;
  if (history.isError) return <ErrorState message={toApiError(history.error).message} onRetry={() => history.refetch()} />;

  const items = history.data?.items ?? [];
  if (items.length === 0) {
    return <EmptyState icon={<Route size={40} color={colors.textSecondary} />} title="No trips yet" message="Completed collection trips will show up here." />;
  }

  return (
    <FlashList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => <TripRow session={item} />}
    />
  );
}

function TripRow({ session }: { session: CollectionSession }) {
  const started = new Date(session.startTime);
  return (
    <Pressable onPress={() => router.push(`/trip/${session.id}`)}>
      <Card style={styles.row}>
        <View style={styles.rowHeader}>
          <Text style={styles.date}>
            {started.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {started.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <SessionStatusBadge status={session.status} />
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.stat}>{(session.validatedDistanceKm ?? session.reportedDistanceKm).toFixed(1)} km</Text>
          <Text style={styles.statDivider}>·</Text>
          <Text style={styles.stat}>{session.observationCount} detections</Text>
          {session.dataQualityScore != null ? (
            <>
              <Text style={styles.statDivider}>·</Text>
              <Text style={styles.stat}>{Math.round(session.dataQualityScore)}% quality</Text>
            </>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.sm },
  row: { gap: spacing.xs },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { ...typography.bodyMd, color: colors.text, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  stat: { ...typography.bodyMd, color: colors.textSecondary },
  statDivider: { color: colors.border },
});
