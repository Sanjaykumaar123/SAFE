/** §49/§50 — Audit Log: who changed what, when, before/after, reason.
 * Read-only; ordinary admins can never delete an entry (§50). */
import { Search } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuditLogs } from '@/features/audit/useAuditLogs';
import { formatDateTime } from '@/utils/format';

export default function AuditLogsScreen() {
  const [query, setQuery] = useState('');
  const { data, isLoading, isError, error, refetch } = useAuditLogs({ query });

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Audit Logs" />
      <View style={styles.searchRow}>
        <Search size={16} color={colors.textSecondary} />
        <TextInput style={styles.searchInput} placeholder="Search actor, entity, action…" placeholderTextColor={colors.textSecondary} value={query} onChangeText={setQuery} />
      </View>

      {isLoading ? (
        <LoadingState label="Loading audit log…" />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message ?? 'Could not load audit logs.'} onRetry={refetch} />
      ) : !data?.items.length ? (
        <EmptyState title="No audit entries" />
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.actor}>{item.actorName}</Text>
                <Text style={styles.role}>{item.actorRole.replace(/_/g, ' ')}</Text>
              </View>
              <Text style={styles.action}>
                {item.action.replace(/_/g, ' ')} · {item.entityType} {item.entityId}
              </Text>
              {item.before || item.after ? (
                <Text style={styles.change}>
                  {item.before ?? '—'} → {item.after ?? '—'}
                </Text>
              ) : null}
              {item.reason ? <Text style={styles.reason}>Reason: {item.reason}</Text> : null}
              <View style={styles.footerRow}>
                <Text style={styles.meta}>{item.cityName ?? 'Platform'}</Text>
                <Text style={styles.meta}>{formatDateTime(item.createdAt)}</Text>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actor: { ...typography.bodyMd, fontWeight: '700', color: colors.text },
  role: { ...typography.caps, color: colors.textSecondary },
  action: { ...typography.labelSm, color: colors.text },
  change: { ...typography.numeric, fontSize: 12, color: colors.primaryBlue },
  reason: { ...typography.labelSm, color: colors.textSecondary, fontStyle: 'italic' },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  meta: { ...typography.labelSm, color: colors.textSecondary },
});
