import { router } from 'expo-router';
import { LogOut, Shield } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useMunicipalityStore } from '@/store/municipalityStore';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const officer = useAuthStore((s) => s.officer);
  const logout = useAuthStore((s) => s.logout);
  const authorizedCities = useMunicipalityStore((s) => s.authorizedCities);

  const onLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  if (!officer) return null;

  return (
    <View style={[styles.flex, { paddingTop: insets.top + spacing.sm }]}>
      <ScreenHeader title="Profile" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>{officer.fullName.slice(0, 1)}</Text>
        </View>
        <Text style={styles.name}>{officer.fullName}</Text>
        <Text style={styles.email}>{officer.email}</Text>

        <Card style={styles.card}>
          <Row label="Municipality" value={`${officer.municipalityName} (${officer.municipalityCode})`} />
          <Row label="Role" value={officer.officerRole.replace(/_/g, ' ')} />
          <Row label="Authorized cities" value={authorizedCities.map((c) => c.name).join(', ') || '—'} />
        </Card>

        <Card style={styles.card}>
          <View style={styles.permHeader}>
            <Shield size={16} color={colors.primaryBlue} />
            <Text style={styles.permTitle}>Permissions</Text>
          </View>
          {officer.permissions.map((p) => (
            <Text key={p} style={styles.permItem}>
              • {p.replace(/_/g, ' ')}
            </Text>
          ))}
        </Card>

        <Button label="Log Out" variant="outline" icon={<LogOut size={16} color={colors.primaryBlue} />} onPress={onLogout} style={styles.logout} />
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, alignItems: 'center', paddingBottom: spacing.xxl },
  avatarLarge: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryBlue, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  avatarLargeText: { ...typography.headlineLg, color: colors.white },
  name: { ...typography.headlineMd, color: colors.deepNavy, marginTop: spacing.sm },
  email: { ...typography.bodyMd, color: colors.textSecondary },
  card: { width: '100%', marginTop: spacing.md, gap: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { ...typography.bodyMd, color: colors.textSecondary },
  rowValue: { ...typography.bodyMd, color: colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  permHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  permTitle: { ...typography.bodyLg, color: colors.text, fontWeight: '700' },
  permItem: { ...typography.bodyMd, color: colors.textSecondary },
  logout: { marginTop: spacing.lg, width: '100%' },
});
