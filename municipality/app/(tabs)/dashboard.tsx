import { router } from 'expo-router';
import { Bell, ChevronDown, Radio } from 'lucide-react-native';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { StatCard } from '@/components/common/StatCard';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useDashboard } from '@/features/dashboard/useDashboard';
import { useNotifications } from '@/features/notifications/useNotifications';
import { useMunicipalityStore } from '@/store/municipalityStore';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const authorizedCities = useMunicipalityStore((s) => s.authorizedCities);
  const selectedCityId = useMunicipalityStore((s) => s.selectedCityId);
  const officer = useMunicipalityStore((s) => s.officer);

  const { data, isLoading, isError, error, refetch, isRefetching } = useDashboard(selectedCityId);
  const { data: notifications } = useNotifications();

  const selectedCity = authorizedCities.find((c) => c.id === selectedCityId);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.sm }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primaryBlue} />}
    >
      <View style={styles.topBar}>
        <Pressable
          style={styles.cityPicker}
          onPress={() => router.push('/(tabs)/dashboard')}
          disabled={authorizedCities.length <= 1}
          accessibilityRole="button"
          accessibilityLabel="Change city"
        >
          <Text style={styles.cityName}>{selectedCity?.name ?? '—'}</Text>
          {authorizedCities.length > 1 ? <ChevronDown size={16} color={colors.text} /> : null}
        </Pressable>
        <View style={styles.topBarActions}>
          <Pressable onPress={() => router.push('/notifications')} accessibilityRole="button" accessibilityLabel="Notifications" style={styles.iconButton}>
            <Bell size={20} color={colors.text} />
            {notifications && notifications.unreadCount > 0 ? <View style={styles.badgeDot} /> : null}
          </Pressable>
          <Pressable onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel="Profile" style={styles.avatar}>
            <Text style={styles.avatarText}>{officer?.fullName?.slice(0, 1) ?? '?'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.title}>{selectedCity ? `${selectedCity.name.toUpperCase()} ROAD INTELLIGENCE` : 'ROAD INTELLIGENCE'}</Text>
        <View style={styles.liveBadge}>
          <Radio size={10} color={colors.green} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {isLoading ? <LoadingState label="Loading city dashboard…" /> : null}
      {isError ? <ErrorState message={(error as Error)?.message ?? 'City data unavailable.'} onRetry={refetch} /> : null}

      {data ? (
        <>
          <View style={styles.statsGrid}>
            <StatCard label="Active Hazards" value={data.activeHazards} />
            <StatCard label="Critical" value={data.criticalHazards} tone="critical" />
            <StatCard label="Under Repair" value={data.underRepair} tone="warning" />
            <StatCard label="Resolved Today" value={data.resolvedToday} tone="success" />
          </View>

          <SectionTitle title="Priority Roads" />
          {data.priorityRoads.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>Excellent. No priority roads flagged in this city right now.</Text>
            </Card>
          ) : (
            data.priorityRoads.map((road) => (
              <Card key={road.roadName} style={styles.roadCard}>
                <View style={styles.roadCardRow}>
                  <Text style={styles.roadName}>{road.roadName}</Text>
                  <Text style={[styles.priorityPill, priorityStyle(road.priority)]}>{road.priority}</Text>
                </View>
                <Text style={styles.roadReason}>{road.reason}</Text>
              </Card>
            ))
          )}

          <SectionTitle title="Recent Municipal Activity" />
          {data.recentActivity.length === 0 ? (
            <EmptyState title="No recent activity" message="Actions taken by your municipality will show up here." />
          ) : (
            data.recentActivity.map((item) => (
              <Pressable key={item.id} onPress={() => item.hazardId && router.push(`/hazard/${item.hazardId}`)}>
                <Card style={styles.activityCard}>
                  <Text style={styles.activityLabel}>{item.label}</Text>
                  {item.detail ? <Text style={styles.activityDetail}>{item.detail}</Text> : null}
                  <Text style={styles.activityTime}>{new Date(item.createdAt).toLocaleString()}</Text>
                </Card>
              </Pressable>
            ))
          )}

          <SectionTitle title="Fleet Coverage" />
          <Card>
            <View style={styles.coverageRow}>
              <View>
                <Text style={styles.coverageValue}>{data.fleetCoverage.observedTodayKmEstimate} km</Text>
                <Text style={styles.coverageLabel}>Observed today (est.)</Text>
              </View>
              <View>
                <Text style={styles.coverageValue}>{data.fleetCoverage.coveragePercent}%</Text>
                <Text style={styles.coverageLabel}>Coverage</Text>
              </View>
              <View>
                <Text style={styles.coverageValue}>{data.fleetCoverage.dataGapSegments}</Text>
                <Text style={styles.coverageLabel}>Data gaps</Text>
              </View>
            </View>
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function priorityStyle(priority: string) {
  switch (priority) {
    case 'CRITICAL':
    case 'HIGH':
      return { color: colors.critical, backgroundColor: `${colors.critical}1A` };
    case 'MEDIUM':
      return { color: '#B45309', backgroundColor: `${colors.warning}1A` };
    default:
      return { color: colors.secondaryBlue, backgroundColor: `${colors.secondaryBlue}1A` };
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cityPicker: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cityName: { ...typography.headlineMd, color: colors.deepNavy },
  topBarActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  badgeDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.critical },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryBlue, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.labelMd, color: colors.white },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  title: { ...typography.labelMd, color: colors.textSecondary, flex: 1 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${colors.green}1A`, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  liveText: { ...typography.labelSm, color: colors.green, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  sectionTitle: { ...typography.headlineMd, color: colors.deepNavy, marginTop: spacing.lg, marginBottom: spacing.xs },
  emptyCard: { alignItems: 'center' },
  emptyText: { ...typography.bodyMd, color: colors.textSecondary, textAlign: 'center' },
  roadCard: { marginBottom: spacing.sm },
  roadCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roadName: { ...typography.bodyLg, color: colors.text, fontWeight: '600', flex: 1 },
  priorityPill: { ...typography.labelSm, fontWeight: '700', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full, overflow: 'hidden' },
  roadReason: { ...typography.bodyMd, color: colors.textSecondary, marginTop: 4 },
  activityCard: { marginBottom: spacing.sm },
  activityLabel: { ...typography.bodyLg, color: colors.text, fontWeight: '600' },
  activityDetail: { ...typography.bodyMd, color: colors.textSecondary, marginTop: 2 },
  activityTime: { ...typography.labelSm, color: colors.textSecondary, marginTop: 4 },
  coverageRow: { flexDirection: 'row', justifyContent: 'space-between' },
  coverageValue: { ...typography.headlineMd, color: colors.deepNavy },
  coverageLabel: { ...typography.labelSm, color: colors.textSecondary, marginTop: 2 },
});
