import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/common/Card';
import { MenuRow } from '@/components/common/MenuRow';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { colors, spacing, typography } from '@/constants/theme';
import { useSettingsStore } from '@/store/settingsStore';

export default function PrivacyScreen() {
  const locationSharingEnabled = useSettingsStore((s) => s.locationSharingEnabled);
  const setLocationSharingEnabled = useSettingsStore((s) => s.setLocationSharingEnabled);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Privacy" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card padded={false}>
          <MenuRow
            label="Location sharing"
            subtitle="Used only when reporting a hazard or viewing the map — never collected in the background"
            switchValue={locationSharingEnabled}
            onSwitchChange={setLocationSharingEnabled}
          />
        </Card>
        <Text style={styles.note}>
          SafePath only accesses your location when you actively use the map or submit a report. We never track your location in the
          background. Photos you submit are used solely to assess road conditions and are visible to other citizens as part of the
          public hazard report.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md },
  note: { ...typography.bodyMd, color: colors.textSecondary },
});
