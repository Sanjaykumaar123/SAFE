import { router } from 'expo-router';
import { ArrowLeft, FileText } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SeverityBadge, StatusBadge } from '@/components/common/Badge';
import { HAZARD_TYPE_LABELS } from '@/constants/hazardType';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useMyReports } from '@/features/reports/useMyReports';
import { toApiError } from '@/services/api/queryClient';
import { formatRelativeTime } from '@/utils/distance';

type Tab = 'all' | 'active' | 'resolved';
const TABS: { value: Tab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'resolved', label: 'Resolved' },
];

export default function MyReportsScreen() {
  const [tab, setTab] = useState<Tab>('all');
  const { data, isPending, isError, error, refetch, isFetching } = useMyReports(tab);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton} accessibilityLabel="Back" accessibilityRole="button">
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>My Reports</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable key={t.value} onPress={() => setTab(t.value)} style={[styles.tab, tab === t.value && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t.value && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {isPending ? (
        <LoadingState label="Loading your reports…" />
      ) : isError ? (
        <ErrorState message={toApiError(error).message} onRetry={() => refetch()} />
      ) : !data?.items.length ? (
        <EmptyState icon={<FileText size={40} color={colors.textSecondary} />} title="No reports yet" message="Reports you submit will show up here." actionLabel="Report a Hazard" onAction={() => router.push('/report/camera')} />
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={isFetching}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => router.push(`/reports/${item.id}`)} accessibilityRole="button">
              <View style={styles.cardHeader}>
                <Text style={styles.reportCode}>{item.reportCode}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.hazardType}>{HAZARD_TYPE_LABELS[item.hazardType]}</Text>
              <Text style={styles.location} numberOfLines={1}>
                {item.locationText}
              </Text>
              <View style={styles.cardFooter}>
                <SeverityBadge severity={item.severity} />
                <Text style={styles.date}>{formatRelativeTime(item.createdAt)}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.headlineMd, color: colors.deepNavy },
  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  tab: { paddingHorizontal: spacing.md, height: 36, borderRadius: radius.full, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.deepNavy },
  tabText: { ...typography.labelMd, color: colors.textSecondary },
  tabTextActive: { color: colors.white },
  list: { padding: spacing.lg, gap: spacing.sm },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reportCode: { ...typography.labelMd, color: colors.textSecondary },
  hazardType: { ...typography.headlineMd, color: colors.text },
  location: { ...typography.bodyMd, color: colors.textSecondary },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  date: { ...typography.labelSm, color: colors.textSecondary },
});
