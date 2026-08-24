/** §10 — "More" groups everything the primary tab bar doesn't have room
 * for: Users, Cities, AI, System Health, Data Quality, Feature Flags,
 * Notifications, Audit Logs, Settings, Support, Profile. Every entry is
 * gated by `PermissionGate` (§07) so an ANALYST, for example, never even
 * sees the AI/feature-flag/system tiles it can't act on (§86). */
import { router } from 'expo-router';
import {
  BadgeCheck,
  Bell,
  BookOpen,
  Building2,
  Cpu,
  Flag,
  HelpCircle,
  LogOut,
  ScrollText,
  Settings,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PermissionGate } from '@/components/common/PermissionGate';
import { RoleBadge } from '@/components/common/Badge';
import { ADMIN_ROLE_LABELS } from '@/constants/enums';
import { Permission } from '@/constants/permissions';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const admin = useAuthStore((s) => s.admin);
  const logout = useAuthStore((s) => s.logout);

  return (
    <ScrollView style={[styles.flex, { paddingTop: insets.top }]} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.profileCard} onPress={() => router.push('/profile')}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{admin?.name.slice(0, 1) ?? 'A'}</Text>
        </View>
        <View style={styles.profileBody}>
          <Text style={styles.profileName}>{admin?.name}</Text>
          <Text style={styles.profileEmail}>{admin?.email}</Text>
          {admin ? <RoleBadge label={ADMIN_ROLE_LABELS[admin.role]} /> : null}
        </View>
      </TouchableOpacity>

      <Section title="DATA & GOVERNANCE">
        <PermissionGate permission={Permission.MANAGE_USERS}>
          <MenuTile icon={<Users size={18} color={colors.primaryBlue} />} label="Users" onPress={() => router.push('/users')} />
        </PermissionGate>
        <PermissionGate permission={Permission.MANAGE_CITIES}>
          <MenuTile icon={<Building2 size={18} color={colors.primaryBlue} />} label="Cities" onPress={() => router.push('/cities')} />
        </PermissionGate>
        <PermissionGate permission={Permission.VIEW_AUDIT_LOG}>
          <MenuTile icon={<ScrollText size={18} color={colors.primaryBlue} />} label="Audit Logs" onPress={() => router.push('/audit-logs')} />
        </PermissionGate>
      </Section>

      <Section title="AI & PLATFORM">
        <PermissionGate permission={Permission.MANAGE_AI}>
          <MenuTile icon={<Cpu size={18} color={colors.primaryBlue} />} label="AI Control Center" onPress={() => router.push('/ai')} />
        </PermissionGate>
        <PermissionGate permission={Permission.MANAGE_SYSTEM}>
          <MenuTile icon={<ShieldCheck size={18} color={colors.primaryBlue} />} label="System Health" onPress={() => router.push('/system')} />
        </PermissionGate>
        <PermissionGate permission={Permission.MANAGE_FEATURE_FLAGS}>
          <MenuTile icon={<Flag size={18} color={colors.primaryBlue} />} label="Feature Flags" onPress={() => router.push('/feature-flags')} />
        </PermissionGate>
        <PermissionGate permission={Permission.MANAGE_SYSTEM}>
          <MenuTile icon={<Smartphone size={18} color={colors.primaryBlue} />} label="App Versions & Maintenance" onPress={() => router.push('/app-versions')} />
        </PermissionGate>
        <MenuTile icon={<BadgeCheck size={18} color={colors.primaryBlue} />} label="Data Quality Center" onPress={() => router.push('/data-quality')} />
      </Section>

      <Section title="ACCOUNT">
        <MenuTile icon={<Bell size={18} color={colors.primaryBlue} />} label="Notifications" onPress={() => router.push('/notifications')} />
        <MenuTile icon={<Settings size={18} color={colors.primaryBlue} />} label="Settings" onPress={() => router.push('/settings')} />
        <MenuTile icon={<HelpCircle size={18} color={colors.primaryBlue} />} label="Support" onPress={() => router.push('/support')} />
        <MenuTile icon={<BookOpen size={18} color={colors.primaryBlue} />} label="Profile" onPress={() => router.push('/profile')} />
      </Section>

      <TouchableOpacity style={styles.logoutRow} onPress={() => logout()}>
        <LogOut size={18} color={colors.critical} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.grid}>{children}</View>
    </View>
  );
}

function MenuTile({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.tile} onPress={onPress}>
      <View style={styles.tileIcon}>{icon}</View>
      <Text style={styles.tileLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  profileCard: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.deepNavy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.headlineMd, color: colors.white },
  profileBody: { flex: 1, gap: 2 },
  profileName: { ...typography.headlineMd, fontSize: 15, color: colors.deepNavy },
  profileEmail: { ...typography.labelSm, color: colors.textSecondary },
  section: { gap: spacing.xs },
  sectionTitle: { ...typography.caps, color: colors.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tile: { width: '31%', minWidth: 100, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.sm + 2, alignItems: 'center', gap: 6 },
  tileIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${colors.primaryBlue}14`, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { ...typography.labelSm, color: colors.text, textAlign: 'center' },
  logoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md, marginTop: spacing.sm },
  logoutText: { ...typography.labelMd, color: colors.critical },
});
