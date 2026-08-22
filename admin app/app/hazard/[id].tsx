/** §15/§16/§17/§48/§54 — Hazard Detail: evidence timeline, source
 * breakdown, and validation actions with confirm-then-audit semantics. */
import { useLocalSearchParams, router } from 'expo-router';
import { Camera, CheckCircle2, Copy, Flag, MapPin, RotateCcw, Truck, User, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ConfidenceBadge, HazardStatusBadge, SeverityBadge, SourceBadge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PermissionGate } from '@/components/common/PermissionGate';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Permission } from '@/constants/permissions';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useHazardDetail } from '@/features/hazards/useHazardDetail';
import { useFlagHazard, useRejectHazard, useReopenHazard, useVerifyHazard } from '@/features/hazards/useHazardMutations';
import { formatDateTime } from '@/utils/format';
import type { EvidenceItem } from '@/types/admin';

type Action = 'VERIFY' | 'REJECT' | 'REOPEN' | 'FLAG' | null;

const EVIDENCE_ICON: Record<EvidenceItem['kind'], typeof User> = { CITIZEN: User, AI: Camera, FLEET: Truck, MUNICIPALITY: CheckCircle2 };

export default function HazardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: hazard, isLoading, isError, error, refetch } = useHazardDetail(id);
  const [action, setAction] = useState<Action>(null);

  const verify = useVerifyHazard();
  const reject = useRejectHazard();
  const reopen = useReopenHazard();
  const flag = useFlagHazard();

  if (isLoading) return <LoadingState label="Loading hazard…" />;
  if (isError || !hazard) return <ErrorState message={(error as Error)?.message ?? 'Hazard not found.'} onRetry={refetch} />;

  const busy = verify.isPending || reject.isPending || reopen.isPending || flag.isPending;

  const runAction = async (reason?: string) => {
    if (action === 'VERIFY') await verify.mutateAsync({ id: hazard.id, version: hazard.version });
    if (action === 'REJECT') await reject.mutateAsync({ id: hazard.id, version: hazard.version, reason: reason ?? '' });
    if (action === 'REOPEN') await reopen.mutateAsync({ id: hazard.id, version: hazard.version, reason: reason ?? '' });
    if (action === 'FLAG') await flag.mutateAsync({ id: hazard.id, reason: reason ?? '' });
    setAction(null);
  };

  return (
    <View style={styles.flex}>
      <ScreenHeader title={hazard.code} subtitle={hazard.cityName} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.summaryCard}>
          <Text style={styles.title}>{hazard.title}</Text>
          <View style={styles.locationRow}>
            <MapPin size={13} color={colors.textSecondary} />
            <Text style={styles.locationText}>{hazard.locationText}</Text>
          </View>
          <View style={styles.badgeRow}>
            <SeverityBadge severity={hazard.severity} />
            <HazardStatusBadge status={hazard.status} />
            <ConfidenceBadge confidence={hazard.aiConfidence} />
            <SourceBadge label={hazard.source} />
          </View>
          <View style={styles.statsRow}>
            <Stat label="Citizen reports" value={hazard.citizenReportCount} />
            <Stat label="Fleet observations" value={hazard.fleetObservationCount} />
            <Stat label="Linked hazards" value={hazard.linkedHazardIds.length} />
          </View>
        </Card>

        <Text style={styles.sectionLabel}>EVIDENCE TIMELINE</Text>
        <View style={styles.evidenceList}>
          {hazard.evidence.map((item) => {
            const Icon = EVIDENCE_ICON[item.kind];
            return (
              <Card key={item.id} style={styles.evidenceCard}>
                <View style={styles.evidenceRow}>
                  <View style={styles.evidenceIcon}>
                    <Icon size={15} color={colors.primaryBlue} />
                  </View>
                  <View style={styles.evidenceBody}>
                    <Text style={styles.evidenceTitle}>{item.title}</Text>
                    <Text style={styles.evidenceDetail}>{item.detail}</Text>
                    <Text style={styles.evidenceMeta}>
                      {item.actorLabel} · {formatDateTime(item.timestamp)}
                      {item.gpsQuality ? ` · GPS ${item.gpsQuality}` : ''}
                    </Text>
                  </View>
                </View>
                {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.evidenceImage} /> : null}
              </Card>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>HAZARD LIFECYCLE</Text>
        <Card style={styles.timelineCard}>
          {hazard.timeline.map((step, idx) => (
            <View key={step.id} style={styles.timelineRow}>
              <View style={styles.timelineMarkerWrap}>
                <View style={[styles.timelineDot, step.done && styles.timelineDotDone]} />
                {idx < hazard.timeline.length - 1 ? <View style={[styles.timelineLine, step.done && styles.timelineLineDone]} /> : null}
              </View>
              <View style={styles.timelineBody}>
                <Text style={[styles.timelineLabel, !step.done && styles.timelineLabelPending]}>{step.label}</Text>
                <Text style={styles.timelineMeta}>{step.actorLabel}</Text>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>

      <PermissionGate permission={Permission.VALIDATE_HAZARD}>
        <View style={styles.actionBar}>
          <Button label="VERIFY" icon={<CheckCircle2 size={16} color={colors.white} />} onPress={() => setAction('VERIFY')} style={styles.actionButton} />
          <PermissionGate permission={Permission.MERGE_HAZARD}>
            <Button label="MERGE" variant="outline" icon={<Copy size={16} color={colors.primaryBlue} />} onPress={() => router.push(`/hazard/merge?hazardId=${hazard.id}`)} style={styles.actionButton} />
          </PermissionGate>
          <PermissionGate permission={Permission.REJECT_HAZARD}>
            <Button label="REJECT" variant="danger" icon={<XCircle size={16} color={colors.white} />} onPress={() => setAction('REJECT')} style={styles.actionButton} />
          </PermissionGate>
        </View>
        <View style={styles.actionBarSecondary}>
          <PermissionGate permission={Permission.REOPEN_HAZARD}>
            <Button label="REOPEN" variant="ghost" size="sm" icon={<RotateCcw size={14} color={colors.primaryBlue} />} onPress={() => setAction('REOPEN')} fullWidth={false} />
          </PermissionGate>
          <Button label="FLAG" variant="ghost" size="sm" icon={<Flag size={14} color={colors.primaryBlue} />} onPress={() => setAction('FLAG')} fullWidth={false} />
        </View>
      </PermissionGate>

      <ConfirmDialog
        visible={action !== null}
        title={action === 'VERIFY' ? 'Verify this hazard?' : action === 'REJECT' ? 'Reject this hazard?' : action === 'REOPEN' ? 'Reopen this hazard?' : 'Flag this hazard for review?'}
        message={action === 'VERIFY' ? 'This confirms the hazard is real and moves it into the active funnel.' : 'This action is logged to the audit trail with your reason.'}
        contextLines={[`${hazard.citizenReportCount} citizen report(s)`, `${hazard.fleetObservationCount} fleet observation(s)`, `AI confidence ${Math.round(hazard.aiConfidence * 100)}%`, hazard.locationText]}
        destructive={action === 'REJECT'}
        requireReason={action === 'REJECT' || action === 'REOPEN' || action === 'FLAG'}
        busy={busy}
        onConfirm={runAction}
        onCancel={() => setAction(null)}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 160, gap: spacing.xs },
  summaryCard: { gap: spacing.xs },
  title: { ...typography.headlineMd, color: colors.deepNavy },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { ...typography.bodyMd, color: colors.textSecondary },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  stat: {},
  statValue: { ...typography.numeric, fontSize: 16, color: colors.deepNavy },
  statLabel: { ...typography.labelSm, color: colors.textSecondary },
  sectionLabel: { ...typography.caps, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs },
  evidenceList: { gap: spacing.xs },
  evidenceCard: { gap: spacing.sm },
  evidenceRow: { flexDirection: 'row', gap: spacing.sm },
  evidenceIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: `${colors.primaryBlue}14`, alignItems: 'center', justifyContent: 'center' },
  evidenceBody: { flex: 1, gap: 2 },
  evidenceTitle: { ...typography.bodyMd, fontWeight: '700', color: colors.text },
  evidenceDetail: { ...typography.labelSm, color: colors.textSecondary },
  evidenceMeta: { ...typography.labelSm, color: colors.textSecondary, fontSize: 10 },
  evidenceImage: { width: '100%', height: 140, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted },
  timelineCard: { gap: 0 },
  timelineRow: { flexDirection: 'row', gap: spacing.sm },
  timelineMarkerWrap: { alignItems: 'center', width: 16 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
  timelineDotDone: { backgroundColor: colors.primaryBlue },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.border, minHeight: 24 },
  timelineLineDone: { backgroundColor: colors.primaryBlue },
  timelineBody: { flex: 1, paddingBottom: spacing.sm },
  timelineLabel: { ...typography.bodyMd, fontWeight: '600', color: colors.text },
  timelineLabelPending: { color: colors.textSecondary },
  timelineMeta: { ...typography.labelSm, color: colors.textSecondary },
  actionBar: { flexDirection: 'row', gap: spacing.xs, padding: spacing.md, paddingBottom: 4, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border },
  actionButton: { flex: 1 },
  actionBarSecondary: { flexDirection: 'row', gap: spacing.md, justifyContent: 'center', paddingBottom: spacing.md, backgroundColor: colors.white },
});
