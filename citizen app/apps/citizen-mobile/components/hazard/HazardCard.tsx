import { Route } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfidenceBadge, SeverityBadge } from '@/components/common/Badge';
import { HAZARD_TYPE_LABELS } from '@/constants/hazardType';
import { colors, radius, severityColors, shadow, spacing, typography } from '@/constants/theme';
import { formatDistance } from '@/utils/distance';
import type { Hazard } from '@/types';

interface HazardCardProps {
  hazard: Hazard;
  onPress: () => void;
}

export function HazardCard({ hazard, onPress }: HazardCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, shadow.sm, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${HAZARD_TYPE_LABELS[hazard.type]} on ${hazard.roadName ?? hazard.locationText}, ${hazard.severity} severity`}
    >
      <View style={[styles.stripe, { backgroundColor: severityColors[hazard.severity] }]} />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {HAZARD_TYPE_LABELS[hazard.type]}
          </Text>
          <SeverityBadge severity={hazard.severity} />
        </View>
        <View style={styles.roadRow}>
          <Route size={14} color={colors.textSecondary} />
          <Text style={styles.roadText} numberOfLines={1}>
            {hazard.roadName ?? hazard.locationText}
          </Text>
        </View>
        <View style={styles.footerRow}>
          <Text style={styles.distanceText}>{formatDistance(hazard.distanceMeters)}</Text>
          {hazard.aiConfidence != null ? <ConfidenceBadge confidence={hazard.aiConfidence} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.9 },
  stripe: { width: 4 },
  content: { flex: 1, padding: spacing.md, gap: spacing.xs },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { ...typography.headlineMd, color: colors.text, flex: 1 },
  roadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  roadText: { ...typography.bodyMd, color: colors.textSecondary, flex: 1 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xxs },
  distanceText: { ...typography.labelSm, color: colors.textSecondary },
});
