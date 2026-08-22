import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RepairStatusBadge } from '@/components/common/Badge';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useHazards } from '@/features/hazards/useHazards';
import { useRepairs } from '@/features/repairs/useRepairs';
import { useMunicipalityStore } from '@/store/municipalityStore';
import type { MunicipalityHazard, Repair } from '@/types/municipality';

type Tab = 'NEEDS_ACTION' | 'ASSIGNED' | 'IN_PROGRESS' | 'INSPECTION' | 'RESOLVED';
const TABS: { key: Tab; label: string }[] = [
  { key: 'NEEDS_ACTION', label: 'Needs Action' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'INSPECTION', label: 'Inspection' },
  { key: 'RESOLVED', label: 'Resolved' },
];

export default function RepairsScreen() {
  const insets = useSafeAreaInsets();
  const selectedCityId = useMunicipalityStore((s) => s.selectedCityId);
  const [tab, setTab] = useState<Tab>('NEEDS_ACTION');

  return (
    <View style={[styles.flex, { paddingTop: insets.top + spacing.sm }]}>
      <Text style={styles.title}>Repair Operations</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow} contentContainerStyle={{ gap: spacing.xs }}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tabChip, tab === t.key && styles.tabChipActive]}>
            <Text style={[styles.tabChipLabel, tab === t.key && styles.tabChipLabelActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {tab === 'NEEDS_ACTION' ? <NeedsActionList cityId={selectedCityId} /> : <RepairStatusList cityId={selectedCityId} tab={tab} />}
    </View>
  );
}

function NeedsActionList({ cityId }: { cityId: string | null }) {
  const { data, isLoading, isError, error, refetch } = useHazards(cityId, { status: 'ACTIVE,VERIFIED,REOPENED' });
  const needsAction = useMemo(() => (data?.items ?? []).filter((h) => !h.repairStatus), [data]);

  if (isLoading) return <LoadingState label="Loading hazards needing action…" />;
  if (isError) return <ErrorState message={(error as Error)?.message ?? 'Unable to load hazards.'} onRetry={refetch} />;

  return (
    <FlatList
      data={needsAction}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => <NeedsActionCard hazard={item} />}
      ListEmptyComponent={<EmptyState title="Nothing needs action" message="Every active hazard already has a repair assigned." />}
    />
  );
}

function NeedsActionCard({ hazard }: { hazard: MunicipalityHazard }) {
  return (
    <Pressable onPress={() => router.push(`/hazard/${hazard.id}`)}>
      <Card style={styles.card}>
        <Text style={styles.cardCode}>{hazard.hazardCode}</Text>
        <Text style={styles.cardRoad}>{hazard.roadName ?? hazard.locationText}</Text>
        <Text style={styles.cardMeta}>{hazard.severity} · {hazard.status}</Text>
        <Pressable style={styles.assignButton} onPress={() => router.push({ pathname: '/repair/assign', params: { hazardId: hazard.id } })}>
          <Text style={styles.assignButtonLabel}>Assign Repair</Text>
        </Pressable>
      </Card>
    </Pressable>
  );
}

const STATUS_FOR_TAB: Record<Exclude<Tab, 'NEEDS_ACTION'>, string> = {
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS,REWORK_REQUIRED',
  INSPECTION: 'READY_FOR_INSPECTION',
  RESOLVED: 'RESOLVED',
};

function RepairStatusList({ cityId, tab }: { cityId: string | null; tab: Exclude<Tab, 'NEEDS_ACTION'> }) {
  const { data, isLoading, isError, error, refetch } = useRepairs(cityId, STATUS_FOR_TAB[tab]);

  if (isLoading) return <LoadingState label="Loading repairs…" />;
  if (isError) return <ErrorState message={(error as Error)?.message ?? 'Unable to load repairs.'} onRetry={refetch} />;

  return (
    <FlatList
      data={data?.items ?? []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => <RepairCard repair={item} />}
      ListEmptyComponent={<EmptyState title="No repairs here" message="Nothing in this stage right now." />}
    />
  );
}

function RepairCard({ repair }: { repair: Repair }) {
  return (
    <Pressable onPress={() => router.push(`/repair/${repair.id}`)}>
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardCode}>{repair.repairCode}</Text>
          <RepairStatusBadge status={repair.status} />
        </View>
        <Text style={styles.cardRoad}>{repair.hazardRoadName ?? repair.hazardLocationText ?? repair.hazardId}</Text>
        <Text style={styles.cardMeta}>
          {repair.priority} priority · {repair.team ?? 'Unassigned team'}
          {repair.targetDate ? ` · Target ${repair.targetDate}` : ''}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.md },
  title: { ...typography.headlineLgMobile, color: colors.deepNavy, marginBottom: spacing.sm },
  tabRow: { flexGrow: 0, marginBottom: spacing.sm },
  tabChip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.surfaceMuted },
  tabChipActive: { backgroundColor: colors.deepNavy },
  tabChipLabel: { ...typography.labelSm, color: colors.textSecondary, fontWeight: '700' },
  tabChipLabelActive: { color: colors.white },
  listContent: { paddingBottom: spacing.xxl, gap: spacing.sm },
  card: { marginBottom: spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardCode: { ...typography.labelMd, color: colors.textSecondary },
  cardRoad: { ...typography.bodyLg, color: colors.text, fontWeight: '600', marginTop: spacing.xs },
  cardMeta: { ...typography.bodyMd, color: colors.textSecondary, marginTop: 4 },
  assignButton: { marginTop: spacing.sm, alignSelf: 'flex-start', backgroundColor: colors.primaryBlue, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.md },
  assignButtonLabel: { ...typography.labelMd, color: colors.white },
});
