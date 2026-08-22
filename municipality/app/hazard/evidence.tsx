import { useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Card } from '@/components/common/Card';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useHazardDetail } from '@/features/hazards/useHazardDetail';

/** Section 30 — every evidence item shown side-by-side with a consistent
 * shape (timestamp, image, location/confidence, status) for easy
 * comparison. */
export default function EvidenceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: hazard, isLoading, isError, error, refetch } = useHazardDetail(id ?? null);

  if (isLoading) return <LoadingState label="Loading evidence…" />;
  if (isError || !hazard) return <ErrorState message={(error as Error)?.message ?? 'Evidence unavailable.'} onRetry={refetch} />;

  return (
    <View style={[styles.flex, { paddingTop: insets.top + spacing.sm }]}>
      <ScreenHeader title="Evidence" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Citizen Reports ({hazard.citizenReports.length})</Text>
        {hazard.citizenReports.length === 0 ? (
          <Text style={styles.emptyText}>No citizen reports linked to this hazard.</Text>
        ) : (
          hazard.citizenReports.map((report) => (
            <Card key={report.id} style={styles.card}>
              <Text style={styles.cardTitle}>{report.reportCode}</Text>
              <Text style={styles.cardMeta}>{report.hazardType.replace('_', ' ')} · {report.severity}</Text>
              {report.description ? <Text style={styles.cardBody}>{report.description}</Text> : null}
              {report.media[0] ? <Image source={{ uri: report.media[0] }} style={styles.image} /> : null}
              <Text style={styles.cardTime}>{new Date(report.createdAt).toLocaleString()}</Text>
            </Card>
          ))
        )}

        <Text style={styles.sectionTitle}>AI Analysis</Text>
        {hazard.latestAiAnalysis ? (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>{hazard.latestAiAnalysis.detected ? 'Hazard Detected' : 'No Hazard Detected'}</Text>
            <Text style={styles.cardMeta}>
              {Math.round(hazard.latestAiAnalysis.confidence * 100)}% confidence · model {hazard.latestAiAnalysis.modelVersion}
            </Text>
            <Image source={{ uri: hazard.latestAiAnalysis.imageUrl }} style={styles.image} />
            <Text style={styles.cardTime}>{new Date(hazard.latestAiAnalysis.createdAt).toLocaleString()}</Text>
          </Card>
        ) : (
          <Text style={styles.emptyText}>No AI analysis on record.</Text>
        )}

        <Text style={styles.sectionTitle}>Fleet Observations ({hazard.latestFleetObservations.length})</Text>
        {hazard.latestFleetObservations.length === 0 ? (
          <Text style={styles.emptyText}>No recent fleet observations.</Text>
        ) : (
          hazard.latestFleetObservations.map((obs, index) => (
            <Card key={obs.id} style={styles.card}>
              <Text style={styles.cardTitle}>Fleet Observation {index + 1} — Vehicle {obs.vehicleId}</Text>
              <Text style={[styles.cardMeta, obs.observationState === 'CLEAR' ? styles.clearText : styles.detectedText]}>
                {obs.observationState === 'CLEAR' ? 'Clear' : 'Detected'}
                {obs.confidence != null ? ` · ${Math.round(obs.confidence * 100)}% confidence` : ''}
                {obs.dataQuality ? ` · ${obs.dataQuality} quality` : ''}
              </Text>
              {obs.imageUrl ? <Image source={{ uri: obs.imageUrl }} style={styles.image} /> : null}
              <Text style={styles.cardTime}>{new Date(obs.observedAt).toLocaleString()}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.xs },
  sectionTitle: { ...typography.headlineMd, color: colors.deepNavy, marginTop: spacing.lg, marginBottom: spacing.xs },
  emptyText: { ...typography.bodyMd, color: colors.textSecondary },
  card: { marginBottom: spacing.sm, gap: 4 },
  cardTitle: { ...typography.bodyLg, color: colors.text, fontWeight: '700' },
  cardMeta: { ...typography.bodyMd, color: colors.textSecondary },
  cardBody: { ...typography.bodyMd, color: colors.text },
  cardTime: { ...typography.labelSm, color: colors.textSecondary, marginTop: 4 },
  image: { width: '100%', height: 180, borderRadius: radius.md, marginTop: spacing.xs, backgroundColor: colors.surfaceMuted },
  clearText: { color: colors.green, fontWeight: '700' },
  detectedText: { color: colors.critical, fontWeight: '700' },
});
