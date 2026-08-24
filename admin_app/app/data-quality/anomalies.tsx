/** §47 — Data Anomaly Management: review/ignore/flag/block. */
import { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { TabPills } from '@/components/admin/TabPills';
import { AnomalySeverity } from '@/constants/enums';
import { colors, spacing, typography } from '@/constants/theme';
import { useAnomalies, useResolveAnomaly } from '@/features/system/useSystem';
import { formatRelativeTime } from '@/utils/format';
import type { DataAnomaly } from '@/types/admin';

const TABS = ['ALL', ...Object.values(AnomalySeverity)] as const;
const SEVERITY_COLOR: Record<DataAnomaly['severity'], string> = { HIGH: colors.critical, MEDIUM: colors.warning, LOW: colors.textSecondary };

export default function AnomaliesScreen() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('ALL');
  const { data } = useAnomalies(tab === 'ALL' ? undefined : tab);
  const resolve = useResolveAnomaly();

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Data Anomalies" />
      <TabPills tabs={TABS} value={tab} onChange={setTab} />

      {!data?.length ? (
        <EmptyState title="No anomalies" message="Nothing flagged in this severity band." />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
          renderItem={({ item }) => (
            <Card accentColor={SEVERITY_COLOR[item.severity]} style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.code}>{item.code}</Text>
                <Text style={[styles.severity, { color: SEVERITY_COLOR[item.severity] }]}>{item.severity}</Text>
              </View>
              <Text style={styles.kind}>{item.kind.replace(/_/g, ' ')} · {item.source}</Text>
              <Text style={styles.entity}>{item.entityLabel}</Text>
              <Text style={styles.recommendation}>{item.recommendedAction}</Text>
              <View style={styles.footerRow}>
                <Text style={styles.time}>{formatRelativeTime(item.detectedAt)}</Text>
                <View style={styles.actionsRow}>
                  <ActionLink label="REVIEW" onPress={() => resolve.mutate({ id: item.id, action: 'REVIEW' })} />
                  <ActionLink label="IGNORE" onPress={() => resolve.mutate({ id: item.id, action: 'IGNORE' })} />
                  <ActionLink label="FLAG" onPress={() => resolve.mutate({ id: item.id, action: 'FLAG' })} />
                  <ActionLink label="BLOCK" onPress={() => resolve.mutate({ id: item.id, action: 'BLOCK' })} danger />
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

function ActionLink({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text style={[styles.actionLink, danger && styles.actionLinkDanger]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: { gap: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  code: { ...typography.numeric, color: colors.deepNavy },
  severity: { ...typography.caps },
  kind: { ...typography.labelSm, color: colors.textSecondary },
  entity: { ...typography.bodyMd, color: colors.text, fontWeight: '600' },
  recommendation: { ...typography.labelSm, color: colors.textSecondary },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  time: { ...typography.labelSm, color: colors.textSecondary },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  actionLink: { ...typography.labelSm, color: colors.primaryBlue, fontWeight: '700' },
  actionLinkDanger: { color: colors.critical },
});
