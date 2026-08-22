import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/constants/theme';

interface StatCardProps {
  label: string;
  value: number | string;
  tone?: 'default' | 'critical' | 'warning' | 'success' | 'info';
  trendPct?: number;
  sub?: string;
  compact?: boolean;
}

const toneStyles = {
  default: { bg: colors.surfaceMuted, text: colors.text, border: colors.border },
  critical: { bg: `${colors.critical}14`, text: colors.critical, border: `${colors.critical}33` },
  warning: { bg: `${colors.warning}14`, text: '#B45309', border: `${colors.warning}33` },
  success: { bg: `${colors.green}14`, text: colors.green, border: `${colors.green}33` },
  info: { bg: `${colors.secondaryBlue}14`, text: colors.primaryBlue, border: `${colors.secondaryBlue}33` },
} as const;

export function StatCard({ label, value, tone = 'default', trendPct, sub, compact }: StatCardProps) {
  const t = toneStyles[tone];
  return (
    <View style={[styles.card, compact && styles.compact, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text style={[styles.label, { color: t.text }]} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: t.text }]} numberOfLines={1}>
          {value}
        </Text>
        {trendPct !== undefined ? (
          <Text style={[styles.trend, { color: t.text }]}>
            {trendPct >= 0 ? '↑' : '↓'} {Math.abs(trendPct)}%
          </Text>
        ) : null}
      </View>
      {sub ? (
        <Text style={styles.sub} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: radius.md, borderWidth: 1, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.sm + 2, gap: 4, minWidth: '45%' },
  compact: { minWidth: '30%' },
  label: { ...typography.caps },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  value: { ...typography.numeric, fontSize: 22, lineHeight: 26 },
  trend: { ...typography.labelSm },
  sub: { ...typography.labelSm, color: colors.textSecondary },
});
