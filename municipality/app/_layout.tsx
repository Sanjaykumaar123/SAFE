import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { queryClient } from '@/services/api/queryClient';
import { useAuthStore } from '@/store/authStore';

export default function RootLayout() {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="hazard/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="hazard/evidence" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="repair/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="repair/assign" options={{ presentation: 'modal' }} />
            <Stack.Screen name="repair/progress" options={{ presentation: 'modal' }} />
            <Stack.Screen name="inspection/[hazardId]" options={{ presentation: 'card' }} />
            <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
            <Stack.Screen name="profile" options={{ presentation: 'card' }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
