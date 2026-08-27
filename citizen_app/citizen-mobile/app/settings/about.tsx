import Constants from 'expo-constants';
import { ShieldCheck } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { colors, spacing, typography } from '@/constants/theme';

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="About SafePath" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.iconCircle}>
          <ShieldCheck size={36} color={colors.white} />
        </View>
        <Text style={styles.appName}>SafePath AI</Text>
        <Text style={styles.tagline}>Verified Road Intelligence — safer roads, smarter cities.</Text>
        <Text style={styles.version}>Version {Constants.expoConfig?.version ?? '1.0.0'}</Text>

        <Text style={styles.body}>
          SafePath AI helps citizens report and track road hazards — potholes, road damage, flooding, debris and more — and shows
          verified conditions on a live map. Reports are reviewed and corroborated by SafePath road observations before being marked
          verified, so what you see on the map reflects real, current road conditions.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, alignItems: 'center', gap: spacing.xs },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.deepNavy, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  appName: { ...typography.headlineLg, color: colors.text },
  tagline: { ...typography.bodyMd, color: colors.textSecondary, textAlign: 'center' },
  version: { ...typography.labelSm, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.md },
  body: { ...typography.bodyMd, color: colors.text, textAlign: 'left' },
});
