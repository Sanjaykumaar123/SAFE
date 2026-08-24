import { StyleSheet, Text, View } from 'react-native';

import { HAZARD_STATUS_LABELS, REPORT_TIMELINE_STAGES, type HazardStatusType } from '@/constants/hazardStatus';
import { colors, spacing, typography } from '@/constants/theme';

/** The Submitted -> Under Review -> Verified -> Resolved timeline used on
 * both the success screen (section 24) and report detail (section 26). */
export function ReportTimeline({ currentStatus }: { currentStatus: HazardStatusType }) {
  const currentIndex = REPORT_TIMELINE_STAGES.indexOf(currentStatus);
  const effectiveIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <View style={styles.container}>
      {REPORT_TIMELINE_STAGES.map((stage, index) => {
        const isComplete = index <= effectiveIndex;
        const isLast = index === REPORT_TIMELINE_STAGES.length - 1;
        return (
          <View key={stage} style={styles.row}>
            <View style={styles.markerColumn}>
              <View style={[styles.dot, isComplete && styles.dotComplete]} />
              {!isLast && <View style={[styles.line, index < effectiveIndex && styles.lineComplete]} />}
            </View>
            <Text style={[styles.label, isComplete && styles.labelComplete]}>{HAZARD_STATUS_LABELS[stage]}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  row: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 40 },
  markerColumn: { width: 24, alignItems: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.border, marginTop: 2 },
  dotComplete: { backgroundColor: colors.green },
  line: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: 2 },
  lineComplete: { backgroundColor: colors.green },
  label: { ...typography.bodyMd, color: colors.textSecondary, marginLeft: spacing.sm },
  labelComplete: { color: colors.text, fontWeight: '600' },
});
