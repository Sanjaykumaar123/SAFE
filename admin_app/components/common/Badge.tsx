import { AlertTriangle, CheckCircle2, Clock, Copy, Info, RotateCcw, ShieldAlert, ShieldCheck, Wrench, XCircle } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { HAZARD_STATUS_LABELS, type HazardStatusType, type SeverityType } from '@/constants/enums';
import { colors, hazardStatusColors, radius, severityColors, spacing, systemStatusColors, typography } from '@/constants/theme';
import type { ServiceHealthType } from '@/constants/enums';

/** Severity/status badges always pair color with an icon AND a text label
 * (never rely on color alone). */
function withAlpha(hex: string, alpha: string): string {
  return `${hex}${alpha}`;
}

export function SeverityBadge({ severity }: { severity: SeverityType }) {
  const color = severityColors[severity] || colors.warning;
  const Icon = severity === 'CRITICAL' || severity === 'HIGH' ? ShieldAlert : AlertTriangle;
  return (
    <View style={[styles.base, { backgroundColor: withAlpha(color, '1A') }]}>
      <Icon size={12} color={color} />
      <Text style={[styles.label, { color }]}>{severity || 'LOW'}</Text>
    </View>
  );
}

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  NEW: Clock,
  UNDER_REVIEW: Info,
  VERIFIED: ShieldCheck,
  ACTIVE: AlertTriangle,
  UNDER_REPAIR: Wrench,
  RESOLVED: CheckCircle2,
  REOPENED: RotateCcw,
  REJECTED: XCircle,
  DUPLICATE: Copy,
  REPORTED: Info,
};

export function HazardStatusBadge({ status }: { status: HazardStatusType }) {
  const safeStatus = (status || 'NEW').toUpperCase() as HazardStatusType;
  const color = hazardStatusColors[safeStatus] || colors.primaryBlue;
  const Icon = STATUS_ICONS[safeStatus] || STATUS_ICONS[status] || Clock;
  const label = HAZARD_STATUS_LABELS[safeStatus] || status || 'NEW';
  return (
    <View style={[styles.base, { backgroundColor: withAlpha(color, '1A') }]}>
      <Icon size={12} color={color} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  return (
    <View style={[styles.base, { backgroundColor: withAlpha(colors.secondaryBlue, '1A') }]}>
      <Text style={[styles.label, { color: colors.primaryBlue }]}>{Math.round(confidence * 100)}% AI conf.</Text>
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

export function HealthBadge({ status }: { status: ServiceHealthType }) {
  const color = systemStatusColors[status];
  return (
    <View style={[styles.base, { backgroundColor: withAlpha(color, '1A') }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{status}</Text>
    </View>
  );
}

export function RoleBadge({ label }: { label: string }) {
  return (
    <View style={[styles.base, { backgroundColor: withAlpha(colors.deepNavy, '0F') }]}>
      <Text style={[styles.label, { color: colors.deepNavy }]}>{label}</Text>
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
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { ...typography.labelSm, fontWeight: '700' },
});
