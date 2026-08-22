import { Camera, MapPin, Sparkles, Wifi } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { HealthState, type HealthStateType } from '@/constants/enums';
import { monitoringPalette, spacing } from '@/constants/theme';
import type { DeviceHealth } from '@/store/monitoringStore';

const ICONS = { gps: MapPin, camera: Camera, ai: Sparkles, network: Wifi } as const;
const LABELS: Record<keyof DeviceHealth, string> = { gps: 'GPS', camera: 'CAMERA', ai: 'AI', network: 'NETWORK' };

function colorFor(state: HealthStateType): string {
  if (state === HealthState.READY) return monitoringPalette.ready;
  if (state === HealthState.WARNING) return monitoringPalette.warning;
  return '#FF5A5F';
}

function symbolFor(state: HealthStateType): string {
  if (state === HealthState.READY) return '✓';
  if (state === HealthState.WARNING) return '!';
  return '✕';
}

/** §17/22/48 — the always-visible system status strip: GPS/Camera/AI/
 * Network, each with an icon, a label, and a color-coded symbol (never
 * color alone — §46 "do not hide failures"). */
export function SystemHealthStrip({ health }: { health: DeviceHealth }) {
  return (
    <View style={styles.row}>
      {(Object.keys(ICONS) as (keyof DeviceHealth)[]).map((key) => {
        const Icon = ICONS[key];
        const color = colorFor(health[key]);
        return (
          <View key={key} style={styles.item}>
            <Icon size={16} color={color} />
            <Text style={[styles.label, { color }]}>{LABELS[key]}</Text>
            <Text style={[styles.symbol, { color }]}>{symbolFor(health[key])}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  symbol: { fontSize: 12, fontWeight: '700' },
});
