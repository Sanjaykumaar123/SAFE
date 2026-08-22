/** §25 — FLEET CONTROL: stats + vehicle list, scoped to place/radius. */
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { Gauge, MapPin, Users2, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabPills } from '@/components/admin/TabPills';
import { VehicleCard } from '@/components/admin/VehicleCard';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { StatCard } from '@/components/common/StatCard';
import { RadiusSelector } from '@/components/location/RadiusSelector';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useFleetSummary, useVehicles } from '@/features/fleet/useFleet';
import { useLocationStore } from '@/store/locationStore';

const STATUS_TABS = ['ALL', 'LIVE', 'IDLE', 'OFFLINE', 'DISABLED'] as const;

export default function FleetScreen() {
  const insets = useSafeAreaInsets();
  const place = useLocationStore((s) => s.place);
  const setRadiusKm = useLocationStore((s) => s.setRadiusKm);
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]>('ALL');

  const { data: summary } = useFleetSummary();
  const { data, isLoading, isError, error, refetch } = useVehicles(status === 'ALL' ? undefined : status);

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fleet Control</Text>
        <TouchableOpacity style={styles.locationButton} onPress={() => router.push('/location-search')}>
          <MapPin size={13} color={colors.primaryBlue} />
          <Text style={styles.locationButtonText} numberOfLines={1}>
            {place ? `${place.name} · ${place.radiusKm}km` : 'All India — search a place'}
          </Text>
        </TouchableOpacity>
      </View>

      {place ? <RadiusSelector valueKm={place.radiusKm} onChange={setRadiusKm} /> : null}

      <View style={styles.statsGrid}>
        <StatCard label="Active Vehicles" value={summary?.activeVehicles ?? '—'} tone="success" compact />
        <StatCard label="Offline" value={summary?.offlineVehicles ?? '—'} tone="warning" compact />
        <StatCard label="Operators" value={summary?.operators ?? '—'} tone="default" compact />
        <StatCard label="Coverage" value={`${summary?.coveragePct ?? 0}%`} tone="info" compact />
      </View>

      <View style={styles.quickLinksRow}>
        <QuickLink icon={<Users2 size={15} color={colors.primaryBlue} />} label="Operators" onPress={() => router.push('/fleet/operators')} />
        <QuickLink icon={<Gauge size={15} color={colors.primaryBlue} />} label="Data Quality" onPress={() => router.push('/fleet/quality')} />
        <QuickLink icon={<Wallet size={15} color={colors.primaryBlue} />} label="Payments" onPress={() => router.push('/fleet/payments')} />
      </View>

      <TabPills tabs={STATUS_TABS} value={status} onChange={setStatus} />

      {isLoading ? (
        <LoadingState label="Loading fleet…" />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message ?? 'Could not load fleet.'} onRetry={refetch} />
      ) : !data?.items.length ? (
        <EmptyState title="No vehicles found" message={place ? `Nothing within ${place.radiusKm}km of ${place.name}.` : 'Search a place to see nearby fleet activity.'} />
      ) : (
        <FlashList data={data.items} keyExtractor={(item) => item.id} renderItem={({ item }) => <VehicleCard vehicle={item} />} contentContainerStyle={styles.listContent} ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />} />
      )}
    </View>
  );
}

function QuickLink({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickLink} onPress={onPress}>
      {icon}
      <Text style={styles.quickLinkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.xs },
  headerTitle: { ...typography.headlineLg, fontSize: 20, color: colors.deepNavy },
  locationButton: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: colors.surfaceMuted, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  locationButtonText: { ...typography.labelSm, color: colors.primaryBlue, maxWidth: 260 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  quickLinksRow: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  quickLink: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.sm },
  quickLinkLabel: { ...typography.labelSm, color: colors.text },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl },
});
