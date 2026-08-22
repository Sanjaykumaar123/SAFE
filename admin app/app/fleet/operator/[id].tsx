/** §27 — Operator detail + suspend/reactivate/reset access. */
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
import { useOperatorDetail, useReactivateOperator, useSuspendOperator } from '@/features/fleet/useFleet';
import { formatInr } from '@/utils/format';

export default function OperatorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: operator, isLoading, isError, error, refetch } = useOperatorDetail(id);
  const suspend = useSuspendOperator();
  const reactivate = useReactivateOperator();
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  if (isLoading) return <LoadingState label="Loading operator…" />;
  if (isError || !operator) return <ErrorState message={(error as Error)?.message ?? 'Operator not found.'} onRetry={refetch} />;

  return (
    <View style={styles.flex}>
      <ScreenHeader title={operator.name} subtitle={`${operator.operatorCode} · ${operator.cityName}`} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.kpiGrid}>
          <StatCard label="Coverage" value={`${operator.coveragePct}%`} tone="info" />
          <StatCard label="Data Quality" value={`${operator.dataQualityPct}%`} tone="success" />
          <StatCard label="Trips Completed" value={operator.tripsCompleted} tone="default" />
          <StatCard label="Pending Earnings" value={formatInr(operator.pendingEarnings)} tone="warning" />
        </View>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Assigned Vehicle</Text>
          <Text style={styles.value}>{operator.vehiclePlate ?? 'None assigned'}</Text>
          <Text style={styles.sectionTitle}>Status</Text>
          <Text style={styles.value}>{operator.status}</Text>
        </Card>

        <PermissionGate permission={Permission.MANAGE_OPERATORS}>
          <View style={styles.actionsRow}>
            {operator.status === 'SUSPENDED' ? (
              <Button label="Reactivate" onPress={() => reactivate.mutate(operator.id)} loading={reactivate.isPending} />
            ) : (
              <Button label="Suspend Data Ingestion" variant="danger" onPress={() => setConfirmSuspend(true)} />
            )}
          </View>
        </PermissionGate>
      </ScrollView>

      <ConfirmDialog
        visible={confirmSuspend}
        title="Suspend this operator?"
        message="New trip data from this operator stops being accepted until reactivated."
        destructive
        requireReason
        busy={suspend.isPending}
        onConfirm={(reason) => {
          suspend.mutate({ id: operator.id, reason: reason ?? '' });
          setConfirmSuspend(false);
        }}
        onCancel={() => setConfirmSuspend(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xxl },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  card: { gap: 4 },
  sectionTitle: { ...typography.caps, color: colors.textSecondary },
  value: { ...typography.bodyMd, color: colors.text, marginBottom: spacing.xs },
  actionsRow: { marginTop: spacing.md },
});
