import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useNetworkSync } from '@/hooks/useNetworkSync';
import { queryClient } from '@/services/api/queryClient';
import { useAuthStore } from '@/store/authStore';

function NetworkSyncGate() {
  // Flushes any offline-queued reports as soon as connectivity returns
  // (section 34). Rendered here so it's always mounted, everywhere.
  useNetworkSync();
  return null;
}

export default function RootLayout() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          {/* Light content — Android edge-to-edge (app.config.js) already
           * draws every screen under the status bar without a translucent
           * prop here. */}
          <StatusBar style="light" />
          <NetworkSyncGate />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="hazard/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="hazard/evidence" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="report/camera" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
            <Stack.Screen name="report/analyze" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
            <Stack.Screen name="reports/index" />
            <Stack.Screen name="reports/[id]" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
