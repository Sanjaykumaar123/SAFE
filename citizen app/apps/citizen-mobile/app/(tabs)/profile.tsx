import {
  Bell,
  CircleHelp,
  FileText,
  Info,
  LogOut,
  MapPin,
  Shield,
  User as UserIcon,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/common/Card';
import { MenuRow } from '@/components/common/MenuRow';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const logout = useAuthStore((s) => s.logout);
  const disableGuestMode = useSettingsStore((s) => s.disableGuestMode);

  function handleLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          disableGuestMode();
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  const isGuest = status !== 'authenticated';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Profile</Text>

        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <UserIcon size={28} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{isGuest ? 'Guest' : (user?.fullName ?? 'Citizen')}</Text>
            <Text style={styles.meta}>{isGuest ? 'Not logged in' : user?.email}</Text>
            {!isGuest && user?.phone ? <Text style={styles.meta}>{user.phone}</Text> : null}
            {!isGuest && user?.city ? <Text style={styles.meta}>{user.city}</Text> : null}
          </View>
        </Card>

        {isGuest ? (
          <Card>
            <MenuRow
              icon={<UserIcon size={20} color={colors.primaryBlue} />}
              label="Log in or create an account"
              subtitle="Report hazards and track them over time"
              onPress={() => router.push('/(auth)/login')}
            />
          </Card>
        ) : (
          <Card padded={false} style={styles.menuCard}>
            <MenuRow icon={<FileText size={20} color={colors.text} />} label="My Reports" onPress={() => router.push('/reports')} />
            <View style={styles.divider} />
            <MenuRow icon={<MapPin size={20} color={colors.text} />} label="Saved Locations" onPress={() => router.push('/settings/saved-locations')} />
          </Card>
        )}

        <Card padded={false} style={styles.menuCard}>
          <MenuRow icon={<Bell size={20} color={colors.text} />} label="Notifications" onPress={() => router.push('/settings/notifications')} />
          <View style={styles.divider} />
          <MenuRow icon={<Shield size={20} color={colors.text} />} label="Privacy" onPress={() => router.push('/settings/privacy')} />
          <View style={styles.divider} />
          <MenuRow icon={<CircleHelp size={20} color={colors.text} />} label="Help & Support" onPress={() => router.push('/settings/help')} />
          <View style={styles.divider} />
          <MenuRow icon={<Info size={20} color={colors.text} />} label="About SafePath" onPress={() => router.push('/settings/about')} />
        </Card>

        {!isGuest && (
          <Card padded={false} style={styles.menuCard}>
            <MenuRow icon={<LogOut size={20} color={colors.critical} />} label="Logout" destructive onPress={handleLogout} />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { ...typography.headlineLg, color: colors.deepNavy },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.deepNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.headlineMd, color: colors.text },
  meta: { ...typography.bodyMd, color: colors.textSecondary },
  menuCard: { overflow: 'hidden' },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: spacing.md + 24 + spacing.sm },
});
