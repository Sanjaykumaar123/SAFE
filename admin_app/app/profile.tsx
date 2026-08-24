/** §41 — Profile: admin identity, role, permissions, session. */
import { LogOut } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { RoleBadge } from '@/components/common/Badge';
import { Card } from '@/components/common/Card';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ADMIN_ROLE_LABELS } from '@/constants/enums';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { formatRelativeTime } from '@/utils/format';

export default function ProfileScreen() {
  const admin = useAuthStore((s) => s.admin);
  const logout = useAuthStore((s) => s.logout);

  if (!admin) return null;

  return (
    <View style={styles.flex}>
      <ScreenHeader title="Profile" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{admin.name.slice(0, 1)}</Text>
          </View>
          <Text style={styles.name}>{admin.name}</Text>
          <Text style={styles.email}>{admin.email}</Text>
          <RoleBadge label={ADMIN_ROLE_LABELS[admin.role]} />
        </View>

        <Card style={styles.card}>
          <Text style={styles.label}>Admin ID</Text>
          <Text style={styles.value}>{admin.adminId}</Text>
          <Text style={styles.label}>Access scope</Text>
          <Text style={styles.value}>{Array.isArray(admin.accessibleCityIds) ? `${admin.accessibleCityIds.length} cities` : 'All cities'}</Text>
          {admin.lastLoginAt ? (
            <>
              <Text style={styles.label}>Last login</Text>
              <Text style={styles.value}>{formatRelativeTime(admin.lastLoginAt)}</Text>
            </>
          ) : null}
        </Card>

        <Text style={styles.sectionLabel}>PERMISSIONS ({(admin.permissions ?? []).length})</Text>
        <View style={styles.permissionsWrap}>
          {(admin.permissions ?? []).map((p) => (
            <View key={p} style={styles.permissionChip}>
              <Text style={styles.permissionText}>{p.replace(/_/g, ' ')}</Text>
            </View>
          ))}
        </View>

        <Button label="Sign Out" variant="danger" icon={<LogOut size={16} color={colors.white} />} onPress={() => logout()} style={styles.logoutButton} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xxl },
  avatarWrap: { alignItems: 'center', gap: 4, paddingVertical: spacing.lg },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.deepNavy, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  avatarText: { ...typography.headlineLg, color: colors.white },
  name: { ...typography.headlineMd, color: colors.deepNavy },
  email: { ...typography.bodyMd, color: colors.textSecondary },
  card: { gap: 2 },
  label: { ...typography.caps, color: colors.textSecondary, marginTop: spacing.xs },
  value: { ...typography.bodyMd, color: colors.text },
  sectionLabel: { ...typography.caps, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs },
  permissionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  permissionChip: { backgroundColor: colors.surfaceMuted, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  permissionText: { ...typography.labelSm, color: colors.text },
  logoutButton: { marginTop: spacing.xl },
});
