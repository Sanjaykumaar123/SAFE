import { Bell, Search } from 'lucide-react-native';
import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { StatCard } from '@/components/cards/StatCard';
import { HazardCard } from '@/components/hazard/HazardCard';
import { HazardMapPreview } from '@/components/map/HazardMapPreview';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import { useHomeDashboard } from '@/features/hazards/useHomeDashboard';
import { useOneShotLocation } from '@/hooks/useOneShotLocation';
import { tokenStorage } from '@/services/auth/tokenStorage';
import { useAuthStore } from '@/store/authStore';
import { toApiError } from '@/services/api/queryClient';
import type { Hazard } from '@/types';

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { coords, isLoading: isLocating } = useOneShotLocation();
  const home = useHomeDashboard(coords);

  function openHazard(hazard: Hazard) {
    router.push(`/hazard/${hazard.id}`);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{home.data?.greeting ?? 'Good day'}</Text>
          <Text style={styles.userName}>
            {user?.fullName?.split(' ')[0] ?? 'there'} · {home.data?.cityName ?? 'Chennai'}
          </Text>
        </View>
        <Pressable style={styles.headerIcon} onPress={() => router.push('/(tabs)/alerts')} accessibilityLabel="Alerts" accessibilityRole="button">
          <Bell size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.searchBar}>
        <Search size={18} color={colors.textSecondary} />
        <TextInput
          placeholder="Search a place or road"
          placeholderTextColor={colors.textSecondary}
          style={styles.searchInput}
          onFocus={() => router.push('/(tabs)/map')}
        />
      </View>

      <OfflineBanner />

      {isLocating || home.isPending ? (
        <LoadingState label="Loading road conditions…" />
      ) : home.isError ? (
        <ErrorState
          message={toApiError(home.error).message}
          onRetry={async () => {
            await tokenStorage.clear();
            home.refetch();
          }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={home.isFetching} onRefresh={() => home.refetch()} tintColor={colors.primaryBlue} />}
        >
          {coords && (
            <HazardMapPreview center={coords} hazards={home.data?.mapMarkers ?? []} onSelectHazard={openHazard} />
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ROAD STATUS NEAR YOU</Text>
            <View style={styles.statsRow}>
              <StatCard label="Hazards" value={home.data?.stats?.nearbyCount ?? 0} />
              <StatCard label="Critical" value={home.data?.stats?.criticalCount ?? 0} tone="critical" />
              <StatCard label="Warnings" value={home.data?.stats?.warningCount ?? 0} tone="warning" />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NEARBY HAZARDS</Text>
            {home.data?.nearbyHazards.length ? (
              <View style={styles.hazardList}>
                {home.data.nearbyHazards.map((hazard, index) => (
                  <HazardCard key={`${hazard.id}-${index}`} hazard={hazard} onPress={() => openHazard(hazard)} />
                ))}
              </View>
            ) : (
              <EmptyState title="No hazards nearby" message="Roads around you look clear right now." />
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  greeting: { ...typography.labelSm, color: colors.textSecondary, textTransform: 'uppercase' },
  userName: { ...typography.headlineLgMobile, color: colors.deepNavy, marginTop: 2 },
  headerIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    height: 48,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  searchInput: { flex: 1, ...typography.bodyMd, color: colors.text },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.labelMd, color: colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  hazardList: { gap: spacing.sm },
});
