/** §38/§58 — Admin notification inbox with priority levels. */
import { router } from 'expo-router';
import { Megaphone } from 'lucide-react-native';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { EmptyState } from '@/components/common/EmptyState';
import { PermissionGate } from '@/components/common/PermissionGate';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { NotificationPriority } from '@/constants/enums';
import { Permission } from '@/constants/permissions';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useMarkNotificationRead, useNotifications } from '@/features/notifications/useNotifications';
import { formatRelativeTime } from '@/utils/format';
import type { AdminNotification } from '@/types/admin';

const PRIORITY_COLOR: Record<AdminNotification['priority'], string> = {
  [NotificationPriority.CRITICAL]: colors.critical,
  [NotificationPriority.HIGH]: '#F97316',
  [NotificationPriority.MEDIUM]: colors.warning,
  [NotificationPriority.INFO]: colors.textSecondary,
};

export default function NotificationsScreen() {
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();

  return (
    <View style={styles.flex}>
      <ScreenHeader
        title="Notifications"
        right={
          <PermissionGate permission={Permission.MANAGE_NOTIFICATIONS}>
            <TouchableOpacity onPress={() => router.push('/notifications/compose')} accessibilityLabel="New announcement">
              <Megaphone size={20} color={colors.primaryBlue} />
            </TouchableOpacity>
          </PermissionGate>
        }
      />

      {!data?.length ? (
        <EmptyState title="No notifications" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.card, !item.read && styles.cardUnread]} onPress={() => markRead.mutate(item.id)}>
              <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOR[item.priority] }]} />
              <View style={styles.body}>
                <View style={styles.headerRow}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.priorityLabel, { color: PRIORITY_COLOR[item.priority] }]}>{item.priority}</Text>
                </View>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.meta}>{item.target} · {formatRelativeTime(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm + 2, opacity: 0.75 },
  cardUnread: { opacity: 1, borderColor: colors.primaryBlue },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  body: { flex: 1, gap: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { ...typography.bodyMd, fontWeight: '700', color: colors.text, flex: 1 },
  priorityLabel: { ...typography.caps },
  message: { ...typography.bodyMd, color: colors.textSecondary },
  meta: { ...typography.labelSm, color: colors.textSecondary },
});
