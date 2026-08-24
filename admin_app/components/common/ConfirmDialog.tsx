/** §17/§53/§76 — every admin override/validation action confirms first and
 * can require a typed reason, which becomes part of the audit event
 * (§76: WHO/WHAT/WHEN/WHY/BEFORE/AFTER). A lightweight in-tree modal
 * rather than a native Alert so it can show structured context (source
 * count, AI confidence, …) and an optional reason field. */
import { AlertTriangle } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from './Button';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  contextLines?: string[];
  confirmLabel?: string;
  destructive?: boolean;
  requireReason?: boolean;
  reasonPlaceholder?: string;
  busy?: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  contextLines,
  confirmLabel = 'CONFIRM',
  destructive = false,
  requireReason = false,
  reasonPlaceholder = 'Reason (required)…',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('');
  const canConfirm = !requireReason || reason.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <AlertTriangle size={22} color={destructive ? colors.critical : colors.primaryBlue} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {contextLines?.length ? (
            <View style={styles.contextBox}>
              {contextLines.map((line) => (
                <Text key={line} style={styles.contextLine}>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}

          {requireReason ? (
            <TextInput
              style={styles.reasonInput}
              placeholder={reasonPlaceholder}
              placeholderTextColor={colors.textSecondary}
              value={reason}
              onChangeText={setReason}
              multiline
            />
          ) : null}

          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={styles.cancelButton} accessibilityRole="button">
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
            <View style={styles.confirmWrap}>
              <Button label={confirmLabel} onPress={() => onConfirm(reason.trim() || undefined)} variant={destructive ? 'danger' : 'primary'} disabled={!canConfirm} loading={busy} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: { width: '100%', maxWidth: 420, backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.headlineMd, color: colors.deepNavy },
  message: { ...typography.bodyMd, color: colors.textSecondary },
  contextBox: { backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, padding: spacing.sm, gap: 2 },
  contextLine: { ...typography.labelSm, color: colors.text },
  reasonInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm, minHeight: 60, ...typography.bodyMd, color: colors.text, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xs },
  cancelButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, justifyContent: 'center' },
  cancelLabel: { ...typography.labelMd, color: colors.textSecondary },
  confirmWrap: { minWidth: 140 },
});
