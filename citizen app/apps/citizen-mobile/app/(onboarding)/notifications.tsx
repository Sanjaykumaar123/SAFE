import { Bell } from 'lucide-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PermissionPrompt } from '@/components/common/PermissionPrompt';
import { colors } from '@/constants/theme';
import { notificationService } from '@/services/notifications/notificationService';
import { useSettingsStore } from '@/store/settingsStore';

export default function NotificationsPermissionScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);

  function finish() {
    completeOnboarding();
    router.replace('/(auth)/login');
  }

  async function handleAllow() {
    setIsSubmitting(true);
    await notificationService.requestPermission();
    await notificationService.registerForPushNotifications();
    setIsSubmitting(false);
    finish();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <PermissionPrompt
        icon={<Bell size={44} color={colors.white} />}
        title="Stay Informed"
        explanation="Get alerts about critical road hazards and updates to your reports."
        progressTotal={3}
        progressIndex={2}
        isSubmitting={isSubmitting}
        onAllow={handleAllow}
        onNotNow={finish}
      />
    </SafeAreaView>
  );
}
