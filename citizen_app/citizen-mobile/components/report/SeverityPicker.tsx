import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SEVERITY_OPTIONS, type SeverityType } from '@/constants/severity';
import { colors, radius, severityColors, spacing, typography } from '@/constants/theme';

export function SeverityPicker({ value, onChange }: { value: SeverityType; onChange: (severity: SeverityType) => void }) {
  return (
    <View style={styles.row}>
      {SEVERITY_OPTIONS.map((option) => {
        const selected = option.value === value;
        const color = severityColors[option.value];
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.chip, { borderColor: selected ? color : colors.border }, selected && { backgroundColor: `${color}14` }]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={[styles.chipText, selected && { color, fontWeight: '700' }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: colors.white,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { ...typography.labelMd, color: colors.text },
});
