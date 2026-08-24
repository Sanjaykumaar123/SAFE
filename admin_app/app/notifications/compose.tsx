/** §59 — System Announcement composer: target, title, message, priority,
 * schedule/expiry. */
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { NotificationPriority } from '@/constants/enums';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useSendAnnouncement } from '@/features/notifications/useNotifications';

const TARGETS = ['Platform', 'Citizen App', 'Municipality App', 'Fleet App'] as const;
const PRIORITIES = Object.values(NotificationPriority);

export default function ComposeAnnouncementScreen() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<(typeof TARGETS)[number]>('Platform');
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>('MEDIUM');
  const send = useSendAnnouncement();

  const onSend = async () => {
    await send.mutateAsync({ title, message, target, priority });
    router.back();
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>New Announcement</Text>

      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Scheduled maintenance tonight" placeholderTextColor={colors.textSecondary} />

      <Text style={styles.label}>Message</Text>
      <TextInput style={[styles.input, styles.textarea]} value={message} onChangeText={setMessage} placeholder="Announcement details…" placeholderTextColor={colors.textSecondary} multiline />

      <Text style={styles.label}>Target</Text>
      <View style={styles.chipRow}>
        {TARGETS.map((t) => (
          <TouchableOpacity key={t} style={[styles.chip, target === t && styles.chipActive]} onPress={() => setTarget(t)}>
            <Text style={[styles.chipText, target === t && styles.chipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Priority</Text>
      <View style={styles.chipRow}>
        {PRIORITIES.map((p) => (
          <TouchableOpacity key={p} style={[styles.chip, priority === p && styles.chipActive]} onPress={() => setPriority(p)}>
            <Text style={[styles.chipText, priority === p && styles.chipTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Button label="SEND ANNOUNCEMENT" onPress={onSend} loading={send.isPending} disabled={!title.trim() || !message.trim()} style={styles.submit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xs },
  heading: { ...typography.headlineMd, color: colors.deepNavy, marginBottom: spacing.sm },
  label: { ...typography.labelMd, color: colors.text, marginTop: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, color: colors.text, backgroundColor: colors.white },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: spacing.sm + 2, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primaryBlue, borderColor: colors.primaryBlue },
  chipText: { ...typography.labelSm, color: colors.textSecondary },
  chipTextActive: { color: colors.white },
  submit: { marginTop: spacing.lg },
});
