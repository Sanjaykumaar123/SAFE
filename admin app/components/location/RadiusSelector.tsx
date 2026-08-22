/** §12/§64/§concept — the radius-chip row used on Dashboard/Hazards/Fleet
 * whenever a place is selected ("Radius Selector: a horizontal slider …
 * used for filtering map data" per the design reference, implemented here
 * as discrete pill steps to match the mockups exactly). */
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { RADIUS_STEPS_KM, colors, radius, spacing, typography } from '@/constants/theme';

export function RadiusSelector({ valueKm, onChange, dark = false }: { valueKm: number; onChange: (km: (typeof RADIUS_STEPS_KM)[number]) => void; dark?: boolean }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.row, dark && styles.rowDark]} contentContainerStyle={styles.rowContent}>
      {RADIUS_STEPS_KM.map((km) => {
        const active = km === valueKm;
        return (
          <TouchableOpacity key={km} onPress={() => onChange(km)} style={[styles.chip, active && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: active }}>
            <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{km} KM</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexGrow: 0 },
  rowDark: {},
  rowContent: { gap: spacing.xs, alignItems: 'center' },
  chip: { paddingHorizontal: spacing.sm + 2, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.secondaryBlue, borderColor: colors.secondaryBlue },
  chipLabel: { ...typography.caps, color: colors.textSecondary },
  chipLabelActive: { color: colors.white },
});
