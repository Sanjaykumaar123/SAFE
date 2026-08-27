import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Camera } from 'lucide-react-native';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SeverityBadge } from '@/components/common/Badge';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { ReportTimeline } from '@/components/report/ReportTimeline';
import { BoundingBoxOverlay } from '@/components/report/BoundingBoxOverlay';
import { HAZARD_TYPE_LABELS } from '@/constants/hazardType';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useReportDetail } from '@/features/reports/useReportDetail';
import { toApiError } from '@/services/api/queryClient';

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: report, isPending, isError, error, refetch } = useReportDetail(id);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton} accessibilityLabel="Back" accessibilityRole="button">
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Report Details</Text>
        <View style={styles.headerButton} />
      </View>

      {isPending ? (
        <LoadingState label="Loading report…" />
      ) : isError || !report ? (
        <ErrorState message={toApiError(error).message || 'Report not found.'} onRetry={() => refetch()} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.imageWrap}>
            {report.media[0] ? (
              <>
                <Image source={{ uri: report.media[0] }} style={styles.image} />
                {report.aiAnalysis?.detected ? (
                  <BoundingBoxOverlay box={report.aiAnalysis.boundingBox} boxes={report.aiAnalysis.boundingBoxes} label="AI DETECTED POTHOLE" />
                ) : null}
              </>
            ) : (
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Camera size={32} color={colors.textSecondary} />
              </View>
            )}
          </View>

          <View style={styles.body}>
            <View style={styles.titleRow}>
              <View>
                <Text style={styles.reportCode}>{report.reportCode}</Text>
                <Text style={styles.title}>{HAZARD_TYPE_LABELS[report.hazardType]}</Text>
              </View>
              <SeverityBadge severity={report.severity} />
            </View>
            <Text style={styles.location}>{report.locationText}</Text>

            {report.description ? (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>Description</Text>
                <Text style={styles.cardText}>{report.description}</Text>
              </View>
            ) : null}

            {report.aiAnalysis ? (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>AI Analysis</Text>
                <View style={styles.aiRow}>
                  <View>
                    <Text style={styles.aiValueLabel}>Confidence</Text>
                    <Text style={styles.aiValue}>{Math.round(report.aiAnalysis.confidence * 100)}%</Text>
                  </View>
                  {report.aiAnalysis.severity ? (
                    <View>
                      <Text style={styles.aiValueLabel}>AI Severity</Text>
                      <Text style={styles.aiValue}>{report.aiAnalysis.severity}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Status Timeline</Text>
              <View style={styles.timelineWrap}>
                <ReportTimeline currentStatus={report.status} />
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>Created {new Date(report.createdAt).toLocaleString()}</Text>
              <Text style={styles.metaText}>Updated {new Date(report.updatedAt).toLocaleString()}</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.headlineMd, color: colors.deepNavy },
  scroll: { paddingBottom: spacing.xxl },
  imageWrap: { height: 220, backgroundColor: colors.surfaceMuted },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.lg, gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  reportCode: { ...typography.labelMd, color: colors.textSecondary },
  title: { ...typography.headlineLg, color: colors.text },
  location: { ...typography.bodyLg, color: colors.textSecondary },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  cardLabel: { ...typography.labelMd, color: colors.textSecondary },
  cardText: { ...typography.bodyLg, color: colors.text },
  aiRow: { flexDirection: 'row', gap: spacing.xl },
  aiValueLabel: { ...typography.labelSm, color: colors.textSecondary },
  aiValue: { ...typography.headlineMd, color: colors.text },
  timelineWrap: { marginTop: spacing.xs },
  metaRow: { gap: 2 },
  metaText: { ...typography.labelSm, color: colors.textSecondary },
});
