/** §19 — Citizen Report Management. */
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SeverityBadge, SourceBadge } from '@/components/common/Badge';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { TabPills } from '@/components/admin/TabPills';
import { CitizenReportStatus } from '@/constants/enums';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useCitizenReports, useRejectReport, useVerifyReport } from '@/features/reports/useCitizenReports';
import { formatRelativeTime } from '@/utils/format';
import type { CitizenReport } from '@/types/admin';

const TABS = ['ALL', ...Object.values(CitizenReportStatus)] as const;

export default function CitizenReportsScreen() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('ALL');
  const { data, isLoading, isError, error, refetch } = useCitizenReports(tab);
  const verify = useVerifyReport();
  const reject = useRejectReport();

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Citizen Reports" />
      <TabPills tabs={TABS} value={tab} onChange={setTab} />

      {isLoading ? (
        <LoadingState label="Loading reports…" />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message ?? 'Could not load reports.'} onRetry={refetch} />
      ) : !data?.items.length ? (
        <EmptyState title="No reports in this tab" />
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
          renderItem={({ item }) => <ReportRow report={item} onVerify={() => verify.mutate(item.id)} onReject={() => reject.mutate({ id: item.id, reason: 'Reviewed and rejected' })} />}
        />
      )}
    </View>
  );
}

function ReportRow({ report, onVerify, onReject }: { report: CitizenReport; onVerify: () => void; onReject: () => void }) {
  return (
    <Card onPress={() => (report.hazardId ? router.push(`/hazard/${report.hazardId}`) : undefined)} style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.code}>{report.reportCode}</Text>
        <SeverityBadge severity={report.severity} />
      </View>
      <Text style={styles.location} numberOfLines={1}>
        {report.locationText} · {report.cityName}
      </Text>
      <View style={styles.badgeRow}>
        <SourceBadge label={report.citizenName} />
        <Text style={styles.aiStatus}>AI: {report.aiStatus}</Text>
      </View>
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>{formatRelativeTime(report.createdAt)}</Text>
        {report.status === 'NEW' || report.status === 'UNDER_REVIEW' ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={onVerify}>
              <Text style={styles.verifyLink}>VERIFY</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onReject}>
              <Text style={styles.rejectLink}>REJECT</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.statusLabel}>{report.status}</Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: { gap: 6 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { ...typography.numeric, color: colors.deepNavy },
  location: { ...typography.labelSm, color: colors.textSecondary },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  aiStatus: { ...typography.labelSm, color: colors.textSecondary },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  footerText: { ...typography.labelSm, color: colors.textSecondary },
  actionsRow: { flexDirection: 'row', gap: spacing.md },
  verifyLink: { ...typography.labelSm, color: colors.green, fontWeight: '700' },
  rejectLink: { ...typography.labelSm, color: colors.critical, fontWeight: '700' },
  statusLabel: { ...typography.caps, color: colors.textSecondary, backgroundColor: colors.surfaceMuted, paddingHorizontal: spacing.xs, borderRadius: radius.sm },
});
