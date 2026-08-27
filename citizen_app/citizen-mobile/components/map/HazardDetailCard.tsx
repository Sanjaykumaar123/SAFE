/** Compact bottom card shown when a hazard marker is tapped directly (i.e.
 * outside of an active Safe Route) — a quick summary, not the full hazard
 * detail screen (that lives at `app/hazard/[id]`, not built yet). */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';

import { HAZARD_TYPE_LABELS } from '@/constants/hazardType';
import { SEVERITY_LABELS } from '@/constants/severity';
import { colors, radius, shadow, spacing, typography, severityColors } from '@/constants/theme';
import type { Hazard } from '@/types';

interface Props {
  hazard: Hazard;
  bottomInset: number;
  onClose: () => void;
}

export function HazardDetailCard({ hazard, bottomInset, onClose }: Props) {
  const color = severityColors[hazard.severity];

  return (
    <View style={[styles.card, { paddingBottom: bottomInset + spacing.md }]}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: `${color}1A` }]}>
          <Text style={[styles.badgeText, { color }]}>{SEVERITY_LABELS[hazard.severity]}</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
          <X size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      <Text style={styles.title}>{HAZARD_TYPE_LABELS[hazard.type]}</Text>
      <Text style={styles.meta} numberOfLines={1}>
        {hazard.roadName ?? hazard.locationText}
        {hazard.distanceMeters != null ? ` · ${Math.round(hazard.distanceMeters)}m away` : ''}
      </Text>
      {hazard.description ? (
        <Text style={styles.description} numberOfLines={2}>
          {hazard.description}
        </Text>
      ) : null}
      <Text style={styles.hint}>Safe Route automatically routes around hazards like this one.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: 0,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.md,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  badgeText: { ...typography.labelSm, fontWeight: '700' },
  closeButton: { width: 28, height: 28, borderRadius: radius.full, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.headlineMd, color: colors.text, marginTop: spacing.sm },
  meta: { ...typography.bodyMd, color: colors.textSecondary, marginTop: 2 },
  description: { ...typography.bodyMd, color: colors.text, marginTop: spacing.sm },
  hint: { ...typography.labelSm, color: colors.textSecondary, marginTop: spacing.md },
});
