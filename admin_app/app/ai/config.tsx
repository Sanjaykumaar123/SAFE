/** §31/§63 — AI Configuration. Changing production thresholds always
 * warns, always requires a reason, and always confirms — the reason and
 * old/new values land in the audit log (§63/§76). Gated end-to-end by
 * Permission.MANAGE_AI (§07/§86: an ANALYST or FLEET_ADMIN never reaches
 * this screen's controls). */
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGate } from '@/components/common/PermissionGate';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Permission } from '@/constants/permissions';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAiConfig, useUpdateAiConfig } from '@/features/ai/useAi';

export default function AiConfigScreen() {
  const { data: config } = useAiConfig();
  const updateConfig = useUpdateAiConfig();
  const [threshold, setThreshold] = useState('');
  const [fps, setFps] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const effectiveThreshold = threshold || String(config?.confidenceThreshold ?? '');
  const effectiveFps = fps || String(config?.inferenceFps ?? '');

  const onSave = async (reason?: string) => {
    if (!config) return;
    await updateConfig.mutateAsync({
      patch: { confidenceThreshold: Number(effectiveThreshold), inferenceFps: Number(effectiveFps), reason: reason ?? '' },
      version: config.version,
    });
    setConfirmOpen(false);
  };

  return (
    <View style={styles.flex}>
      <ScreenHeader title="AI Configuration" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.warningBanner}>
          <Text style={styles.warningTitle}>WARNING</Text>
          <Text style={styles.warningText}>Changing AI thresholds can affect road-hazard detection across every fleet vehicle. Every change requires a reason and is logged to the audit trail.</Text>
        </View>

        <Card style={styles.card}>
          <FieldRow label="Confidence threshold" value={effectiveThreshold} onChange={setThreshold} suffix={` (current ${config ? Math.round(config.confidenceThreshold * 100) : '—'}%)`} />
          <FieldRow label="Inference FPS" value={effectiveFps} onChange={setFps} suffix="" />
          <View style={styles.readOnlyRow}>
            <Text style={styles.readOnlyLabel}>Min detection size (px)</Text>
            <Text style={styles.readOnlyValue}>{config?.minDetectionSizePx ?? '—'}</Text>
          </View>
          <View style={styles.readOnlyRow}>
            <Text style={styles.readOnlyLabel}>Deployment mode</Text>
            <Text style={styles.readOnlyValue}>{config?.deploymentMode ?? '—'}</Text>
          </View>
          <View style={styles.readOnlyRow}>
            <Text style={styles.readOnlyLabel}>Fallback mode</Text>
            <Text style={styles.readOnlyValue}>{config?.fallbackMode ?? '—'}</Text>
          </View>
        </Card>

        <PermissionGate permission={Permission.MANAGE_AI} fallback={<Text style={styles.readOnlyHint}>You have read-only access to AI configuration.</Text>}>
          <Button label="Save Configuration" onPress={() => setConfirmOpen(true)} disabled={!threshold && !fps} />
        </PermissionGate>
      </ScrollView>

      <ConfirmDialog
        visible={confirmOpen}
        title="Change AI configuration?"
        message="This updates production hazard-detection behavior for every connected fleet vehicle."
        contextLines={[`Confidence threshold: ${config ? Math.round(config.confidenceThreshold * 100) : '—'}% → ${Math.round(Number(effectiveThreshold) * 100)}%`, `Inference FPS: ${config?.inferenceFps ?? '—'} → ${effectiveFps}`]}
        requireReason
        reasonPlaceholder="Why is this threshold changing? (required)"
        busy={updateConfig.isPending}
        onConfirm={onSave}
        onCancel={() => setConfirmOpen(false)}
      />
    </View>
  );
}

function FieldRow({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix: string }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>
        {label}
        {suffix}
      </Text>
      <TextInput style={styles.fieldInput} value={value} onChangeText={onChange} keyboardType="decimal-pad" />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl },
  warningBanner: { backgroundColor: `${colors.critical}0F`, borderWidth: 1, borderColor: `${colors.critical}33`, borderRadius: radius.md, padding: spacing.sm + 2, gap: 4 },
  warningTitle: { ...typography.caps, color: colors.critical },
  warningText: { ...typography.bodyMd, color: colors.text },
  card: { gap: spacing.xs },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  fieldLabel: { ...typography.bodyMd, color: colors.textSecondary, flex: 1 },
  fieldInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 6, width: 90, textAlign: 'right', color: colors.text },
  readOnlyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  readOnlyLabel: { ...typography.bodyMd, color: colors.textSecondary },
  readOnlyValue: { ...typography.bodyMd, color: colors.text, fontWeight: '600' },
  readOnlyHint: { ...typography.labelSm, color: colors.textSecondary, textAlign: 'center' },
});
