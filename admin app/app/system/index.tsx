/** §34/§68 — System Health: all platform services with status + latency. */
import { router } from 'expo-router';
import { Database, HardDrive, Network } from 'lucide-react-native';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { HealthBadge } from '@/components/common/Badge';
import { Card } from '@/components/common/Card';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useSystemHealth } from '@/features/system/useSystem';

export default function SystemHealthScreen() {
  const { data: services } = useSystemHealth();

  return (
    <View style={styles.flex}>
      <ScreenHeader title="System Health" />
      <View style={styles.linksRow}>
        <TouchableOpacity style={styles.linkTile} onPress={() => router.push('/system/api')}>
          <Network size={16} color={colors.primaryBlue} />
          <Text style={styles.linkLabel}>API Monitoring</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkTile} onPress={() => router.push('/system/storage')}>
          <HardDrive size={16} color={colors.primaryBlue} />
          <Text style={styles.linkLabel}>Storage Health</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkTile} onPress={() => router.push('/data-quality')}>
          <Database size={16} color={colors.primaryBlue} />
          <Text style={styles.linkLabel}>Data Quality</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={services ?? []}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.name}>{item.name}</Text>
              <HealthBadge status={item.status} />
            </View>
            <View style={styles.row}>
              <Text style={styles.meta}>Latency: {item.latencyMs}ms</Text>
              <Text style={styles.meta}>Uptime: {item.uptimePct}%</Text>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  linksRow: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  linkTile: { flex: 1, alignItems: 'center', gap: 4, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.sm },
  linkLabel: { ...typography.labelSm, color: colors.text, textAlign: 'center' },
  listContent: { padding: spacing.md, paddingTop: 0, paddingBottom: spacing.xxl },
  card: { gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...typography.bodyMd, fontWeight: '700', color: colors.text },
  meta: { ...typography.labelSm, color: colors.textSecondary },
});
