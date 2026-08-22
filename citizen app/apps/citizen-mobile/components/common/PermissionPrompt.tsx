import { StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { ProgressDots } from './ProgressDots';
import { colors, radius, spacing, typography } from '@/constants/theme';

interface PermissionPromptProps {
  icon: React.ReactNode;
  title: string;
  explanation: string;
  progressTotal: number;
  progressIndex: number;
  onAllow: () => void;
  onNotNow: () => void;
  allowLabel?: string;
  isSubmitting?: boolean;
}

/** Shared shell for every contextual permission screen (section 8) — same
 * "explain first, then Allow / Not Now" pattern for location, camera, and
 * notifications so citizens never get an unexplained OS prompt. */
export function PermissionPrompt({
  icon,
  title,
  explanation,
  progressTotal,
  progressIndex,
  onAllow,
  onNotNow,
  allowLabel = 'Allow',
  isSubmitting = false,
}: PermissionPromptProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>{icon}</View>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.explanationCard}>
          <Text style={styles.explanation}>{explanation}</Text>
        </View>
      </View>
      <View style={styles.footer}>
        <ProgressDots total={progressTotal} activeIndex={progressIndex} />
        <Button label={allowLabel} onPress={onAllow} size="lg" loading={isSubmitting} />
        <Button label="Not Now" onPress={onNotNow} variant="ghost" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'space-between' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.deepNavy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.headlineLg, color: colors.text, textAlign: 'center' },
  explanationCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  explanation: { ...typography.bodyLg, color: colors.textSecondary, textAlign: 'center' },
  footer: { gap: spacing.md, paddingBottom: spacing.lg },
});
