/** §23/§24/§64 — City detail + configuration (thresholds, targets,
 * retention) and activate/deactivate workflow. */
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PermissionGate } from '@/components/common/PermissionGate';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { StatCard } from '@/components/common/StatCard';
import { Permission } from '@/constants/permissions';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useCityConfig, useCityDetail, useSetCityStatus, useUpdateCityConfig } from '@/features/cities/useCities';

export default function CityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: city, isLoading, isError, error, refetch } = useCityDetail(id);
  const { data: config } = useCityConfig(id);
  const updateConfig = useUpdateCityConfig(id);
  const setStatus = useSetCityStatus();
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [coverageTarget, setCoverageTarget] = useState('');

  if (isLoading) return <LoadingState label="Loading city…" />;
  if (isError || !city) return <ErrorState message={(error as Error)?.message ?? 'City not found.'} onRetry={refetch} />;

  const effectiveTarget = coverageTarget || String(config?.fleetCoverageTargetPct ?? '');

  return (
    <View style={styles.flex}>
      <ScreenHeader title={city.name} subtitle={`${city.code} · ${city.state}`} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.kpiGrid}>
          <StatCard label="Active Hazards" value={city.activeHazards} tone="critical" />
          <StatCard label="Critical" value={city.criticalHazards} tone="critical" />
          <StatCard label="Fleet Coverage" value={`${city.fleetCoveragePct}%`} tone="success" />
          <StatCard label="Wards" value={city.wardsCount} tone="default" />
        </View>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Municipality</Text>
          <Text style={styles.value}>{city.municipalityName}</Text>
          <Text style={styles.sectionTitle}>Status</Text>
          <Text style={styles.value}>{city.status}</Text>
        </Card>

        <PermissionGate permission={Permission.MANAGE_CITIES}>
          <Text style={styles.sectionLabel}>CITY CONFIGURATION (§24)</Text>
          <Card style={styles.card}>
            <ConfigRow label="Critical severity threshold" value={config?.hazardCriticalThreshold ?? '—'} />
            <ConfigRow label="Notification threshold (hazards)" value={String(config?.notificationThresholdHazards ?? '—')} />
            <ConfigRow label="Data retention" value={`${config?.dataRetentionDays ?? '—'} days`} />
            <ConfigRow label="Auto-verify AI confidence" value={config ? `${Math.round(config.autoVerifyAiConfidence * 100)}%` : '—'} />
            <View style={styles.targetRow}>
              <Text style={styles.configLabel}>Fleet coverage target (%)</Text>
              <TextInput style={styles.targetInput} keyboardType="number-pad" value={effectiveTarget} onChangeText={setCoverageTarget} placeholder={String(config?.fleetCoverageTargetPct ?? 85)} />
            </View>
            <Button
              label="Save Configuration"
              variant="outline"
              onPress={() => updateConfig.mutate({ fleetCoverageTargetPct: Number(effectiveTarget) || config?.fleetCoverageTargetPct })}
              loading={updateConfig.isPending}
            />
          </Card>

          <View style={styles.statusRow}>
            <Text style={styles.sectionTitle}>City Active</Text>
            <Switch
              value={city.status === 'ACTIVE'}
              onValueChange={(next) => (next ? setStatus.mutate({ id: city.id, status: 'ACTIVE' }) : setConfirmDeactivate(true))}
              trackColor={{ true: colors.primaryBlue, false: colors.border }}
            />
          </View>
        </PermissionGate>
      </ScrollView>

      <ConfirmDialog
        visible={confirmDeactivate}
        title="Deactivate this city?"
        message="Fleet operators lose new-assignment eligibility and municipality access is suspended until reactivated (§64). This is logged to the audit trail."
        destructive
        requireReason
        busy={setStatus.isPending}
        onConfirm={() => {
          setStatus.mutate({ id: city.id, status: 'INACTIVE' });
          setConfirmDeactivate(false);
        }}
        onCancel={() => setConfirmDeactivate(false)}
      />
    </View>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.configRow}>
      <Text style={styles.configLabel}>{label}</Text>
      <Text style={styles.configValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xxl },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  card: { gap: spacing.xs },
  sectionTitle: { ...typography.caps, color: colors.textSecondary },
  value: { ...typography.bodyMd, color: colors.text, marginBottom: spacing.xs },
  sectionLabel: { ...typography.caps, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs },
  configRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  configLabel: { ...typography.bodyMd, color: colors.textSecondary },
  configValue: { ...typography.bodyMd, color: colors.text, fontWeight: '600' },
  targetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  targetInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4, width: 70, textAlign: 'right', color: colors.text },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: spacing.sm },
});
