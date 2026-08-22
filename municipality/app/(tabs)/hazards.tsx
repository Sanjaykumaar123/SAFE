import { router } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SeverityBadge, SourceBadge, StatusBadge } from '@/components/common/Badge';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { ACTIVE_HAZARD_STATUSES, SOURCE_SUMMARY_LABELS, Severity, type SeverityType } from '@/constants/enums';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useHazards } from '@/features/hazards/useHazards';
import { useMunicipalityStore } from '@/store/municipalityStore';
import type { MunicipalityHazard } from '@/types/municipality';

const SEVERITY_FILTERS: Array<SeverityType | 'ALL'> = ['ALL', Severity.CRITICAL, Severity.HIGH, Severity.MEDIUM, Severity.LOW];

export default function HazardsScreen() {
  const insets = useSafeAreaInsets();
  const selectedCityId = useMunicipalityStore((s) => s.selectedCityId);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<SeverityType | 'ALL'>('ALL');

  const filters = useMemo(
    () => ({
      status: ACTIVE_HAZARD_STATUSES.join(','),
      severity: severityFilter === 'ALL' ? undefined : severityFilter,
      search: search.trim() || undefined,
    }),
    [severityFilter, search]
  );

  const { data, isLoading, isError, error, refetch } = useHazards(selectedCityId, filters);

  return (
    <View style={[styles.flex, { paddingTop: insets.top + spacing.sm }]}>
      <Text style={styles.title}>Hazards</Text>

      <View style={styles.searchRow}>
        <Search size={16} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search hazard ID, road, ward…"
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      <View style={styles.filterRow}>
        {SEVERITY_FILTERS.map((s) => (
          <Pressable key={s} onPress={() => setSeverityFilter(s)} style={[styles.filterChip, severityFilter === s && styles.filterChipActive]}>
            <Text style={[styles.filterChipLabel, severityFilter === s && styles.filterChipLabelActive]}>{s}</Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? <LoadingState label="Loading hazards…" /> : null}
      {isError ? <ErrorState message={(error as Error)?.message ?? 'Hazard data unavailable.'} onRetry={refetch} /> : null}

      {data ? (
        <FlatList
          data={data.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <HazardRow hazard={item} />}
          ListEmptyComponent={<EmptyState title="No active hazards" message="Excellent. No road hazards match these filters right now." />}
        />
      ) : null}
    </View>
  );
}

function HazardRow({ hazard }: { hazard: MunicipalityHazard }) {
  return (
    <Pressable onPress={() => router.push(`/hazard/${hazard.id}`)}>
      <Card style={styles.hazardCard}>
        <View style={styles.hazardHeader}>
          <Text style={styles.hazardCode}>{hazard.hazardCode}</Text>
          <StatusBadge status={hazard.status} />
        </View>
        <Text style={styles.hazardRoad}>{hazard.roadName ?? hazard.locationText}</Text>
        <Text style={styles.hazardLocation}>{hazard.locationText}</Text>
        <View style={styles.hazardFooter}>
          <SeverityBadge severity={hazard.severity} />
          <SourceBadge label={SOURCE_SUMMARY_LABELS[hazard.sourceSummary] ?? hazard.sourceSummary} />
          {hazard.repairStatus ? <Text style={styles.repairPill}>{hazard.repairCode}</Text> : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.md },
  title: { ...typography.headlineLgMobile, color: colors.deepNavy, marginBottom: spacing.sm },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, paddingVertical: spacing.sm + 2, ...typography.bodyMd, color: colors.text },
  filterRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  filterChip: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.surfaceMuted },
  filterChipActive: { backgroundColor: colors.deepNavy },
  filterChipLabel: { ...typography.labelSm, color: colors.textSecondary, fontWeight: '700' },
  filterChipLabelActive: { color: colors.white },
  listContent: { paddingBottom: spacing.xxl, gap: spacing.sm },
  hazardCard: { marginBottom: spacing.sm },
  hazardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hazardCode: { ...typography.labelMd, color: colors.textSecondary },
  hazardRoad: { ...typography.bodyLg, color: colors.text, fontWeight: '600', marginTop: spacing.xs },
  hazardLocation: { ...typography.bodyMd, color: colors.textSecondary, marginTop: 2 },
  hazardFooter: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, alignItems: 'center' },
  repairPill: { ...typography.labelSm, color: colors.textSecondary },
});
