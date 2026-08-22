/** §43–45 — Analytics dashboard: global summary, city performance
 * overview, hazard trend. Bars are plain Views (no chart library pulled
 * in for this pass, matching the rest of the SafePath mobile fleet). */
import { router } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StatCard } from '@/components/common/StatCard';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAnalyticsSummary, useCityPerformance, useHazardTrends } from '@/features/analytics/useAnalytics';
import { useLocationStore } from '@/store/locationStore';

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const place = useLocationStore((s) => s.place);
  const { data: summary } = useAnalyticsSummary();
  const { data: cityPerf } = useCityPerformance();
  const { data: trend } = useHazardTrends();

  const maxTrend = Math.max(1, ...(trend?.map((t) => t.value) ?? [1]));

  return (
    <ScrollView style={[styles.flex, { paddingTop: insets.top }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <TouchableOpacity style={styles.locationButton} onPress={() => router.push('/location-search')}>
          <MapPin size={13} color={colors.primaryBlue} />
          <Text style={styles.locationButtonText}>{place ? `${place.name} · ${place.radiusKm}km` : 'Nationwide'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>PERFORMANCE OVERVIEW</Text>
      <View style={styles.kpiGrid}>
        <StatCard label="Total Hazards" value={summary?.totalHazards ?? '—'} tone="default" />
        <StatCard label="Critical" value={summary?.criticalHazards ?? '—'} tone="critical" />
        <StatCard label="Citizen Reports" value={summary?.citizenReports ?? '—'} tone="info" />
        <StatCard label="Fleet Obs." value={summary?.fleetObservations ?? '—'} tone="info" />
        <StatCard label="Resolution Rate" value={`${summary?.resolutionRatePct ?? 0}%`} tone="success" />
        <StatCard label="Avg Resolution" value={`${summary?.avgResolutionDays ?? 0}d`} tone="default" />
        <StatCard label="AI Detections" value={summary?.aiDetections ?? '—'} tone="default" />
        <StatCard label="Fleet Coverage" value={`${summary?.fleetCoveragePct ?? 0}%`} tone="success" />
      </View>

      <Text style={styles.sectionLabel}>HAZARD TREND (LAST 14 DAYS)</Text>
      <View style={styles.trendCard}>
        <View style={styles.trendChart}>
          {trend?.map((point) => (
            <View key={point.label} style={styles.trendBarWrap}>
              <View style={[styles.trendBar, { height: Math.max(3, (point.value / maxTrend) * 80) }]} />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionLabel}>CITY PERFORMANCE OVERVIEW</Text>
        <Text style={styles.sectionHint}>Not a ranking — informational only</Text>
      </View>
      <View style={styles.cityTable}>
        {cityPerf?.map((row) => (
          <View key={row.cityId} style={styles.cityRow}>
            <View style={styles.cityRowHeader}>
              <Text style={styles.cityName}>{row.cityName}</Text>
              <Text style={styles.cityCoverage}>{row.fleetCoveragePct}% coverage</Text>
            </View>
            <View style={styles.cityMetricsRow}>
              <Text style={styles.cityMetric}>Active: <Text style={styles.cityMetricValue}>{row.activeHazards}</Text></Text>
              <Text style={styles.cityMetric}>Critical: <Text style={[styles.cityMetricValue, { color: colors.critical }]}>{row.criticalHazards}</Text></Text>
              <Text style={styles.cityMetric}>Resolved: <Text style={styles.cityMetricValue}>{row.resolutionRatePct}%</Text></Text>
              <Text style={styles.cityMetric}>Avg: <Text style={styles.cityMetricValue}>{row.avgResolutionDays}d</Text></Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.dataQualityLink} onPress={() => router.push('/data-quality')}>
        <Text style={styles.dataQualityLinkText}>Open Data Quality Center →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.xs },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  headerTitle: { ...typography.headlineLg, fontSize: 20, color: colors.deepNavy },
  locationButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceMuted, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  locationButtonText: { ...typography.labelSm, color: colors.primaryBlue },
  sectionLabel: { ...typography.caps, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sectionHint: { ...typography.labelSm, color: colors.textSecondary, fontStyle: 'italic' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  trendCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  trendChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 90 },
  trendBarWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  trendBar: { width: '70%', backgroundColor: colors.primaryBlue, borderRadius: 2, minHeight: 3 },
  cityTable: { gap: spacing.xs },
  cityRow: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm + 2, gap: 4 },
  cityRowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cityName: { ...typography.bodyMd, fontWeight: '700', color: colors.text },
  cityCoverage: { ...typography.labelSm, color: colors.primaryBlue },
  cityMetricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cityMetric: { ...typography.labelSm, color: colors.textSecondary },
  cityMetricValue: { color: colors.text, fontWeight: '700' },
  dataQualityLink: { marginTop: spacing.md, alignItems: 'center' },
  dataQualityLinkText: { ...typography.labelMd, color: colors.primaryBlue },
});
