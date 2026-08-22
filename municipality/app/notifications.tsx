import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { colors, spacing, typography } from '@/constants/theme';
import { useMarkNotificationRead, useNotifications } from '@/features/notifications/useNotifications';
import type { Notification } from '@/types/notification';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch } = useNotifications();
  const markRead = useMarkNotificationRead();

  return (
    <View style={[styles.flex, { paddingTop: insets.top + spacing.sm }]}>
      <ScreenHeader title="Notifications" />
      {isLoading ? <LoadingState label="Loading notifications…" /> : null}
      {isError ? <ErrorState message={(error as Error)?.message ?? 'Notifications unavailable.'} onRetry={refetch} /> : null}
      {data ? (
        <FlatList
          data={data.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <NotificationRow notification={item} onPress={() => handlePress(item, markRead.mutate)} />}
          ListEmptyComponent={<EmptyState title="No notifications" message="You're all caught up." />}
        />
      ) : null}
    </View>
  );
}

function handlePress(notification: Notification, markRead: (id: string) => void) {
  if (!notification.isRead) markRead(notification.id);
  if (notification.relatedHazardId) router.push(`/hazard/${notification.relatedHazardId}`);
}

function NotificationRow({ notification, onPress }: { notification: Notification; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={[styles.card, !notification.isRead && styles.cardUnread]}>
        <Text style={styles.cardTitle}>{notification.title}</Text>
        <Text style={styles.cardBody}>{notification.body}</Text>
        <Text style={styles.cardTime}>{new Date(notification.createdAt).toLocaleString()}</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.md },
  listContent: { paddingBottom: spacing.xxl, gap: spacing.sm, paddingTop: spacing.sm },
  card: { marginBottom: spacing.sm },
  cardUnread: { borderColor: colors.primaryBlue, borderWidth: 1.5, backgroundColor: `${colors.primaryBlue}08` },
  cardTitle: { ...typography.bodyLg, color: colors.text, fontWeight: '700' },
  cardBody: { ...typography.bodyMd, color: colors.textSecondary, marginTop: 2 },
  cardTime: { ...typography.labelSm, color: colors.textSecondary, marginTop: spacing.xs },
});
