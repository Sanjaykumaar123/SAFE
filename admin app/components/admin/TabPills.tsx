/** Generic horizontal-scroll tab pill row — used by Hazards/Reports/Users/
 * Audit Logs/Fleet wherever the spec calls for a tab strip (§14/§19/§20/§50). */
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';

export function TabPills<T extends string>({ tabs, value, onChange, labels }: { tabs: readonly T[]; value: T; onChange: (tab: T) => void; labels?: Partial<Record<T, string>> }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {tabs.map((tab) => {
        const active = tab === value;
        return (
          <TouchableOpacity key={tab} onPress={() => onChange(tab)} style={[styles.pill, active && styles.pillActive]} accessibilityRole="button" accessibilityState={{ selected: active }}>
            <Text style={[styles.label, active && styles.labelActive]}>{labels?.[tab] ?? tab.replace(/_/g, ' ')}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  pill: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  pillActive: { backgroundColor: colors.deepNavy, borderColor: colors.deepNavy },
  label: { ...typography.caps, color: colors.textSecondary },
  labelActive: { color: colors.white },
});
