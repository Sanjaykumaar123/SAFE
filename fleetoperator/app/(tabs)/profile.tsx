import { router } from 'expo-router';
import { Car, LogOut, Mail, ShieldCheck } from 'lucide-react-native';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

/** §55 — operator profile. Documents/support/settings screens are not
 * built out beyond this summary (see DEFERRED.md) — logout is the one
 * action that must work. */
export default function ProfileScreen() {
  const operator = useAuthStore((s) => s.operator);
  const logout = useAuthStore((s) => s.logout);

  if (!operator) return null;

  const handleLogout = () => {
    Alert.alert('Log out?', 'You will need to sign in again to resume collection.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{operator.fullName.charAt(0)}</Text>
        </View>
        <Text style={styles.name}>{operator.fullName}</Text>
        <Text style={styles.operatorCode}>{operator.operatorCode}</Text>
      </View>

      <Card style={styles.section}>
        <Row icon={<Mail size={18} color={colors.textSecondary} />} label="Email" value={operator.email} />
        <Row icon={<ShieldCheck size={18} color={colors.textSecondary} />} label="City / Zone" value={`${operator.cityName ?? '—'} / ${operator.zoneName ?? '—'}`} />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Vehicle</Text>
        {operator.vehicle ? (
          <Row icon={<Car size={18} color={colors.textSecondary} />} label={operator.vehicle.vehicleType ?? 'Vehicle'} value={operator.vehicle.registrationNumber} />
        ) : (
          <Text style={styles.emptyText}>No vehicle currently assigned.</Text>
        )}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <Text style={styles.emptyText}>Vehicle issue reporting and document management are coming soon.</Text>
      </Card>

      <Button label="Log Out" variant="danger" icon={<LogOut size={18} color={colors.white} />} onPress={handleLogout} />
    </ScrollView>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.row}>
      {icon}
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  header: { alignItems: 'center', gap: spacing.xs, marginVertical: spacing.md },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.deepNavy, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: colors.white, fontSize: 28, fontWeight: '700' },
  name: { ...typography.headlineMd, color: colors.deepNavy },
  operatorCode: { ...typography.bodyMd, color: colors.textSecondary },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.labelMd, color: colors.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowText: { flex: 1 },
  rowLabel: { ...typography.labelSm, color: colors.textSecondary },
  rowValue: { ...typography.bodyMd, color: colors.text, fontWeight: '600' },
  emptyText: { ...typography.bodyMd, color: colors.textSecondary },
});
