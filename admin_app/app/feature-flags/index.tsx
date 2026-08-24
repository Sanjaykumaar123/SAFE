/** §39 — Feature Flags: backend-controlled, connected apps fetch from
 * API — never hardcoded client-side. */
import { FlatList, StyleSheet, Switch, Text, View } from 'react-native';

import { PermissionGate } from '@/components/common/PermissionGate';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Permission } from '@/constants/permissions';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useFeatureFlags, useToggleFeatureFlag } from '@/features/platform/usePlatform';

export default function FeatureFlagsScreen() {
  const { data: flags } = useFeatureFlags();
  const toggle = useToggleFeatureFlag();

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Feature Flags" />
      <FlatList
        data={flags ?? []}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.body}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.description}>{item.description}</Text>
              <Text style={styles.target}>
                Target: {item.target}
                {item.targetValue ? ` · ${item.targetValue}` : ''}
              </Text>
            </View>
            <PermissionGate permission={Permission.MANAGE_FEATURE_FLAGS} fallback={<Text style={styles.readOnly}>{item.enabled ? 'ON' : 'OFF'}</Text>}>
              <Switch
                value={item.enabled}
                onValueChange={(next) => toggle.mutate({ key: item.key, enabled: next, version: item.version })}
                trackColor={{ true: colors.primaryBlue, false: colors.border }}
              />
            </PermissionGate>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm + 2 },
  body: { flex: 1, gap: 2 },
  label: { ...typography.bodyMd, fontWeight: '700', color: colors.text },
  description: { ...typography.labelSm, color: colors.textSecondary },
  target: { ...typography.labelSm, color: colors.textSecondary, fontStyle: 'italic' },
  readOnly: { ...typography.labelMd, color: colors.textSecondary },
});
