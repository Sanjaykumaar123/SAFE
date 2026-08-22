import { Redirect, Tabs } from 'expo-router';
import { BarChart3, LayoutDashboard, MapPin, TriangleAlert, Wrench } from 'lucide-react-native';
import { useEffect } from 'react';

import { LoadingState } from '@/components/common/LoadingState';
import { colors } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useMunicipalityStore } from '@/store/municipalityStore';

/**
 * Section 11 — city context is hydrated here, before any tab screen reads
 * `useMunicipalityStore`, so Dashboard/Map/etc. never render before
 * authorization is confirmed.
 */
export default function TabsLayout() {
  const status = useAuthStore((s) => s.status);
  const officer = useAuthStore((s) => s.officer);
  const authorizedCities = useAuthStore((s) => s.authorizedCities);
  const hydrate = useMunicipalityStore((s) => s.hydrate);
  const selectedCityId = useMunicipalityStore((s) => s.selectedCityId);

  useEffect(() => {
    if (officer) hydrate(officer, authorizedCities);
  }, [officer, authorizedCities, hydrate]);

  if (status !== 'authenticated') {
    return <Redirect href="/(auth)/login" />;
  }
  if (!officer || !selectedCityId) {
    return <LoadingState label="Loading your municipality context…" />;
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
      <Tabs.Screen name="map" options={{ title: 'Map', tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} /> }} />
      <Tabs.Screen name="hazards" options={{ title: 'Hazards', tabBarIcon: ({ color, size }) => <TriangleAlert color={color} size={size} /> }} />
      <Tabs.Screen name="repairs" options={{ title: 'Repairs', tabBarIcon: ({ color, size }) => <Wrench color={color} size={size} /> }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analytics', tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} /> }} />
    </Tabs>
  );
}
