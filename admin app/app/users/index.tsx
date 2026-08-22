/** §20/§56/§84 — cross-role User Management, data-minimized (email +
 * activity only, no private citizen data surfaced without cause). */
import { router } from 'expo-router';
import { Search } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

import { RoleBadge } from '@/components/common/Badge';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { TabPills } from '@/components/admin/TabPills';
import { UserRole } from '@/constants/enums';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useUsers } from '@/features/users/useUsers';
import { formatRelativeTime } from '@/utils/format';
import type { AdminManagedUser } from '@/types/admin';

const ROLE_TABS = ['ALL', ...Object.values(UserRole)] as const;
const STATUS_COLOR: Record<AdminManagedUser['status'], string> = { ACTIVE: colors.green, DEACTIVATED: colors.textSecondary, LOCKED: colors.critical, PENDING: colors.warning };

export default function UsersScreen() {
  const [role, setRole] = useState<(typeof ROLE_TABS)[number]>('ALL');
  const [query, setQuery] = useState('');
  const { data, isLoading, isError, error, refetch } = useUsers({ role: role === 'ALL' ? undefined : role, query });

  return (
    <View style={styles.flex}>
      <ScreenHeader title="User Management" />
      <View style={styles.searchRow}>
        <Search size={16} color={colors.textSecondary} />
        <TextInput style={styles.searchInput} placeholder="Search name or email…" placeholderTextColor={colors.textSecondary} value={query} onChangeText={setQuery} />
      </View>
      <TabPills tabs={ROLE_TABS} value={role} onChange={setRole} />

      {isLoading ? (
        <LoadingState label="Loading users…" />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message ?? 'Could not load users.'} onRetry={refetch} />
      ) : !data?.items.length ? (
        <EmptyState title="No users found" />
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/users/${item.id}`)} style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.displayName}
                </Text>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[item.status] }]} />
              </View>
              <Text style={styles.email} numberOfLines={1}>
                {item.email}
              </Text>
              <View style={styles.footerRow}>
                <RoleBadge label={item.role.replace(/_/g, ' ')} />
                {item.cityName ? <Text style={styles.city}>{item.cityName}</Text> : null}
                <Text style={styles.lastActive}>{item.lastActiveAt ? formatRelativeTime(item.lastActiveAt) : '—'}</Text>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.md, marginBottom: spacing.xs, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 8 },
  searchInput: { flex: 1, ...typography.bodyMd, color: colors.text },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: { gap: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...typography.bodyMd, fontWeight: '700', color: colors.text, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  email: { ...typography.labelSm, color: colors.textSecondary },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  city: { ...typography.labelSm, color: colors.textSecondary },
  lastActive: { ...typography.labelSm, color: colors.textSecondary, marginLeft: 'auto' },
});
