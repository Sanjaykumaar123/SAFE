/** §20/§56 — user detail + support actions (deactivate/reactivate/lock/
 * unlock/reset access). */
import { useLocalSearchParams } from 'expo-router';
import { KeyRound, Lock, ShieldCheck, ShieldOff, Unlock } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RoleBadge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PermissionGate } from '@/components/common/PermissionGate';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Permission } from '@/constants/permissions';
import { colors, spacing, typography } from '@/constants/theme';
import { useResetUserAccess, useSetUserStatus, useUserDetail } from '@/features/users/useUsers';
import { formatDateTime, formatRelativeTime } from '@/utils/format';
import type { AdminManagedUser } from '@/types/admin';

type Action = 'DEACTIVATE' | 'REACTIVATE' | 'LOCK' | 'UNLOCK' | 'RESET' | null;

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: user, isLoading, isError, error, refetch } = useUserDetail(id);
  const setStatus = useSetUserStatus();
  const resetAccess = useResetUserAccess();
  const [action, setAction] = useState<Action>(null);

  if (isLoading) return <LoadingState label="Loading user…" />;
  if (isError || !user) return <ErrorState message={(error as Error)?.message ?? 'User not found.'} onRetry={refetch} />;

  const nextStatus: Record<Exclude<Action, null>, AdminManagedUser['status'] | undefined> = {
    DEACTIVATE: 'DEACTIVATED',
    REACTIVATE: 'ACTIVE',
    LOCK: 'LOCKED',
    UNLOCK: 'ACTIVE',
    RESET: undefined,
  };

  const onConfirm = async () => {
    if (!action) return;
    if (action === 'RESET') await resetAccess.mutateAsync(user.id);
    else await setStatus.mutateAsync({ id: user.id, status: nextStatus[action]! });
    setAction(null);
  };

  return (
    <View style={styles.flex}>
      <ScreenHeader title={user.displayName} subtitle={user.role.replace(/_/g, ' ')} />
      <View style={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.badgeRow}>
            <RoleBadge label={user.role.replace(/_/g, ' ')} />
            <Text style={styles.statusText}>{user.status}</Text>
          </View>
          {user.cityName ? <Text style={styles.meta}>City: {user.cityName}</Text> : null}
          <Text style={styles.meta}>Joined {formatDateTime(user.createdAt)}</Text>
          {user.lastActiveAt ? <Text style={styles.meta}>Last active {formatRelativeTime(user.lastActiveAt)}</Text> : null}
          {user.reportCount !== undefined ? <Text style={styles.meta}>{user.reportCount} report(s) submitted</Text> : null}
        </Card>

        <PermissionGate permission={Permission.MANAGE_USERS}>
          <View style={styles.actionsGrid}>
            {user.status === 'ACTIVE' ? (
              <Button label="Deactivate" variant="outline" icon={<ShieldOff size={15} color={colors.primaryBlue} />} onPress={() => setAction('DEACTIVATE')} fullWidth={false} style={styles.actionButton} />
            ) : (
              <Button label="Reactivate" variant="outline" icon={<ShieldCheck size={15} color={colors.primaryBlue} />} onPress={() => setAction('REACTIVATE')} fullWidth={false} style={styles.actionButton} />
            )}
            {user.status === 'LOCKED' ? (
              <Button label="Unlock" variant="outline" icon={<Unlock size={15} color={colors.primaryBlue} />} onPress={() => setAction('UNLOCK')} fullWidth={false} style={styles.actionButton} />
            ) : (
              <Button label="Lock" variant="outline" icon={<Lock size={15} color={colors.primaryBlue} />} onPress={() => setAction('LOCK')} fullWidth={false} style={styles.actionButton} />
            )}
            <Button label="Reset Access" variant="outline" icon={<KeyRound size={15} color={colors.primaryBlue} />} onPress={() => setAction('RESET')} fullWidth={false} style={styles.actionButton} />
          </View>
        </PermissionGate>
      </View>

      <ConfirmDialog
        visible={action !== null}
        title={action === 'RESET' ? 'Reset access for this user?' : `${action?.charAt(0)}${action?.slice(1).toLowerCase()} this user?`}
        message="This action is logged to the audit trail."
        busy={setStatus.isPending || resetAccess.isPending}
        onConfirm={onConfirm}
        onCancel={() => setAction(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  card: { gap: spacing.xs },
  email: { ...typography.bodyLg, color: colors.text },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusText: { ...typography.labelMd, color: colors.textSecondary },
  meta: { ...typography.labelSm, color: colors.textSecondary },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionButton: { minWidth: '30%' },
});
