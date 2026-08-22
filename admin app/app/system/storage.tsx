/** §37 — Storage Health. Deleting evidence always requires explicit
 * elevated authorization elsewhere in the flow (§37/§83); this screen is
 * read-only monitoring. */
import { StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { StatCard } from '@/components/common/StatCard';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useStorageHealth } from '@/features/system/useSystem';

export default function StorageHealthScreen() {
  const { data } = useStorageHealth();
  const usedGb = (data?.imageStorageUsedGb ?? 0) + (data?.videoStorageUsedGb ?? 0);
  const pct = data ? Math.round((usedGb / data.totalCapacityGb) * 100) : 0;

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Storage Health" />
      <View style={styles.content}>
        <View style={styles.usageCard}>
          <View style={styles.usageHeaderRow}>
            <Text style={styles.usageLabel}>Total Usage</Text>
            <Text style={styles.usageValue}>{usedGb} GB / {data?.totalCapacityGb ?? 0} GB</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct}%` }]} />
          </View>
        </View>

        <View style={styles.kpiGrid}>
          <StatCard label="Image Storage" value={`${data?.imageStorageUsedGb ?? 0} GB`} tone="default" />
          <StatCard label="Video Storage" value={`${data?.videoStorageUsedGb ?? 0} GB`} tone="default" />
          <StatCard label="Upload Failures Today" value={data?.uploadFailuresToday ?? '—'} tone="warning" />
          <StatCard label="Orphaned Media" value={data?.orphanedMediaCount ?? '—'} tone="warning" />
        </View>

        <Text style={styles.hint}>Evidence deletion is never available from this dashboard — data retention changes require elevated, explicitly-authorized action (§37/§83).</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm },
  usageCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm + 2, gap: spacing.xs },
  usageHeaderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  usageLabel: { ...typography.caps, color: colors.textSecondary },
  usageValue: { ...typography.numeric, color: colors.deepNavy },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primaryBlue },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  hint: { ...typography.labelSm, color: colors.textSecondary, marginTop: spacing.md },
});
