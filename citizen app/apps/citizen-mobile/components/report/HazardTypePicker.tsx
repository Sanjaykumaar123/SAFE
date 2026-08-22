import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { HAZARD_TYPE_OPTIONS, type HazardTypeType } from '@/constants/hazardType';
import { colors, radius, spacing, typography } from '@/constants/theme';

export function HazardTypePicker({ value, onChange }: { value: HazardTypeType; onChange: (type: HazardTypeType) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {HAZARD_TYPE_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.chip, selected && styles.chipSelected]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: 2 },
  chip: {
    paddingHorizontal: spacing.md,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.primaryBlue, borderColor: colors.primaryBlue },
  chipText: { ...typography.labelMd, color: colors.text },
  chipTextSelected: { color: colors.white },
});
