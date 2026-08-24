import { Bell, Home, MapIcon, PlusCircle, User } from 'lucide-react-native';
import { router, Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '@/store/authStore';

import { useNotifications } from '@/features/alerts/useNotifications';
import { colors, spacing, typography } from '@/constants/theme';

function UnreadDot({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { data } = useNotifications();
  const unreadCount = data?.unreadCount ?? 0;
  const authStatus = useAuthStore((s) => s.status);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryBlue,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => <Home color={color} size={size} strokeWidth={focused ? 2.4 : 2} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size, focused }) => <MapIcon color={color} size={size} strokeWidth={focused ? 2.4 : 2} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          tabBarIcon: ({ size }) => <PlusCircle color={colors.critical} size={size + 6} fill={colors.critical} fillOpacity={0.12} />,
          tabBarLabelStyle: [styles.tabLabel, { color: colors.critical, fontWeight: '700' }],
        }}
        listeners={{
          // One-tap access to reporting (section 55) — the tab itself has
          // no content; tapping it launches the camera flow directly
          // instead of navigating to a placeholder screen first. Guests
          // are sent to login since submitting a report requires an
          // account.
          tabPress: (e) => {
            e.preventDefault();
            router.push(authStatus === 'authenticated' ? '/report/camera' : '/(auth)/login');
          },
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size, focused }) => (
            <View>
              <Bell color={color} size={size} strokeWidth={focused ? 2.4 : 2} />
              <UnreadDot count={unreadCount} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => <User color={color} size={size} strokeWidth={focused ? 2.4 : 2} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 64,
    paddingBottom: spacing.xs,
    paddingTop: spacing.xs,
    backgroundColor: colors.white,
    borderTopColor: colors.border,
  },
  tabLabel: { ...typography.labelSm, fontWeight: '600' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.critical,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: colors.white, fontSize: 9, fontWeight: '700' },
});
