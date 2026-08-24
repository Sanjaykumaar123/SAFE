/** §41 — Settings: app info + session/device management placeholders. */
import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { DEMO_MODE } from '@/constants/config';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function SettingsScreen() {
  return (
    <View style={styles.flex}>
      <ScreenHeader title="Settings" />
      <View style={styles.content}>
        <Card style={styles.card}>
          <Row label="App version" value={Constants.expoConfig?.version ?? '1.0.0'} />
          <Row label="Environment" value={DEMO_MODE ? 'Demo (offline dataset)' : 'Live backend'} />
          <Row label="Build" value="SafePath Central Admin" />
        </Card>

        <Text style={styles.sectionLabel}>SECURITY</Text>
        <Card style={styles.card}>
          <Row label="MFA" value="Ready (see login flow)" />
          <Row label="Session expiration" value="Access token auto-refreshes; inactive sessions expire" />
        </Card>

        <View style={styles.demoBanner}>
          <Text style={styles.demoBannerText}>{DEMO_MODE ? 'Running against the bundled demo dataset — no live backend connection required.' : 'Connected to the live SafePath backend.'}</Text>
        </View>
      </View>
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
  content: { padding: spacing.md, gap: spacing.xs },
  card: { gap: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { ...typography.bodyMd, color: colors.textSecondary, flex: 1 },
  rowValue: { ...typography.bodyMd, color: colors.text, fontWeight: '600', flex: 1, textAlign: 'right' },
  sectionLabel: { ...typography.caps, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs },
  demoBanner: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.sm + 2, marginTop: spacing.md },
  demoBannerText: { ...typography.labelSm, color: colors.textSecondary },
});
