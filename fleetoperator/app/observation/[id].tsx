import { useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SyncStatusBadge } from '@/components/common/Badge';
import { SyncStatus } from '@/constants/enums';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useObservationDetail } from '@/features/observations/useObservations';
import { toApiError } from '@/services/api/client';

/** §50 — full detail of a single road observation, including bounding
 * box coordinates as reported by the AI model. */
export default function ObservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useObservationDetail(id);

  if (query.isLoading) return <LoadingState label="Loading observation…" />;
  if (query.isError) return <ErrorState message={toApiError(query.error).message} onRetry={() => query.refetch()} />;

  const observation = query.data!;
  const observed = new Date(observation.observedAt);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader title="Observation" />

      {observation.imageUrl ? (
        <Image source={{ uri: observation.imageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>No evidence image</Text>
        </View>
      )}

      <Card style={styles.card}>
        <Row label="Hazard" value={observation.hazardType ?? '—'} />
        <Row label="Confidence" value={observation.confidence != null ? `${Math.round(observation.confidence * 100)}%` : '—'} />
        <Row label="Severity" value={observation.severity ?? '—'} />
        <Row label="GPS" value={`${observation.latitude.toFixed(5)}, ${observation.longitude.toFixed(5)}`} />
        <Row label="Time" value={observed.toLocaleString()} />
        <Row label="Data Quality" value={observation.dataQuality ?? '—'} />
        <View style={styles.statusRow}>
          <Text style={styles.rowLabel}>Sync</Text>
          <SyncStatusBadge status={SyncStatus.SYNCED} />
        </View>
      </Card>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  image: { width: '100%', height: 220, borderRadius: radius.lg },
  imagePlaceholder: { width: '100%', height: 220, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderText: { ...typography.bodyMd, color: colors.textSecondary },
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { ...typography.bodyMd, color: colors.textSecondary },
  rowValue: { ...typography.bodyMd, color: colors.text, fontWeight: '600' },
});
