import { router } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { HealthBadge } from '@/components/common/Badge';
import { colors, spacing, typography } from '@/constants/theme';
import { useDeviceHealth } from '@/features/deviceHealth/useDeviceHealth';
import { locationService } from '@/services/location/locationService';
import { useAuthStore } from '@/store/authStore';
import { useMonitoringStore } from '@/store/monitoringStore';

/**
 * §20/63 — the one confirmation screen before monitoring starts. Requests
 * camera + location permissions here (never mid-drive) and shows exactly
 * what will happen; after this, interaction during the drive is limited to
 * STOP (§04).
 */
export default function StartConfirmScreen() {
  const insets = useSafeAreaInsets();
  const operator = useAuthStore((s) => s.operator);
  const todayTarget = useAuthStore((s) => s.todayTarget);
  const deviceHealth = useMonitoringStore((s) => s.deviceHealth);
  const start = useMonitoringStore((s) => s.start);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useDeviceHealth();

  if (!operator) return null;

  const vehicleReg = operator.vehicle?.registrationNumber || operator.vehiclePlate || operator.vehicle_plate || 'TN-01-AB-1234';

  const handleStart = async () => {
    setError(null);
    setStarting(true);
    try {
      if (!cameraPermission?.granted) {
        const result = await requestCameraPermission();
        if (!result.granted) throw new Error('Camera permission is required to detect and document road conditions.');
      }
      const granted = await locationService.requestPermission();
      if (!granted) throw new Error('Location permission is required to accurately position road observations.');

      await start(operator.vehicle?.id ?? 'veh_101', operator.cityId ?? 'city_chennai');
      router.replace('/monitoring/active');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start monitoring.');
    } finally {
      setStarting(false);
    }
  };

  const topPadding = Math.max(insets.top, 24) + spacing.md;

  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingTop: topPadding }]}>
      <Text style={styles.title}>Ready to collect road intelligence?</Text>

      <Card style={styles.detailsCard}>
        <DetailRow label="Vehicle" value={vehicleReg} />
        <DetailRow label="Zone" value={operator.zoneName ?? 'North Zone'} />
        <DetailRow label="Target" value={todayTarget ? `${todayTarget.targetKm.toFixed(0)} km` : '50 km'} />
      </Card>

      <Card style={styles.detailsCard}>
        <Text style={styles.sectionLabel}>SYSTEM CHECK</Text>
        <View style={styles.healthRow}>
          <HealthBadge state={deviceHealth.gps} label="GPS" />
          <HealthBadge state={deviceHealth.camera} label="Camera" />
          <HealthBadge state={deviceHealth.ai} label="AI" />
          <HealthBadge state={deviceHealth.network} label="Network" />
        </View>
      </Card>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Button label="START MONITORING" size="lg" loading={starting} disabled={starting} onPress={handleStart} />
      <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { ...typography.headlineMd, color: colors.deepNavy, textAlign: 'center', marginBottom: spacing.sm },
  detailsCard: { gap: spacing.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { ...typography.bodyMd, color: colors.textSecondary },
  detailValue: { ...typography.bodyMd, color: colors.text, fontWeight: '600' },
  sectionLabel: { ...typography.labelMd, color: colors.textSecondary },
  healthRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  errorText: { ...typography.bodyMd, color: colors.critical, textAlign: 'center' },
});
