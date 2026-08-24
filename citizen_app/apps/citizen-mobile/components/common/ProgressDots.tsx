import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';

export function ProgressDots({ total, activeIndex }: { total: number; activeIndex: number }) {
  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no">
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs, justifyContent: 'center' },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 20, backgroundColor: colors.primaryBlue },
  dotInactive: { width: 6, backgroundColor: colors.border },
});
