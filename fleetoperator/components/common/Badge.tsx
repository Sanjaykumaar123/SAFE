import { StyleSheet, Text, View } from 'react-native';

import type { CollectionSessionStatusType, EarningStatusType, SeverityType, SyncStatusType } from '@/constants/enums';
import { CollectionSessionStatusLabels } from '@/constants/enums';
import { colors, healthStateColors, radius, sessionStatusColors, severityColors, spacing, syncStatusColors, typography } from '@/constants/theme';
import type { HealthStateType } from '@/constants/enums';

/** Color is always paired with a label, never color alone (same rule
 * `municipality/components/common/Badge.tsx` follows). */
function withAlpha(hex: string, alpha: string): string {
  return `${hex}${alpha}`;
}

function BaseBadge({ color, label }: { color: string; label: string }) {
  return (
    <View style={[styles.base, { backgroundColor: withAlpha(color, '1A'), borderColor: withAlpha(color, '40') }]}>
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function SeverityBadge({ severity }: { severity: SeverityType }) {
  return <BaseBadge color={severityColors[severity]} label={severity} />;
}

export function SessionStatusBadge({ status }: { status: CollectionSessionStatusType }) {
  return <BaseBadge color={sessionStatusColors[status]} label={CollectionSessionStatusLabels[status]} />;
}

export function SyncStatusBadge({ status }: { status: SyncStatusType }) {
  return <BaseBadge color={syncStatusColors[status]} label={status} />;
}

export function HealthBadge({ state, label }: { state: HealthStateType; label: string }) {
  return <BaseBadge color={healthStateColors[state]} label={label} />;
}

export function EarningStatusBadge({ status }: { status: EarningStatusType }) {
  const color = status === 'PAID' ? colors.green : status === 'APPROVED' ? colors.secondaryBlue : colors.amber;
  return <BaseBadge color={color} label={status} />;
}

const styles = StyleSheet.create({
  base: { alignSelf: 'flex-start', borderRadius: radius.full, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  label: { ...typography.labelSm, fontWeight: '700' },
});
