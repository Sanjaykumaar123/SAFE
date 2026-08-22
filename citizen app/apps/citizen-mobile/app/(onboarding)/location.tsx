import { MapPin } from 'lucide-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PermissionPrompt } from '@/components/common/PermissionPrompt';
import { colors } from '@/constants/theme';
import { locationService } from '@/services/location/locationService';

export default function LocationPermissionScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAllow() {
    setIsSubmitting(true);
    await locationService.requestPermission();
    setIsSubmitting(false);
    router.push('/(onboarding)/notifications');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      <PermissionPrompt
        icon={<MapPin size={44} color={colors.white} />}
        title="Enable Location"
        explanation="SafePath uses your location to show nearby road hazards and place reports accurately."
        progressTotal={3}
        progressIndex={1}
        isSubmitting={isSubmitting}
        onAllow={handleAllow}
        allowLabel="Allow Location"
        onNotNow={() => router.push('/(onboarding)/notifications')}
      />
    </SafeAreaView>
  );
}
