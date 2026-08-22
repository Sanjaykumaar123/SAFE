import { StyleSheet, Text, View } from 'react-native';

import { monitoringPalette, radius, spacing } from '@/constants/theme';

/** §22/48 — large, glanceable metric tiles for the driving screen. Big
 * text, minimal chrome; the operator should be able to read this without
 * really looking. */
export function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: monitoringPalette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: monitoringPalette.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  value: { fontSize: 28, lineHeight: 34, fontWeight: '700', color: monitoringPalette.text },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.6, color: monitoringPalette.textSecondary, textTransform: 'uppercase' },
});
