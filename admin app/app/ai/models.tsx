/** §32 — Model Version Management: promote to staging/production, rollback. */
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGate } from '@/components/common/PermissionGate';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Permission } from '@/constants/permissions';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { usePromoteModel, useRollbackModel, useAiModels } from '@/features/ai/useAi';
import type { AiModelVersion } from '@/types/admin';

const STATUS_COLOR: Record<AiModelVersion['status'], string> = { TRAINING: colors.textSecondary, STAGING: colors.warning, PRODUCTION: colors.green, DEPRECATED: colors.critical };

export default function ModelVersionsScreen() {
  const { data: models } = useAiModels();
  const promote = usePromoteModel();
  const rollback = useRollbackModel();
  const [pendingAction, setPendingAction] = useState<{ id: string; kind: 'STAGING' | 'PRODUCTION' | 'ROLLBACK'; version: string } | null>(null);

  const onConfirm = async () => {
    if (!pendingAction) return;
    if (pendingAction.kind === 'ROLLBACK') await rollback.mutateAsync(pendingAction.id);
    else await promote.mutateAsync({ id: pendingAction.id, target: pendingAction.kind });
    setPendingAction(null);
  };

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Model Versions" />
      <FlatList
        data={models ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.name}>{item.name} {item.version}</Text>
              <View style={[styles.statusPill, { backgroundColor: `${STATUS_COLOR[item.status]}1A` }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>{item.status}</Text>
              </View>
            </View>
            {item.status !== 'TRAINING' ? (
              <View style={styles.metricsRow}>
                <Metric label="mAP50" value={item.mAP50.toFixed(2)} />
                <Metric label="Precision" value={`${item.precisionPct}%`} />
                <Metric label="Recall" value={`${item.recallPct}%`} />
                <Metric label="FP/km" value={item.falsePositivesPerKm.toFixed(1)} />
              </View>
            ) : (
              <Text style={styles.trainingHint}>Training in progress — evaluation metrics not yet available.</Text>
            )}
            <PermissionGate permission={Permission.MANAGE_AI}>
              <View style={styles.actionsRow}>
                {item.status === 'TRAINING' ? null : item.status === 'STAGING' ? (
                  <Button label="Promote to Production" size="sm" fullWidth={false} onPress={() => setPendingAction({ id: item.id, kind: 'PRODUCTION', version: item.version })} style={styles.actionButton} />
                ) : item.status === 'PRODUCTION' ? (
                  <Button label="Rollback" size="sm" variant="danger" fullWidth={false} onPress={() => setPendingAction({ id: item.id, kind: 'ROLLBACK', version: item.version })} style={styles.actionButton} />
                ) : (
                  <Button label="Promote to Staging" size="sm" variant="outline" fullWidth={false} onPress={() => setPendingAction({ id: item.id, kind: 'STAGING', version: item.version })} style={styles.actionButton} />
                )}
              </View>
            </PermissionGate>
          </Card>
        )}
      />

      <ConfirmDialog
        visible={pendingAction !== null}
        title={pendingAction?.kind === 'ROLLBACK' ? `Rollback ${pendingAction.version}?` : `Promote ${pendingAction?.version} to ${pendingAction?.kind}?`}
        message="This changes which model version fleet inference uses. Logged to the audit trail."
        destructive={pendingAction?.kind === 'ROLLBACK'}
        busy={promote.isPending || rollback.isPending}
        onConfirm={onConfirm}
        onCancel={() => setPendingAction(null)}
      />
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: { gap: spacing.xs },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...typography.bodyMd, fontWeight: '700', color: colors.text },
  statusPill: { paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.full },
  statusText: { ...typography.caps },
  metricsRow: { flexDirection: 'row', gap: spacing.md },
  metricValue: { ...typography.numeric, color: colors.deepNavy },
  metricLabel: { ...typography.labelSm, color: colors.textSecondary, fontSize: 10 },
  trainingHint: { ...typography.labelSm, color: colors.textSecondary },
  actionsRow: { flexDirection: 'row', marginTop: 4 },
  actionButton: { minWidth: 160 },
});
