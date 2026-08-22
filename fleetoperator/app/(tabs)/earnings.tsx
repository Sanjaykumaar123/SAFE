import { FlashList } from '@shopify/flash-list';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { EarningStatusBadge } from '@/components/common/Badge';
import { colors, spacing, typography } from '@/constants/theme';
import { useEarnings, usePayments } from '@/features/earnings/useEarnings';
import { toApiError } from '@/services/api/client';
import type { Payment } from '@/types/fleet';

/** §40-42/85 — every figure here is backend-computed; this screen only
 * displays it (§85: "Do NOT let the phone calculate authoritative
 * earnings"). */
export default function EarningsScreen() {
  const earnings = useEarnings();
  const payments = usePayments();

  if (earnings.isLoading) return <LoadingState label="Loading earnings…" />;
  if (earnings.isError) return <ErrorState message={toApiError(earnings.error).message} onRetry={() => earnings.refetch()} />;

  const data = earnings.data!;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.summaryRow}>
        <SummaryTile label="TODAY" value={data.today} />
        <SummaryTile label="THIS WEEK" value={data.thisWeek} />
        <SummaryTile label="THIS MONTH" value={data.thisMonth} />
      </View>

      <Card>
        <Text style={styles.sectionLabel}>TODAY'S BREAKDOWN</Text>
        <BreakdownRow label="Validated coverage" value={data.breakdownToday.coverageAmount} />
        <BreakdownRow label="Valid observations" value={data.breakdownToday.observationAmount} />
        <BreakdownRow label="Quality bonus" value={data.breakdownToday.qualityBonusAmount} />
      </Card>

      <Text style={styles.historyLabel}>PAYMENT HISTORY</Text>
      {payments.isLoading ? (
        <LoadingState label="Loading payments…" />
      ) : payments.isError ? (
        <ErrorState message={toApiError(payments.error).message} onRetry={() => payments.refetch()} />
      ) : (payments.data?.items.length ?? 0) === 0 ? (
        <EmptyState title="No payments yet" message="Payments are generated once a trip is validated." />
      ) : (
        <FlashList
          data={payments.data!.items}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => <PaymentRow payment={item} />}
        />
      )}
    </ScrollView>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryTile}>
      <Text style={styles.summaryValue}>₹{Math.round(value)}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function BreakdownRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={styles.breakdownValue}>₹{Math.round(value)}</Text>
    </View>
  );
}

function PaymentRow({ payment }: { payment: Payment }) {
  const date = payment.computedAt ? new Date(payment.computedAt) : null;
  return (
    <Card style={styles.paymentRow}>
      <View>
        <Text style={styles.paymentDate}>{date ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Pending'}</Text>
        <Text style={styles.paymentAmount}>₹{Math.round(payment.totalAmount)}</Text>
      </View>
      <EarningStatusBadge status={payment.status} />
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryTile: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center', gap: 2 },
  summaryValue: { ...typography.headlineMd, color: colors.deepNavy },
  summaryLabel: { ...typography.labelSm, color: colors.textSecondary },
  sectionLabel: { ...typography.labelMd, color: colors.textSecondary, marginBottom: spacing.sm },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  breakdownLabel: { ...typography.bodyMd, color: colors.text },
  breakdownValue: { ...typography.bodyMd, color: colors.text, fontWeight: '600' },
  historyLabel: { ...typography.labelMd, color: colors.textSecondary, marginTop: spacing.sm },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  paymentDate: { ...typography.bodyMd, color: colors.textSecondary },
  paymentAmount: { ...typography.headlineMd, color: colors.deepNavy },
});
