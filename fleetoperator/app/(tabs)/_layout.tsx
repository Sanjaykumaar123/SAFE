import { Redirect, Tabs } from 'expo-router';
import { Home, User, Wallet, History } from 'lucide-react-native';

import { LoadingState } from '@/components/common/LoadingState';
import { colors } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

/** §64 — auth-gated the same way every other SafePath app's tab layout is.
 * Fleet operators don't switch cities (one operator = one city/vehicle
 * assignment, §14), so unlike municipality's tabs layout there's no extra
 * context-hydration step here beyond auth itself. */
export default function TabsLayout() {
  const status = useAuthStore((s) => s.status);
  const operator = useAuthStore((s) => s.operator);

  if (status !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }
  if (!operator) {
    return <LoadingState label="Loading your operator profile…" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryBlue,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <Tabs.Screen name="trips" options={{ title: 'Trips', tabBarIcon: ({ color, size }) => <History color={color} size={size} /> }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings', tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }} />
    </Tabs>
  );
}
