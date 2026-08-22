/** §27 — Operator Management list. */
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useOperators } from '@/features/fleet/useFleet';

export default function OperatorsScreen() {
  const { data, isLoading, isError, error, refetch } = useOperators();

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Fleet Operators" />
      {isLoading ? (
        <LoadingState label="Loading operators…" />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message ?? 'Could not load operators.'} onRetry={refetch} />
      ) : !data?.items.length ? (
        <EmptyState title="No operators found" />
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/fleet/operator/${item.id}`)} style={styles.row}>
              <View style={styles.body}>
                <View style={styles.headerRow}>
                  <Text style={styles.name}>{item.name}</Text>
                  <View style={[styles.statusPill, item.status === 'ACTIVE' ? styles.statusActive : styles.statusOther]}>
                    <Text style={[styles.statusText, item.status === 'ACTIVE' ? styles.statusTextActive : styles.statusTextOther]}>{item.status}</Text>
                  </View>
                </View>
                <Text style={styles.meta}>{item.operatorCode} · {item.cityName} · {item.vehiclePlate ?? 'Unassigned'}</Text>
                <View style={styles.metricsRow}>
                  <Text style={styles.metric}>Coverage: <Text style={styles.metricValue}>{item.coveragePct}%</Text></Text>
                  <Text style={styles.metric}>Quality: <Text style={styles.metricValue}>{item.dataQualityPct}%</Text></Text>
                  <Text style={styles.metric}>Trips: <Text style={styles.metricValue}>{item.tripsCompleted}</Text></Text>
                </View>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} />
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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  body: { flex: 1, gap: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...typography.bodyMd, fontWeight: '700', color: colors.text },
  meta: { ...typography.labelSm, color: colors.textSecondary },
  statusPill: { paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.full },
  statusActive: { backgroundColor: `${colors.green}1A` },
  statusOther: { backgroundColor: `${colors.critical}1A` },
  statusText: { ...typography.caps },
  statusTextActive: { color: colors.green },
  statusTextOther: { color: colors.critical },
  metricsRow: { flexDirection: 'row', gap: spacing.md },
  metric: { ...typography.labelSm, color: colors.textSecondary },
  metricValue: { color: colors.text, fontWeight: '700' },
});
