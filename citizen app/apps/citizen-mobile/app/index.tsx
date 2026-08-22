import { ShieldCheck } from 'lucide-react-native';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';

const MIN_SPLASH_MS = 900;

/**
 * SPLASH -> ONBOARDING -> PERMISSIONS -> LOGIN/REGISTER -> HOME
 * (section 7). Waits for auth bootstrap AND a minimum splash duration so
 * the brand moment always shows, then redirects based on onboarding/auth
 * state. The live map itself lives at `(tabs)/map` — see
 * `components/map/MapScreen.tsx` — not at the app root, so it sits behind
 * the required auth/onboarding gate like every other tab.
 */
export default function SplashScreen() {
  const authStatus = useAuthStore((s) => s.status);
  const hasCompletedOnboarding = useSettingsStore((s) => s.hasCompletedOnboarding);
  const guestModeEnabled = useSettingsStore((s) => s.guestModeEnabled);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timeout);
  }, []);

  if (authStatus === 'checking' || !minTimeElapsed) {
    return (
      <View style={styles.container}>
        <View style={styles.logoCircle}>
          <ShieldCheck size={40} color={colors.white} strokeWidth={2.2} />
        </View>
        <Text style={styles.title}>SafePath AI</Text>
        <Text style={styles.subtitle}>Verified Road Intelligence</Text>
        <Text style={styles.tagline}>Safer roads. Smarter cities.</Text>
      </View>
    );
  }

  if (!hasCompletedOnboarding) {
    return <Redirect href="/(onboarding)/welcome" />;
  }
  if (authStatus === 'authenticated' || guestModeEnabled) {
    return <Redirect href="/(tabs)/home" />;
  }
  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.deepNavy, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { ...typography.headlineLg, color: colors.white },
  subtitle: { ...typography.bodyLg, color: colors.white, opacity: 0.85, marginTop: spacing.xs },
  tagline: { ...typography.bodyMd, color: colors.secondaryBlue, marginTop: spacing.sm },
});
