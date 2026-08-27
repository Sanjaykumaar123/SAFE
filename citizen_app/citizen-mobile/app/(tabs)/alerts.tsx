import { BellOff } from 'lucide-react-native';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { NotificationIcon } from '@/components/common/NotificationIcon';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useMarkNotificationRead, useNotifications } from '@/features/alerts/useNotifications';
import { toApiError } from '@/services/api/queryClient';
import { formatRelativeTime } from '@/utils/distance';
import type { AppNotification } from '@/types';

export default function AlertsScreen() {
  const { data, isPending, isError, error, refetch, isFetching } = useNotifications();
  const markRead = useMarkNotificationRead();

  function handlePress(notification: AppNotification) {
    if (!notification.isRead) markRead.mutate(notification.id);
    if (notification.relatedReportId) {
      router.push(`/reports/${notification.relatedReportId}`);
    } else if (notification.relatedHazardId) {
      router.push(`/hazard/${notification.relatedHazardId}`);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Alerts</Text>
      </View>

      {isPending ? (
        <LoadingState label="Loading alerts…" />
      ) : isError ? (
        <ErrorState message={toApiError(error).message} onRetry={() => refetch()} />
      ) : !data?.items.length ? (
        <EmptyState icon={<BellOff size={40} color={colors.textSecondary} />} title="No alerts yet" message="We'll notify you about nearby hazards and updates to your reports." />
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={isFetching}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handlePress(item)}
              style={[styles.card, !item.isRead && styles.cardUnread]}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.body}`}
            >
              <View style={styles.iconCircle}>
                <NotificationIcon type={item.type} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardText} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={styles.cardTime}>{formatRelativeTime(item.createdAt)}</Text>
              </View>
              {!item.isRead && <View style={styles.unreadDot} />}
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { ...typography.headlineLg, color: colors.deepNavy },
  list: { padding: spacing.lg, gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardUnread: { borderColor: colors.primaryBlue, backgroundColor: `${colors.primaryBlue}08` },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { ...typography.labelMd, color: colors.text },
  cardText: { ...typography.bodyMd, color: colors.textSecondary },
  cardTime: { ...typography.labelSm, color: colors.textSecondary, marginTop: 2 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primaryBlue, marginTop: 6 },
});
