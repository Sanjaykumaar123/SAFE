import { Redirect, Tabs } from 'expo-router';
import { BarChart3, Landmark, LayoutDashboard, MoreHorizontal, TriangleAlert, Truck } from 'lucide-react-native';

import { colors } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

/** §10/§11 — bottom nav matches the location-intelligence design
 * reference (Dashboard/Hazards/Fleet/Gov/Analytics); everything else
 * (§10's "More" grouping — Users, Cities, AI, System Health, Audit Logs,
 * Notifications, Settings, Support, Profile) lives one level deeper under
 * the More tab so the primary bar stays uncluttered. */
export default function TabsLayout() {
  const status = useAuthStore((s) => s.status);

  if (status !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
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
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> }} />
      <Tabs.Screen name="hazards" options={{ title: 'Hazards', tabBarIcon: ({ color, size }) => <TriangleAlert color={color} size={size} /> }} />
      <Tabs.Screen name="fleet" options={{ title: 'Fleet', tabBarIcon: ({ color, size }) => <Truck color={color} size={size} /> }} />
      <Tabs.Screen name="municipalities" options={{ title: 'Gov', tabBarIcon: ({ color, size }) => <Landmark color={color} size={size} /> }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analytics', tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} /> }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ color, size }) => <MoreHorizontal color={color} size={size} /> }} />
    </Tabs>
  );
}
