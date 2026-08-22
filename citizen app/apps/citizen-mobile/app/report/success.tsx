import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, CloudUpload } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/common/Button';
import { LoadingState } from '@/components/common/LoadingState';
import { ReportTimeline } from '@/components/report/ReportTimeline';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useReportDetail } from '@/features/reports/useReportDetail';

export default function ReportSuccessScreen() {
  const { reportId, queued } = useLocalSearchParams<{ reportId?: string; queued?: string }>();
  const isQueued = queued === '1';
  const { data: report, isPending } = useReportDetail(isQueued ? undefined : reportId);

  if (isQueued) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: colors.warning }]}>
            <CloudUpload size={44} color={colors.white} />
          </View>
          <Text style={styles.title}>REPORT SAVED</Text>
          <Text style={styles.subtitle}>
            You&apos;re offline right now — your report is saved on this device and will submit automatically as soon as you&apos;re back
            online.
          </Text>
        </View>
        <View style={styles.footer}>
          <Button label="Back to Map" onPress={() => router.replace('/(tabs)/map')} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <CheckCircle2 size={44} color={colors.white} />
        </View>
        <Text style={styles.title}>REPORT SUBMITTED</Text>
        <Text style={styles.subtitle}>Thank you for helping make your roads safer.</Text>

        {isPending || !report ? (
          <LoadingState label="Loading report…" />
        ) : (
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Report ID</Text>
              <Text style={styles.cardValue}>{report.reportCode}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Location</Text>
              <Text style={styles.cardValue} numberOfLines={1}>
                {report.locationText}
              </Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Status</Text>
              <Text style={styles.statusValue}>UNDER REVIEW</Text>
            </View>
            <View style={styles.timelineWrap}>
              <ReportTimeline currentStatus={report.status} />
            </View>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Button label="View Report" onPress={() => report && router.replace(`/reports/${report.id}`)} disabled={!report} />
        <Button label="Back to Map" onPress={() => router.replace('/(tabs)/map')} variant="outline" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', padding: spacing.lg, gap: spacing.sm },
  iconCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl, marginBottom: spacing.sm },
  title: { ...typography.headlineLg, color: colors.text, letterSpacing: 0.5 },
  subtitle: { ...typography.bodyMd, color: colors.textSecondary, marginBottom: spacing.md, textAlign: 'center' },
  card: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cardLabel: { ...typography.labelMd, color: colors.textSecondary },
  cardValue: { ...typography.labelMd, color: colors.text, flexShrink: 1, textAlign: 'right' },
  statusValue: { ...typography.labelMd, color: colors.purple, fontWeight: '700' },
  timelineWrap: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  footer: { padding: spacing.lg, gap: spacing.sm },
});
