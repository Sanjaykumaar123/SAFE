import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { queryClient } from '@/services/api/queryClient';
import { useAuthStore } from '@/store/authStore';
import { useLocationStore } from '@/store/locationStore';

export default function RootLayout() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const hydrateRecent = useLocationStore((s) => s.hydrateRecent);

  useEffect(() => {
    bootstrap();
    hydrateRecent();
  }, [bootstrap, hydrateRecent]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="location-search" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="hazard/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="hazard/merge" options={{ presentation: 'modal' }} />
            <Stack.Screen name="reports/index" options={{ presentation: 'card' }} />
            <Stack.Screen name="users/index" options={{ presentation: 'card' }} />
            <Stack.Screen name="users/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="cities/index" options={{ presentation: 'card' }} />
            <Stack.Screen name="cities/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="municipality/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="fleet/vehicle/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="fleet/operators" options={{ presentation: 'card' }} />
            <Stack.Screen name="fleet/operator/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="fleet/quality" options={{ presentation: 'card' }} />
            <Stack.Screen name="fleet/payments" options={{ presentation: 'card' }} />
            <Stack.Screen name="ai/index" options={{ presentation: 'card' }} />
            <Stack.Screen name="ai/config" options={{ presentation: 'modal' }} />
            <Stack.Screen name="ai/models" options={{ presentation: 'card' }} />
            <Stack.Screen name="ai/performance" options={{ presentation: 'card' }} />
            <Stack.Screen name="system/index" options={{ presentation: 'card' }} />
            <Stack.Screen name="system/api" options={{ presentation: 'card' }} />
            <Stack.Screen name="system/storage" options={{ presentation: 'card' }} />
            <Stack.Screen name="data-quality/index" options={{ presentation: 'card' }} />
            <Stack.Screen name="data-quality/anomalies" options={{ presentation: 'card' }} />
            <Stack.Screen name="notifications/index" options={{ presentation: 'card' }} />
            <Stack.Screen name="notifications/compose" options={{ presentation: 'modal' }} />
            <Stack.Screen name="feature-flags/index" options={{ presentation: 'card' }} />
            <Stack.Screen name="app-versions/index" options={{ presentation: 'card' }} />
            <Stack.Screen name="audit-logs/index" options={{ presentation: 'card' }} />
            <Stack.Screen name="search/index" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="profile" options={{ presentation: 'card' }} />
            <Stack.Screen name="settings" options={{ presentation: 'card' }} />
            <Stack.Screen name="support" options={{ presentation: 'card' }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
