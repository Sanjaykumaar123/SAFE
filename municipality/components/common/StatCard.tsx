import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';

interface StatCardProps {
  label: string;
  value: number | string;
  tone?: 'default' | 'critical' | 'warning' | 'success';
}

const toneStyles = {
  default: { bg: colors.surfaceMuted, text: colors.text, border: colors.border },
  critical: { bg: `${colors.critical}14`, text: colors.critical, border: `${colors.critical}33` },
  warning: { bg: `${colors.warning}14`, text: '#B45309', border: `${colors.warning}33` },
  success: { bg: `${colors.green}14`, text: colors.green, border: `${colors.green}33` },
} as const;

export function StatCard({ label, value, tone = 'default' }: StatCardProps) {
  const t = toneStyles[tone];
  return (
    <View style={[styles.card, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text style={[styles.value, { color: t.text }]}>{value}</Text>
      <Text style={[styles.label, { color: t.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: radius.md, borderWidth: 1, paddingVertical: spacing.md, alignItems: 'center', gap: 2, minWidth: '45%' },
  value: { ...typography.headlineMd },
  label: { ...typography.labelSm, textAlign: 'center' },
});
