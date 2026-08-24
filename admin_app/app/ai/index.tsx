/** §30 — AI Control Center: model status, inference stats, quick links. */
import { router } from 'expo-router';
import { Settings, TrendingUp, Workflow } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { HealthBadge } from '@/components/common/Badge';
import { Card } from '@/components/common/Card';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { StatCard } from '@/components/common/StatCard';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAiStatus } from '@/features/ai/useAi';

export default function AiControlCenterScreen() {
  const { data: status } = useAiStatus();

  return (
    <View style={styles.flex}>
      <ScreenHeader title="AI Control Center" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.modelCard}>
          <View style={styles.modelHeaderRow}>
            <View>
              <Text style={styles.modelName}>{status?.modelName ?? 'YOLO26n'}</Text>
              <Text style={styles.modelVersion}>{status?.version ?? 'safepath-pothole-v1'}</Text>
            </View>
            {status ? <HealthBadge status={status.status === 'ONLINE' ? 'HEALTHY' : status.status === 'DEGRADED' ? 'WARNING' : 'DOWN'} /> : null}
          </View>
        </Card>

        <View style={styles.kpiGrid}>
          <StatCard label="Inference Requests Today" value={status?.inferenceRequestsToday ?? '—'} tone="default" />
          <StatCard label="Successful Detections" value={status?.successfulDetectionsToday ?? '—'} tone="success" />
          <StatCard label="Avg Confidence" value={`${status?.avgConfidencePct ?? 0}%`} tone="info" />
          <StatCard label="Avg Latency" value={`${status?.avgLatencyMs ?? 0}ms`} tone="default" />
          <StatCard label="Error Rate" value={`${status?.errorRatePct ?? 0}%`} tone={status && status.errorRatePct > 2 ? 'critical' : 'default'} />
          <StatCard label="False-Positive Review Rate" value={`${status?.falsePositiveReviewRatePct ?? 0}%`} tone="warning" />
        </View>

        <View style={styles.linksGrid}>
          <NavCard icon={<Settings size={18} color={colors.primaryBlue} />} label="AI Configuration" sub="Confidence threshold, FPS, deployment mode" onPress={() => router.push('/ai/config')} />
          <NavCard icon={<Workflow size={18} color={colors.primaryBlue} />} label="Model Versions" sub="Promote, rollback, evaluate" onPress={() => router.push('/ai/models')} />
          <NavCard icon={<TrendingUp size={18} color={colors.primaryBlue} />} label="AI Performance" sub="Precision, recall, mAP, FP/km" onPress={() => router.push('/ai/performance')} />
        </View>
      </ScrollView>
    </View>
  );
}

function NavCard({ icon, label, sub, onPress }: { icon: React.ReactNode; label: string; sub: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.navCard} onPress={onPress}>
      <View style={styles.navIcon}>{icon}</View>
      <View style={styles.navBody}>
        <Text style={styles.navLabel}>{label}</Text>
        <Text style={styles.navSub}>{sub}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl },
  modelCard: {},
  modelHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modelName: { ...typography.headlineMd, color: colors.deepNavy },
  modelVersion: { ...typography.labelSm, color: colors.textSecondary },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  linksGrid: { gap: spacing.xs, marginTop: spacing.sm },
  navCard: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm + 2 },
  navIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${colors.primaryBlue}14`, alignItems: 'center', justifyContent: 'center' },
  navBody: { flex: 1 },
  navLabel: { ...typography.bodyMd, fontWeight: '700', color: colors.text },
  navSub: { ...typography.labelSm, color: colors.textSecondary },
});
