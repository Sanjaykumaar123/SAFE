import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { HealthBadge } from '@/components/common/Badge';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useDeviceHealth } from '@/features/deviceHealth/useDeviceHealth';
import { useEarnings } from '@/features/earnings/useEarnings';
import { useNotifications } from '@/features/notifications/useNotifications';
import { locationService } from '@/services/location/locationService';
import { toApiError } from '@/services/api/client';
import { useAuthStore } from '@/store/authStore';
import { useMonitoringStore } from '@/store/monitoringStore';

/** §18/19 — the daily collection brief + START MONITORING. All numbers
 * come from the backend (`GET /fleet/me`, `GET /fleet/earnings`) — never a
 * hardcoded demo figure. */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const operator = useAuthStore((s) => s.operator);
  const todayTarget = useAuthStore((s) => s.todayTarget);
  const deviceHealth = useMonitoringStore((s) => s.deviceHealth);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  useDeviceHealth();

  const earnings = useEarnings();
  const notifications = useNotifications();

  if (!operator || !todayTarget) {
    return <LoadingState label="Loading your dashboard…" />;
  }

  const progress = todayTarget.targetKm > 0 ? Math.min(1, todayTarget.completedKm / todayTarget.targetKm) : 0;
  const unreadCount = notifications.data?.unreadCount ?? 0;

  const handleStartPress = async () => {
    if (!cameraPermission?.granted) {
      await requestCameraPermission();
    }
    await locationService.requestPermission();
    router.push('/monitoring/start-confirm');
  };

  const topPadding = Math.max(insets.top, 24) + spacing.md;

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Good day, {operator.fullName.split(' ')[0]}</Text>
          <Text style={styles.vehicle}>{operator.vehicle ? operator.vehicle.registrationNumber : 'No vehicle assigned'}</Text>
        </View>
        <Pressable onPress={() => router.push('/notifications')} style={styles.bellButton} accessibilityLabel="Notifications">
          <Bell size={22} color={colors.text} />
          {unreadCount > 0 ? (
            <View style={styles.badgeDot}>
              <Text style={styles.badgeDotText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <Card style={styles.statusCard}>
        <Text style={styles.sectionLabel}>STATUS</Text>
        <Text style={styles.statusValue}>{operator.vehicle ? 'READY' : 'NO VEHICLE'}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>TODAY'S COLLECTION</Text>
        <View style={styles.targetRow}>
          <Text style={styles.targetValue}>{todayTarget.completedKm.toFixed(1)} km</Text>
          <Text style={styles.targetOf}>of {todayTarget.targetKm.toFixed(0)} km target</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{Math.round(progress * 100)}% complete</Text>

        {todayTarget.priorityZone ? (
          <View style={styles.zoneRow}>
            <Text style={styles.zoneLabel}>Priority Zone</Text>
            <Text style={styles.zoneValue}>{todayTarget.priorityZone}</Text>
          </View>
        ) : null}
        {todayTarget.recommendedRoads.length > 0 ? (
          <Text style={styles.roadsText}>{todayTarget.recommendedRoads.join(' · ')}</Text>
        ) : null}
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>ESTIMATED EARNINGS TODAY</Text>
        {earnings.isLoading ? (
          <Text style={styles.earningsValue}>—</Text>
        ) : earnings.isError ? (
          <Text style={styles.errorText}>{toApiError(earnings.error).message}</Text>
        ) : (
          <Text style={styles.earningsValue}>₹{Math.round(earnings.data?.today ?? 0)}</Text>
        )}
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>SYSTEM HEALTH</Text>
        <View style={styles.healthRow}>
          <HealthBadge state={deviceHealth.gps} label="GPS" />
          <HealthBadge state={deviceHealth.camera} label="Camera" />
          <HealthBadge state={deviceHealth.ai} label="AI" />
          <HealthBadge state={deviceHealth.network} label="Network" />
        </View>
      </Card>

      <Button
        label="START MONITORING"
        size="lg"
        onPress={handleStartPress}
        disabled={!operator.vehicle}
        style={styles.startButton}
      />
      {!operator.vehicle ? <ErrorState message="No vehicle is currently assigned to your account. Contact your fleet admin." /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { ...typography.headlineMd, color: colors.deepNavy },
  vehicle: { ...typography.bodyMd, color: colors.textSecondary, marginTop: 2 },
  bellButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  badgeDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.critical,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeDotText: { color: colors.white, fontSize: 9, fontWeight: '700' },
  statusCard: { alignItems: 'center' },
  sectionLabel: { ...typography.labelMd, color: colors.textSecondary, marginBottom: spacing.xs },
  statusValue: { ...typography.headlineLg, color: colors.green },
  targetRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  targetValue: { ...typography.headlineLg, color: colors.deepNavy },
  targetOf: { ...typography.bodyMd, color: colors.textSecondary },
  progressTrack: { height: 8, borderRadius: radius.full, backgroundColor: colors.surfaceMuted, marginTop: spacing.sm, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primaryBlue, borderRadius: radius.full },
  progressLabel: { ...typography.labelSm, color: colors.textSecondary, marginTop: spacing.xxs },
  zoneRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  zoneLabel: { ...typography.bodyMd, color: colors.textSecondary },
  zoneValue: { ...typography.bodyMd, color: colors.text, fontWeight: '600' },
  roadsText: { ...typography.bodyMd, color: colors.textSecondary, marginTop: spacing.xs },
  earningsValue: { ...typography.headlineLg, color: colors.deepNavy },
  errorText: { ...typography.bodyMd, color: colors.critical },
  healthRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  startButton: { marginTop: spacing.sm },
});
