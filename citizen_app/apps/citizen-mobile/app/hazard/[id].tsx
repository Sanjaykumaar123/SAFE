import { ArrowLeft, Camera, Clock, MapPin, Route, ShieldCheck, TriangleAlert } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SeverityBadge, StatusBadge } from '@/components/common/Badge';
import { HAZARD_STATUS_LABELS } from '@/constants/hazardStatus';
import { HAZARD_TYPE_LABELS } from '@/constants/hazardType';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import { useHazardDetail } from '@/features/hazards/useHazardDetail';
import { toApiError } from '@/services/api/queryClient';
import { formatDistance, formatRelativeTime } from '@/utils/distance';
import { useAuthStore } from '@/store/authStore';

export default function HazardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: hazard, isPending, isError, error, refetch } = useHazardDetail(id);
  const authStatus = useAuthStore((s) => s.status);

  function handleReport() {
    router.push(authStatus === 'authenticated' ? '/report/camera' : '/(auth)/login');
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton} accessibilityLabel="Back" accessibilityRole="button">
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Hazard Details</Text>
        <View style={styles.headerButton} />
      </View>

      {isPending ? (
        <LoadingState label="Loading hazard details…" />
      ) : isError || !hazard ? (
        <ErrorState message={toApiError(error).message || 'Hazard not found.'} onRetry={() => refetch()} />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.hero}>
              {hazard.imageUrl ? (
                <Image source={{ uri: hazard.imageUrl }} style={styles.heroImage} />
              ) : (
                <View style={[styles.heroImage, styles.heroPlaceholder]}>
                  <Camera size={36} color={colors.textSecondary} />
                </View>
              )}
              <View style={styles.heroBadge}>
                <SeverityBadge severity={hazard.severity} />
              </View>
            </View>

            <View style={styles.body}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{HAZARD_TYPE_LABELS[hazard.type]}</Text>
                <StatusBadge status={hazard.status} />
              </View>
              <Text style={styles.location}>{hazard.locationText}</Text>
              {(hazard.media?.length ?? 0) > 0 ? (
                <Pressable onPress={() => router.push(`/hazard/evidence?id=${hazard.id}`)} accessibilityRole="button">
                  <Text style={styles.evidenceLink}>View all evidence ({hazard.media?.length})</Text>
                </Pressable>
              ) : null}

              <View style={styles.statsGrid}>
                <StatTile icon={<MapPin size={18} color={colors.primaryBlue} />} label="Location" value={hazard.roadName ?? hazard.locationText} />
                <StatTile icon={<Route size={18} color={colors.secondaryBlue} />} label="Distance" value={formatDistance(hazard.distanceMeters) || '—'} />
                <StatTile icon={<TriangleAlert size={18} color={colors.purple} />} label="AI Confidence" value={hazard.aiConfidence != null ? `${Math.round(hazard.aiConfidence * 100)}%` : '—'} />
                <StatTile icon={<Clock size={18} color={colors.textSecondary} />} label="Last Updated" value={formatRelativeTime(hazard.updatedAt)} />
              </View>

              {hazard.verificationNote ? (
                <View style={styles.verificationCard}>
                  <View style={styles.verificationHeader}>
                    <ShieldCheck size={18} color={colors.secondaryBlue} />
                    <Text style={styles.verificationTitle}>Road Verification</Text>
                  </View>
                  <Text style={styles.verificationText}>{hazard.verificationNote}</Text>
                </View>
              ) : null}

              {hazard.description ? (
                <View style={styles.descriptionCard}>
                  <Text style={styles.descriptionLabel}>Description</Text>
                  <Text style={styles.descriptionText}>{hazard.description}</Text>
                </View>
              ) : null}

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>Reported {formatRelativeTime(hazard.createdAt)}</Text>
                <Text style={styles.metaText}>Status: {HAZARD_STATUS_LABELS[hazard.status]}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button label="Report this hazard" onPress={handleReport} variant="danger" size="lg" />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.statTile}>
      {icon}
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.headlineMd, color: colors.deepNavy },
  scrollContent: { paddingBottom: spacing.xxl },
  hero: { height: 240, backgroundColor: colors.surfaceMuted },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  heroBadge: { position: 'absolute', top: spacing.md, right: spacing.md },
  body: { padding: spacing.lg, gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.headlineLg, color: colors.text },
  location: { ...typography.bodyLg, color: colors.textSecondary },
  evidenceLink: { ...typography.labelMd, color: colors.primaryBlue },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statTile: {
    width: '47%',
    gap: 4,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadow.sm,
  },
  statLabel: { ...typography.labelSm, color: colors.textSecondary },
  statValue: { ...typography.labelMd, color: colors.text },
  verificationCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  verificationHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  verificationTitle: { ...typography.headlineMd, color: colors.text },
  verificationText: { ...typography.bodyMd, color: colors.textSecondary },
  descriptionCard: { gap: 4 },
  descriptionLabel: { ...typography.labelMd, color: colors.textSecondary },
  descriptionText: { ...typography.bodyLg, color: colors.text },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { ...typography.labelSm, color: colors.textSecondary },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white },
});
