/** §22 — Municipality details: officers, active/critical hazards, repairs,
 * resolution performance, and access management. */
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PermissionGate } from '@/components/common/PermissionGate';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { StatCard } from '@/components/common/StatCard';
import { Permission } from '@/constants/permissions';
import { colors, spacing, typography } from '@/constants/theme';
import { useDisableMunicipalityAccess, useMunicipalityDetail } from '@/features/cities/useCities';

export default function MunicipalityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: muni, isLoading, isError, error, refetch } = useMunicipalityDetail(id);
  const disableAccess = useDisableMunicipalityAccess();
  const [confirmDisable, setConfirmDisable] = useState(false);

  if (isLoading) return <LoadingState label="Loading municipality…" />;
  if (isError || !muni) return <ErrorState message={(error as Error)?.message ?? 'Municipality not found.'} onRetry={refetch} />;

  return (
    <View style={styles.flex}>
      <ScreenHeader title={muni.name} subtitle={muni.cityName} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.kpiGrid}>
          <StatCard label="Active Hazards" value={muni.activeHazards} tone="critical" />
          <StatCard label="Critical" value={muni.criticalHazards} tone="critical" />
          <StatCard label="Open Repairs" value={muni.openRepairs} tone="warning" />
          <StatCard label="Resolution Rate" value={`${muni.resolutionRatePct}%`} tone="success" />
          <StatCard label="Avg Resolution" value={`${muni.avgResolutionDays}d`} tone="default" />
          <StatCard label="Officers" value={muni.officerCount} tone="default" />
        </View>

        <Text style={styles.sectionLabel}>OFFICERS</Text>
        <View style={styles.officersList}>
          {muni.officers.map((officer) => (
            <Card key={officer.id} style={styles.officerCard}>
              <Text style={styles.officerName}>{officer.name}</Text>
              <Text style={styles.officerMeta}>{officer.email} · {officer.role}</Text>
              <Text style={[styles.officerStatus, officer.status !== 'ACTIVE' && { color: colors.critical }]}>{officer.status}</Text>
            </Card>
          ))}
          {!muni.officers.length ? <Text style={styles.emptyHint}>No officers on record yet.</Text> : null}
        </View>

        <PermissionGate permission={Permission.MANAGE_MUNICIPALITIES}>
          <View style={styles.actionsBlock}>
            <Button label="Disable Municipality Access" variant="danger" onPress={() => setConfirmDisable(true)} disabled={muni.status !== 'ACTIVE'} />
          </View>
        </PermissionGate>
      </ScrollView>

      <ConfirmDialog
        visible={confirmDisable}
        title="Disable municipality access?"
        message="Officers in this municipality immediately lose the ability to sign in and act on hazards until re-enabled."
        destructive
        requireReason
        busy={disableAccess.isPending}
        onConfirm={(reason) => {
          disableAccess.mutate({ id: muni.id, reason: reason ?? '' });
          setConfirmDisable(false);
        }}
        onCancel={() => setConfirmDisable(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xxl },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  sectionLabel: { ...typography.caps, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs },
  officersList: { gap: spacing.xs },
  officerCard: { gap: 2 },
  officerName: { ...typography.bodyMd, fontWeight: '700', color: colors.text },
  officerMeta: { ...typography.labelSm, color: colors.textSecondary },
  officerStatus: { ...typography.labelSm, color: colors.green, marginTop: 2 },
  emptyHint: { ...typography.bodyMd, color: colors.textSecondary },
  actionsBlock: { marginTop: spacing.lg },
});
