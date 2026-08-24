/** Transient top banner shown when the periodic hazard poll turns up a new
 * hazard sitting on the currently active Safe Route — the "real-time"
 * safety-relevant surprise a static map wouldn't catch. */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { TriangleAlert, X } from 'lucide-react-native';

import { SEVERITY_LABELS } from '@/constants/severity';
import { colors, radius, shadow, spacing, typography, severityColors } from '@/constants/theme';
import type { Hazard } from '@/types';

interface Props {
  hazard: Hazard | null;
  topOffset: number;
  /** Right inset — wider than the default `spacing.md` so the banner
   * doesn't slide under the FAB column on the right edge. */
  rightOffset: number;
  onDismiss: () => void;
}

export function HazardAlertBanner({ hazard, topOffset, rightOffset, onDismiss }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(hazard ? 1 : 0, { duration: 220 });
  }, [hazard, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -12 }],
  }));

  if (!hazard) return null;
  const color = severityColors[hazard.severity];

  return (
    <Animated.View style={[styles.banner, { top: topOffset, right: rightOffset, borderLeftColor: color }, animatedStyle]}>
      <TriangleAlert size={18} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>New hazard on your route</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {SEVERITY_LABELS[hazard.severity]} · {hazard.roadName ?? hazard.locationText}
        </Text>
      </View>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <X size={16} color={colors.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    ...shadow.md,
  },
  title: { ...typography.labelMd, color: colors.text, textTransform: 'none' },
  subtitle: { ...typography.labelSm, color: colors.textSecondary, marginTop: 2 },
});
