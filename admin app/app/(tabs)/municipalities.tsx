/** §21/§22 — Municipality Management ("Gov" tab). Cities live one tap
 * away via the header link (§23) since city + municipality administration
 * are the same governance surface in the spec. */
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { Building2, ChevronRight, MapPin } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useMunicipalities } from '@/features/cities/useCities';
import { useLocationStore } from '@/store/locationStore';
import type { Municipality } from '@/types/admin';

export default function MunicipalitiesScreen() {
  const insets = useSafeAreaInsets();
  const place = useLocationStore((s) => s.place);
  const { data, isLoading, isError, error, refetch } = useMunicipalities();

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Municipality Management</Text>
          <TouchableOpacity style={styles.locationButton} onPress={() => router.push('/location-search')}>
            <MapPin size={13} color={colors.primaryBlue} />
            <Text style={styles.locationButtonText} numberOfLines={1}>
              {place ? `Filtered to ${place.name}` : 'All cities'}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.citiesButton} onPress={() => router.push('/cities')}>
          <Building2 size={14} color={colors.primaryBlue} />
          <Text style={styles.citiesButtonText}>Cities</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <LoadingState label="Loading municipalities…" />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message ?? 'Could not load municipalities.'} onRetry={refetch} />
      ) : !data?.items.length ? (
        <EmptyState title="No municipalities found" message="Try clearing the location filter." />
      ) : (
        <FlashList data={data.items} keyExtractor={(item) => item.id} renderItem={({ item }) => <MunicipalityRow m={item} />} contentContainerStyle={styles.listContent} ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />} />
      )}
    </View>
  );
}

function MunicipalityRow({ m }: { m: Municipality }) {
  return (
    <Card onPress={() => router.push(`/municipality/${m.id}`)} style={styles.row}>
      <View style={styles.rowBody}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {m.name}
          </Text>
          <View style={[styles.statusPill, m.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive]}>
            <Text style={[styles.statusText, m.status === 'ACTIVE' ? styles.statusTextActive : styles.statusTextInactive]}>{m.status}</Text>
          </View>
        </View>
        <Text style={styles.rowSubtitle}>{m.cityName} · {m.officerCount} officers</Text>
        <View style={styles.metricsRow}>
          <Metric label="Active" value={m.activeHazards} />
          <Metric label="Critical" value={m.criticalHazards} tone="critical" />
          <Metric label="Open repairs" value={m.openRepairs} />
          <Metric label="Resolution" value={`${m.resolutionRatePct}%`} tone="success" />
        </View>
      </View>
      <ChevronRight size={18} color={colors.textSecondary} />
    </Card>
  );
}

function Metric({ label, value, tone }: { label: string; value: number | string; tone?: 'critical' | 'success' }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, tone === 'critical' && { color: colors.critical }, tone === 'success' && { color: colors.green }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  headerTitle: { ...typography.headlineLg, fontSize: 18, color: colors.deepNavy },
  locationButton: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: colors.surfaceMuted, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4, marginTop: spacing.xs },
  locationButtonText: { ...typography.labelSm, color: colors.primaryBlue },
  citiesButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border, borderRadius: radius.full, paddingHorizontal: spacing.sm + 2, paddingVertical: 6 },
  citiesButtonText: { ...typography.labelSm, color: colors.primaryBlue },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowBody: { flex: 1, gap: 4 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { ...typography.bodyMd, fontWeight: '700', color: colors.text, flex: 1 },
  rowSubtitle: { ...typography.labelSm, color: colors.textSecondary },
  statusPill: { paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.full },
  statusActive: { backgroundColor: `${colors.green}1A` },
  statusInactive: { backgroundColor: `${colors.textSecondary}1A` },
  statusText: { ...typography.caps },
  statusTextActive: { color: colors.green },
  statusTextInactive: { color: colors.textSecondary },
  metricsRow: { flexDirection: 'row', gap: spacing.md, marginTop: 4 },
  metric: { alignItems: 'flex-start' },
  metricValue: { ...typography.numeric, color: colors.deepNavy },
  metricLabel: { ...typography.labelSm, color: colors.textSecondary, fontSize: 10 },
});
