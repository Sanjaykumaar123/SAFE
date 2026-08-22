import { useLocalSearchParams, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RepairStatusBadge, SeverityBadge, SourceBadge, StatusBadge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SOURCE_SUMMARY_LABELS, VERIFICATION_STATE_LABELS } from '@/constants/enums';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useHazardDetail, useHazardTimeline, useHazardVerification } from '@/features/hazards/useHazardDetail';
import { useMunicipalityStore } from '@/store/municipalityStore';

export default function HazardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const hasPermission = useMunicipalityStore((s) => s.hasPermission);

  const { data: hazard, isLoading, isError, error, refetch } = useHazardDetail(id ?? null);
  const { data: verification } = useHazardVerification(id ?? null);
  const { data: timeline } = useHazardTimeline(id ?? null);

  if (isLoading) return <LoadingState label="Loading hazard…" />;
  if (isError || !hazard) return <ErrorState message={(error as Error)?.message ?? 'Hazard unavailable.'} onRetry={refetch} />;

  const canAssign = hasPermission('ASSIGN_REPAIR');
  const canInspect = hasPermission('INSPECT_HAZARD');

  return (
    <View style={[styles.flex, { paddingTop: insets.top + spacing.sm }]}>
      <ScreenHeader title={hazard.hazardCode} />
      <ScrollView contentContainerStyle={styles.container}>
        {hazard.resolutionState !== 'ACTIVE' ? (
          <View style={[styles.stateBanner, hazard.resolutionState === 'RESOLVED' ? styles.stateBannerResolved : styles.stateBannerReopened]}>
            <Text style={styles.stateBannerText}>
              {hazard.resolutionState === 'RESOLVED' ? 'This hazard has been resolved.' : 'Previously resolved — new road deterioration detected.'}
            </Text>
          </View>
        ) : null}

        <Text style={styles.hazardType}>{hazard.type.replace('_', ' ')}</Text>
        <Text style={styles.roadName}>{hazard.roadName ?? hazard.locationText}</Text>
        <Text style={styles.location}>{hazard.locationText}</Text>

        <View style={styles.badgeRow}>
          <SeverityBadge severity={hazard.severity} />
          <StatusBadge status={hazard.status} />
          <SourceBadge label={SOURCE_SUMMARY_LABELS[hazard.sourceSummary] ?? hazard.sourceSummary} />
        </View>
        {hazard.aiConfidence != null ? <Text style={styles.aiConfidence}>AI confidence: {Math.round(hazard.aiConfidence * 100)}%</Text> : null}
        <Text style={styles.lastObserved}>Last observed {new Date(hazard.lastObservedAt).toLocaleString()}</Text>

        {/* Priority recommendation (section 31) */}
        <SectionTitle title="Road Priority" />
        <Card style={[styles.priorityCard, priorityCardStyle(hazard.priority.label)]}>
          <Text style={styles.priorityLabel}>{hazard.priority.label}</Text>
          <Text style={styles.priorityRecommendation}>{hazard.priority.recommendation}</Text>
          {hazard.priority.reasons.map((reason) => (
            <Text key={reason} style={styles.priorityReason}>
              • {reason}
            </Text>
          ))}
        </Card>

        {/* Evidence (sections 29/30) */}
        <SectionTitle title="Evidence" />
        <Pressable onPress={() => router.push({ pathname: '/hazard/evidence', params: { id: hazard.id } })}>
          <Card style={styles.evidenceCard}>
            <Text style={styles.evidenceLine}>Citizen reports: {hazard.citizenReports.length}</Text>
            <Text style={styles.evidenceLine}>AI analysis: {hazard.latestAiAnalysis ? `${Math.round(hazard.latestAiAnalysis.confidence * 100)}% confidence` : 'None'}</Text>
            <Text style={styles.evidenceLine}>Fleet observations: {hazard.latestFleetObservations.length}</Text>
            <Text style={styles.evidenceLink}>View full evidence →</Text>
          </Card>
        </Pressable>

        {/* Verification / last 5 vehicle observations (section 26/27) */}
        <SectionTitle title="Road Condition Verification" />
        {verification ? (
          <Card>
            <View style={styles.verificationHeader}>
              <Text style={styles.verificationState}>{VERIFICATION_STATE_LABELS[verification.state]}</Text>
              <Text style={styles.verificationConfidence}>{verification.confidence}%</Text>
            </View>
            <Text style={styles.verificationSummary}>{verification.summary}</Text>
            {verification.reopenSuggested ? <Text style={styles.reopenSuggestion}>New deterioration detected on a previously resolved hazard.</Text> : null}
            <View style={styles.observationList}>
              {verification.observations.map((obs, index) => (
                <View key={obs.id} style={styles.observationRow}>
                  <Text style={styles.observationVehicle}>Vehicle {String(index + 1).padStart(2, '0')}</Text>
                  <Text style={[styles.observationState, obs.observationState === 'CLEAR' ? styles.observationClear : styles.observationDetected]}>
                    {obs.observationState === 'CLEAR' ? 'Clear' : 'Detected'}
                  </Text>
                  <Text style={styles.observationTime}>{new Date(obs.observedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
              ))}
              {verification.observations.length === 0 ? <Text style={styles.evidenceLine}>No recent fleet observations yet.</Text> : null}
            </View>
          </Card>
        ) : (
          <LoadingState label="Loading verification…" />
        )}

        {/* Current repair status */}
        {hazard.currentRepair ? (
          <>
            <SectionTitle title="Repair Status" />
            <Pressable onPress={() => router.push(`/repair/${hazard.currentRepair!.id}`)}>
              <Card style={styles.repairCard}>
                <View style={styles.repairCardRow}>
                  <Text style={styles.repairCode}>{hazard.currentRepair.repairCode}</Text>
                  <RepairStatusBadge status={hazard.currentRepair.status} />
                </View>
                <Text style={styles.evidenceLine}>Team: {hazard.currentRepair.team ?? 'Unassigned'}</Text>
                {hazard.currentRepair.targetDate ? <Text style={styles.evidenceLine}>Target: {hazard.currentRepair.targetDate}</Text> : null}
              </Card>
            </Pressable>
          </>
        ) : null}

        {/* Timeline (section 32) */}
        <SectionTitle title="Timeline" />
        <Card>
          {(timeline?.events ?? []).length === 0 ? (
            <Text style={styles.evidenceLine}>No activity recorded yet.</Text>
          ) : (
            timeline!.events.map((event) => (
              <View key={event.id} style={styles.timelineRow}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>{event.label}</Text>
                  {event.detail ? <Text style={styles.timelineDetail}>{event.detail}</Text> : null}
                  <Text style={styles.timelineTime}>{new Date(event.createdAt).toLocaleString()}</Text>
                </View>
              </View>
            ))
          )}
        </Card>
      </ScrollView>

      {/* Primary action */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        {!hazard.currentRepair && canAssign && hazard.resolutionState !== 'RESOLVED' ? (
          <Button label="Assign Repair" onPress={() => router.push({ pathname: '/repair/assign', params: { hazardId: hazard.id } })} />
        ) : null}
        {hazard.currentRepair?.status === 'READY_FOR_INSPECTION' && canInspect ? (
          <Button label="Review Inspection" onPress={() => router.push(`/inspection/${hazard.id}`)} />
        ) : null}
        {hazard.currentRepair && hazard.currentRepair.status !== 'READY_FOR_INSPECTION' ? (
          <Button label="View Repair" variant="outline" onPress={() => router.push(`/repair/${hazard.currentRepair!.id}`)} />
        ) : null}
      </View>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function priorityCardStyle(label: string) {
  if (label === 'CRITICAL' || label === 'HIGH') return { borderColor: colors.critical };
  if (label === 'MEDIUM') return { borderColor: colors.warning };
  return { borderColor: colors.border };
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.xs },
  stateBanner: { padding: spacing.sm, borderRadius: radius.md, marginBottom: spacing.sm },
  stateBannerResolved: { backgroundColor: `${colors.green}1A` },
  stateBannerReopened: { backgroundColor: `${colors.critical}1A` },
  stateBannerText: { ...typography.bodyMd, color: colors.text, fontWeight: '600' },
  hazardType: { ...typography.labelMd, color: colors.textSecondary },
  roadName: { ...typography.headlineLgMobile, color: colors.deepNavy, marginTop: 2 },
  location: { ...typography.bodyMd, color: colors.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, flexWrap: 'wrap' },
  aiConfidence: { ...typography.bodyMd, color: colors.secondaryBlue, marginTop: spacing.sm },
  lastObserved: { ...typography.labelSm, color: colors.textSecondary, marginTop: 4 },
  sectionTitle: { ...typography.headlineMd, color: colors.deepNavy, marginTop: spacing.lg, marginBottom: spacing.xs },
  priorityCard: { borderWidth: 2 },
  priorityLabel: { ...typography.headlineMd, color: colors.text },
  priorityRecommendation: { ...typography.bodyMd, color: colors.text, marginTop: 4, fontWeight: '600' },
  priorityReason: { ...typography.bodyMd, color: colors.textSecondary, marginTop: 4 },
  evidenceCard: { gap: 4 },
  evidenceLine: { ...typography.bodyMd, color: colors.text },
  evidenceLink: { ...typography.labelMd, color: colors.primaryBlue, marginTop: spacing.xs },
  verificationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  verificationState: { ...typography.headlineMd, color: colors.text },
  verificationConfidence: { ...typography.headlineMd, color: colors.primaryBlue },
  verificationSummary: { ...typography.bodyMd, color: colors.textSecondary, marginTop: 4 },
  reopenSuggestion: { ...typography.bodyMd, color: colors.critical, marginTop: spacing.xs, fontWeight: '600' },
  observationList: { marginTop: spacing.sm, gap: spacing.xs },
  observationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  observationVehicle: { ...typography.bodyMd, color: colors.text, width: 90 },
  observationState: { ...typography.labelMd, fontWeight: '700', width: 80 },
  observationClear: { color: colors.green },
  observationDetected: { color: colors.critical },
  observationTime: { ...typography.labelSm, color: colors.textSecondary },
  repairCard: { gap: 4 },
  repairCardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  repairCode: { ...typography.bodyLg, color: colors.text, fontWeight: '700' },
  timelineRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primaryBlue, marginTop: 6 },
  timelineContent: { flex: 1 },
  timelineLabel: { ...typography.bodyMd, color: colors.text, fontWeight: '600' },
  timelineDetail: { ...typography.bodyMd, color: colors.textSecondary, marginTop: 2 },
  timelineTime: { ...typography.labelSm, color: colors.textSecondary, marginTop: 2 },
  actionBar: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, gap: spacing.sm },
});
