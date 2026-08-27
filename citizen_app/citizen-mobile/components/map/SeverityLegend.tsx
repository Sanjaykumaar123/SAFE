/** Panel opened by the "layers" FAB — doubles as a legend and a per-
 * severity visibility filter for hazard markers on the map. */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SEVERITY_OPTIONS, type SeverityType } from '@/constants/severity';
import { colors, radius, shadow, spacing, typography, severityColors } from '@/constants/theme';

interface Props {
  topOffset: number;
  activeSeverities: Set<SeverityType>;
  onToggleSeverity: (severity: SeverityType) => void;
}

export function SeverityLegend({ topOffset, activeSeverities, onToggleSeverity }: Props) {
  return (
    <View style={[styles.panel, { top: topOffset }]}>
      <Text style={styles.title}>Show on map</Text>
      {SEVERITY_OPTIONS.map((option) => {
        const active = activeSeverities.has(option.value);
        return (
          <Pressable key={option.value} style={styles.row} onPress={() => onToggleSeverity(option.value)}>
            <View style={[styles.dot, { backgroundColor: severityColors[option.value], opacity: active ? 1 : 0.25 }]} />
            <Text style={[styles.label, !active && styles.labelInactive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    right: spacing.md,
    width: 172,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.md,
  },
  title: { ...typography.labelSm, color: colors.textSecondary, textTransform: 'uppercase', marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { ...typography.bodyMd, color: colors.text },
  labelInactive: { color: colors.textSecondary },
});
