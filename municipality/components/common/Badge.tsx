import { AlertTriangle, CheckCircle2, Clock, Info, ShieldAlert, Wrench } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { HAZARD_STATUS_LABELS, REPAIR_STATUS_LABELS, type HazardStatusType, type RepairStatusType, type SeverityType } from '@/constants/enums';
import { colors, radius, repairStatusColors, severityColors, spacing, statusColors, typography } from '@/constants/theme';

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
      <Text style={[styles.label, { color }]}>{severity}</Text>
    </View>
  );
}

const STATUS_ICONS: Record<HazardStatusType, typeof CheckCircle2> = {
  REPORTED: Clock,
  UNDER_REVIEW: Info,
  VERIFIED: CheckCircle2,
  ACTIVE: AlertTriangle,
  UNDER_REPAIR: Wrench,
  RESOLVED: CheckCircle2,
  REOPENED: AlertTriangle,
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

export function RepairStatusBadge({ status }: { status: RepairStatusType }) {
  const color = repairStatusColors[status];
  return (
    <View style={[styles.base, { backgroundColor: withAlpha(color, '1A') }]}>
      <Wrench size={12} color={color} />
      <Text style={[styles.label, { color }]}>{REPAIR_STATUS_LABELS[status]}</Text>
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

export function SourceBadge({ label }: { label: string }) {
  return (
    <View style={[styles.base, { backgroundColor: withAlpha(colors.purple, '1A') }]}>
      <Text style={[styles.label, { color: colors.purple }]}>{label}</Text>
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
