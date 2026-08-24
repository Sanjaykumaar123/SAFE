/** §29 — Fleet Payments: review, approve, hold, reject. */
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PermissionGate } from '@/components/common/PermissionGate';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { TabPills } from '@/components/admin/TabPills';
import { PaymentStatus } from '@/constants/enums';
import { Permission } from '@/constants/permissions';
import { colors, spacing, typography } from '@/constants/theme';
import { usePaymentActions, usePayments } from '@/features/fleet/useFleet';
import { formatInr } from '@/utils/format';
import type { FleetPayment } from '@/types/admin';

const TABS = ['ALL', ...Object.values(PaymentStatus)] as const;
const STATUS_COLOR: Record<FleetPayment['status'], string> = { PENDING: colors.warning, APPROVED: colors.primaryBlue, PAID: colors.green, HELD: colors.textSecondary, FAILED: colors.critical, REJECTED: colors.critical };

export default function FleetPaymentsScreen() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('ALL');
  const { data, isLoading, isError, error, refetch } = usePayments(tab === 'ALL' ? undefined : tab);
  const { approve, hold, reject } = usePaymentActions();

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Fleet Payments" />
      <TabPills tabs={TABS} value={tab} onChange={setTab} />

      {isLoading ? (
        <LoadingState label="Loading payments…" />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message ?? 'Could not load payments.'} onRetry={refetch} />
      ) : !data?.items.length ? (
        <EmptyState title="No payments in this tab" />
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.operator}>{item.operatorName}</Text>
                <Text style={[styles.status, { color: STATUS_COLOR[item.status] }]}>{item.status}</Text>
              </View>
              <Text style={styles.meta}>{item.periodLabel} · {item.validatedTrips} validated trips</Text>
              <Text style={styles.amount}>{formatInr(item.amount)}</Text>
              {item.status === 'PENDING' ? (
                <PermissionGate permission={Permission.MANAGE_PAYMENTS}>
                  <View style={styles.actionsRow}>
                    <Button label="Approve" size="sm" fullWidth={false} onPress={() => approve.mutate(item.id)} style={styles.actionButton} />
                    <Button label="Hold" size="sm" variant="outline" fullWidth={false} onPress={() => hold.mutate({ id: item.id, reason: 'Under review' })} style={styles.actionButton} />
                    <Button label="Reject" size="sm" variant="danger" fullWidth={false} onPress={() => reject.mutate({ id: item.id, reason: 'Failed validation' })} style={styles.actionButton} />
                  </View>
                </PermissionGate>
              ) : null}
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: { gap: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  operator: { ...typography.bodyMd, fontWeight: '700', color: colors.text },
  status: { ...typography.caps },
  meta: { ...typography.labelSm, color: colors.textSecondary },
  amount: { ...typography.numeric, fontSize: 18, color: colors.deepNavy, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  actionButton: { flex: 1 },
});
