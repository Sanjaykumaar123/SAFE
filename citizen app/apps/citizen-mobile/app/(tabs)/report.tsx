import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

/**
 * This screen is never actually seen — the tab bar intercepts the "Report"
 * tab press (see `(tabs)/_layout.tsx`) and launches `/report/camera`
 * directly for one-tap access (section 55). This is only a fallback for
 * the rare case something navigates here by route name directly (e.g. deep
 * link), so it just forwards on focus.
 */
export default function ReportTabFallback() {
  const authStatus = useAuthStore((s) => s.status);

  useFocusEffect(
    useCallback(() => {
      router.replace(authStatus === 'authenticated' ? '/report/camera' : '/(auth)/login');
    }, [authStatus])
  );

  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
