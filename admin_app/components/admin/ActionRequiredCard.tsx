/** §11/§70/§73 — dashboard "Action Required" queue item. */
import { router } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';
import { formatDistanceKm } from '@/utils/format';
import type { ActionRequiredItem } from '@/types/admin';

export function ActionRequiredCard({ item }: { item: ActionRequiredItem }) {
  const critical = item.severity === 'CRITICAL';
  return (
    <TouchableOpacity
      style={[styles.card, critical ? styles.critical : styles.normal]}
      onPress={() => router.push(item.entityType === 'HAZARD' ? `/hazard/${item.entityId}` : '/hazards')}
      accessibilityRole="button"
    >
      <View style={[styles.iconWrap, { backgroundColor: critical ? `${colors.critical}1A` : colors.surfaceMuted }]}>
        <AlertTriangle size={16} color={critical ? colors.critical : colors.primaryBlue} />
      </View>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{item.title}</Text>
          {item.distanceKm !== undefined ? <Text style={styles.distance}>{formatDistanceKm(item.distanceKm)}</Text> : null}
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.city}>{item.cityName}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm + 2, borderRadius: radius.md, borderWidth: 1 },
  critical: { backgroundColor: `${colors.critical}0D`, borderColor: `${colors.critical}33` },
  normal: { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
  iconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.headlineMd, fontSize: 14, color: colors.deepNavy },
  distance: { ...typography.numeric, fontSize: 11, color: colors.critical },
  description: { ...typography.labelSm, color: colors.textSecondary },
  city: { ...typography.caps, color: colors.textSecondary },
});
