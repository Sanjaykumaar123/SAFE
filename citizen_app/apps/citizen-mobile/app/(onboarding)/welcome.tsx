import { MapPinned, ShieldCheck } from 'lucide-react-native';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/common/Button';
import { ProgressDots } from '@/components/common/ProgressDots';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <ShieldCheck size={48} color={colors.white} />
        </View>
        <Text style={styles.title}>Know your roads before you travel them</Text>
        <Text style={styles.body}>
          SafePath AI shows verified potholes, road damage and hazards near you in real time — reported by citizens like you and
          confirmed by SafePath road observations.
        </Text>

        <View style={styles.pointRow}>
          <View style={styles.pointIcon}>
            <MapPinned size={18} color={colors.primaryBlue} />
          </View>
          <Text style={styles.pointText}>Live map of hazards on your route, with severity and AI confidence.</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <ProgressDots total={3} activeIndex={0} />
        <Button label="Get Started" onPress={() => router.push('/(onboarding)/location')} size="lg" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, justifyContent: 'space-between' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.deepNavy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { ...typography.headlineLg, color: colors.text, textAlign: 'center' },
  body: { ...typography.bodyLg, color: colors.textSecondary, textAlign: 'center' },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  pointIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.primaryBlue}1A`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: { ...typography.bodyMd, color: colors.text, flex: 1 },
  footer: { gap: spacing.lg, paddingBottom: spacing.lg },
});
