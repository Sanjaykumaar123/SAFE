import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/common/Card';
import { MenuRow } from '@/components/common/MenuRow';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { colors, spacing } from '@/constants/theme';
import { useSettingsStore } from '@/store/settingsStore';

const OPTIONS: { key: 'nearbyHazards' | 'reportUpdates' | 'roadResolved' | 'criticalHazards' | 'system'; label: string; subtitle: string }[] = [
  { key: 'criticalHazards', label: 'Critical hazards', subtitle: 'Urgent alerts about dangerous road conditions nearby' },
  { key: 'nearbyHazards', label: 'Nearby hazards', subtitle: 'New hazards reported close to your saved locations' },
  { key: 'reportUpdates', label: 'Report updates', subtitle: 'Status changes on reports you submitted' },
  { key: 'roadResolved', label: 'Road resolved', subtitle: 'When a hazard you reported or follow is fixed' },
  { key: 'system', label: 'System messages', subtitle: 'App updates and account notices' },
];

export default function NotificationSettingsScreen() {
  const notifications = useSettingsStore((s) => s.notifications);
  const setNotificationSetting = useSettingsStore((s) => s.setNotificationSetting);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Notifications" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card padded={false}>
          {OPTIONS.map((option) => (
            <MenuRow
              key={option.key}
              label={option.label}
              subtitle={option.subtitle}
              switchValue={notifications[option.key]}
              onSwitchChange={(value) => setNotificationSetting(option.key, value)}
            />
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg },
});
