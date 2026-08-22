/** §26 — Vehicle Detail: device health, current session, admin actions. */
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PermissionGate } from '@/components/common/PermissionGate';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Permission } from '@/constants/permissions';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useDisableVehicle, useVehicleDetail } from '@/features/fleet/useFleet';
import { formatRelativeTime } from '@/utils/format';

const HEALTH_LABEL: Record<string, string> = { OK: 'OK', GOOD: 'GOOD', FAIR: 'FAIR', POOR: 'POOR', DEGRADED: 'DEGRADED', OFFLINE: 'OFFLINE', WEAK: 'WEAK' };

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: vehicle, isLoading, isError, error, refetch } = useVehicleDetail(id);
  const disable = useDisableVehicle();
  const [confirmDisable, setConfirmDisable] = useState(false);

  if (isLoading) return <LoadingState label="Loading vehicle…" />;
  if (isError || !vehicle) return <ErrorState message={(error as Error)?.message ?? 'Vehicle not found.'} onRetry={refetch} />;

  return (
    <View style={styles.flex}>
      <ScreenHeader title={vehicle.plateNumber} subtitle={`${vehicle.operatorName} · ${vehicle.cityName}`} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Status</Text>
          <Text style={styles.value}>{vehicle.status} · {vehicle.zoneName}</Text>
          {vehicle.currentSessionKm !== undefined ? <Text style={styles.value}>Current session: {vehicle.currentSessionKm} km {vehicle.currentSessionStartedAt ? `· started ${formatRelativeTime(vehicle.currentSessionStartedAt)}` : ''}</Text> : null}
          <Text style={styles.value}>Last ping {formatRelativeTime(vehicle.lastPingAt)}</Text>
        </Card>

        <Text style={styles.sectionLabel}>DEVICE HEALTH</Text>
        <View style={styles.healthGrid}>
          <HealthTile label="GPS" value={vehicle.gps} />
          <HealthTile label="Camera" value={vehicle.camera} />
          <HealthTile label="AI" value={vehicle.ai} />
          <HealthTile label="Network" value={vehicle.network} />
        </View>

        <Card style={styles.card}>
          <View style={styles.storageRow}>
            <Text style={styles.sectionTitle}>Storage used</Text>
            <Text style={styles.value}>{vehicle.storageUsedPct}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${vehicle.storageUsedPct}%` }]} />
          </View>
          <View style={styles.storageRow}>
            <Text style={styles.sectionTitle}>Data quality</Text>
            <Text style={styles.value}>{vehicle.dataQualityPct}%</Text>
          </View>
        </Card>

        <PermissionGate permission={Permission.MANAGE_VEHICLES}>
          <Button label="Disable Vehicle" variant="danger" onPress={() => setConfirmDisable(true)} disabled={vehicle.status === 'DISABLED'} style={styles.disableButton} />
        </PermissionGate>
      </ScrollView>

      <ConfirmDialog
        visible={confirmDisable}
        title="Disable this vehicle?"
        message="The vehicle stops accepting new monitoring sessions until re-enabled."
        destructive
        requireReason
        busy={disable.isPending}
        onConfirm={(reason) => {
          disable.mutate({ id: vehicle.id, reason: reason ?? '' });
          setConfirmDisable(false);
        }}
        onCancel={() => setConfirmDisable(false)}
      />
    </View>
  );
}

function HealthTile({ label, value }: { label: string; value: string }) {
  const good = value === 'OK' || value === 'GOOD';
  return (
    <View style={styles.healthTile}>
      <Text style={styles.healthLabel}>{label}</Text>
      <Text style={[styles.healthValue, good ? styles.healthGood : styles.healthBad]}>{HEALTH_LABEL[value] ?? value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xxl },
  card: { gap: 4 },
  sectionTitle: { ...typography.caps, color: colors.textSecondary },
  value: { ...typography.bodyMd, color: colors.text },
  sectionLabel: { ...typography.caps, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs },
  healthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  healthTile: { flex: 1, minWidth: '45%', backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, gap: 2 },
  healthLabel: { ...typography.caps, color: colors.textSecondary },
  healthValue: { ...typography.numeric, fontSize: 14 },
  healthGood: { color: colors.green },
  healthBad: { color: colors.critical },
  storageRow: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden', marginVertical: 4 },
  fill: { height: '100%', backgroundColor: colors.primaryBlue },
  disableButton: { marginTop: spacing.lg },
});
