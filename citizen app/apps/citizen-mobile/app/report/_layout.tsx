import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

/**
 * The report creation flow (section 14): camera -> preview -> analyze ->
 * result -> success, all sharing draft state via `store/reportStore.ts`
 * instead of route params. `gestureEnabled: false` on analyze/result stops
 * a swipe-back from abandoning an in-flight AI analysis or a reviewed
 * result mid-flow.
 */
export default function ReportLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="camera" options={{ animation: 'fade' }} />
      <Stack.Screen name="preview" />
      <Stack.Screen name="analyze" options={{ gestureEnabled: false }} />
      <Stack.Screen name="result" options={{ gestureEnabled: false }} />
      <Stack.Screen name="success" options={{ gestureEnabled: false }} />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
