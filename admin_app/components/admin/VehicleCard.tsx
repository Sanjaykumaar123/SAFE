/** §25 — fleet vehicle list card. */
import { router } from 'expo-router';
import { Truck } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { colors, markerColors, radius, spacing, typography } from '@/constants/theme';
import { formatDistanceKm, formatRelativeTime } from '@/utils/format';
import type { FleetVehicle } from '@/types/admin';

const STATUS_LABEL: Record<FleetVehicle['status'], string> = { LIVE: 'LIVE', IDLE: 'IDLE', OFFLINE: 'OFFLINE', DISABLED: 'DISABLED' };
const STATUS_COLOR: Record<FleetVehicle['status'], string> = { LIVE: markerColors.RESOLVED, IDLE: colors.warning, OFFLINE: colors.textSecondary, DISABLED: colors.critical };

export function VehicleCard({ vehicle }: { vehicle: FleetVehicle }) {
  const statusColor = STATUS_COLOR[vehicle.status];
  return (
    <Card onPress={() => router.push(`/fleet/vehicle/${vehicle.id}`)} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Truck size={16} color={colors.primaryBlue} />
        </View>
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <Text style={styles.plate}>{vehicle.plateNumber}</Text>
            <View style={[styles.statusPill, { backgroundColor: `${statusColor}1A` }]}>
              <View style={[styles.dot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusLabel, { color: statusColor }]}>{STATUS_LABEL[vehicle.status]}</Text>
            </View>
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {vehicle.operatorName} · {vehicle.zoneName}
          </Text>
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>{vehicle.kmToday} km today · {vehicle.dataQualityPct}% quality</Text>
            {vehicle.distanceKm !== undefined ? <Text style={styles.footerText}>{formatDistanceKm(vehicle.distanceKm)}</Text> : <Text style={styles.footerText}>{formatRelativeTime(vehicle.lastPingAt)}</Text>}
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.sm + 2 },
  row: { flexDirection: 'row', gap: spacing.sm },
  iconWrap: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: `${colors.primaryBlue}14`, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plate: { ...typography.numeric, color: colors.deepNavy },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.full },
  dot: { width: 5, height: 5, borderRadius: 3 },
  statusLabel: { ...typography.caps },
  meta: { ...typography.labelSm, color: colors.textSecondary },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  footerText: { ...typography.labelSm, color: colors.textSecondary },
});
