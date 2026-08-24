import { AlertTriangle, CheckCircle2, Clock, Info, ShieldAlert } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { HAZARD_STATUS_LABELS, type HazardStatusType } from '@/constants/hazardStatus';
import { SEVERITY_LABELS, type SeverityType } from '@/constants/severity';
import { colors, radius, severityColors, spacing, statusColors, typography } from '@/constants/theme';

/** Severity/status badges always pair color with an icon AND a text label
 * (section 48 — never rely on color alone). */

function withAlpha(hex: string, alpha: string): string {
  return `${hex}${alpha}`;
}

export function SeverityBadge({ severity }: { severity: SeverityType }) {
  const color = severityColors[severity];
  const Icon = severity === 'CRITICAL' || severity === 'HIGH' ? ShieldAlert : AlertTriangle;
  return (
    <View style={[styles.base, { backgroundColor: withAlpha(color, '1A') }]}>
      <Icon size={12} color={color} />
      <Text style={[styles.label, { color }]}>{SEVERITY_LABELS[severity].toUpperCase()}</Text>
    </View>
  );
}

const STATUS_ICONS: Record<HazardStatusType, typeof CheckCircle2> = {
  REPORTED: Clock,
  UNDER_REVIEW: Info,
  VERIFIED: CheckCircle2,
  ACTIVE: AlertTriangle,
  UNDER_REPAIR: Clock,
  RESOLVED: CheckCircle2,
  REJECTED: Info,
  DUPLICATE: Info,
};

export function StatusBadge({ status }: { status: HazardStatusType }) {
  const color = statusColors[status];
  const Icon = STATUS_ICONS[status];
  return (
    <View style={[styles.base, { backgroundColor: withAlpha(color, '1A') }]}>
      <Icon size={12} color={color} />
      <Text style={[styles.label, { color }]}>{HAZARD_STATUS_LABELS[status]}</Text>
    </View>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  return (
    <View style={[styles.base, { backgroundColor: withAlpha(colors.secondaryBlue, '1A') }]}>
      <Text style={[styles.label, { color: colors.secondaryBlue }]}>{Math.round(confidence * 100)}% AI confidence</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  label: { ...typography.labelSm, fontWeight: '700' },
});
