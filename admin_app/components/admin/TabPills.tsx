import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';

export function TabPills<T extends string>({ tabs, value, onChange, labels }: { tabs: readonly T[]; value: T; onChange: (tab: T) => void; labels?: Partial<Record<T, string>> }) {
  return (
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 48, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md },
  pill: { paddingHorizontal: 16, paddingVertical: 6, height: 34, justifyContent: 'center', alignItems: 'center', borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  pillActive: { backgroundColor: colors.deepNavy, borderColor: colors.deepNavy },
  label: { ...typography.caps, fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  labelActive: { color: colors.white },
});
