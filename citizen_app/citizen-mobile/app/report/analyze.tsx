import { router } from 'expo-router';
import { CheckCircle2, Circle, Loader } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/constants/theme';
import { getAIAnalysisService } from '@/services/ai';
import { useReportStore } from '@/store/reportStore';

/**
 * "Analyzing Road Condition" (section 20). This is a MOCK analysis
 * service today (AI_PROVIDER=mock) — the progress states below describe
 * what's happening, never claiming a real model is running.
 */
const STEPS = ['Uploading image', 'Checking image quality', 'Analyzing road condition', 'Preparing result'] as const;
const STEP_INTERVAL_MS = 650;

export default function AnalyzeScreen() {
  const media = useReportStore((s) => s.media);
  const setAiResult = useReportStore((s) => s.setAiResult);
  const setAiError = useReportStore((s) => s.setAiError);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!media) {
      router.replace('/report/camera');
      return;
    }

    let cancelled = false;
    const stepTimer = setInterval(() => {
      setActiveStep((step) => Math.min(step + 1, STEPS.length - 1));
    }, STEP_INTERVAL_MS);

    (async () => {
      const minimumVisualTime = new Promise((resolve) => setTimeout(resolve, STEP_INTERVAL_MS * STEPS.length));
      try {
        const service = getAIAnalysisService();
        const [result] = await Promise.all([service.analyzeRoadImage(media.uri), minimumVisualTime]);
        if (cancelled) return;
        setAiResult(result);
        setAiError(null);
        router.replace('/report/result');
      } catch {
        if (cancelled) return;
        setAiError("We couldn't analyze this image. Please try again with a clearer, well-lit photo.");
        setAiResult(null);
        router.replace('/report/result');
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(stepTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Loader size={40} color={colors.secondaryBlue} />
        <Text style={styles.title}>ANALYZING ROAD CONDITION</Text>
        <Text style={styles.subtitle}>SafePath AI is processing the captured imagery to identify infrastructure hazards.</Text>

        <View style={styles.steps}>
          {STEPS.map((step, index) => {
            const isDone = index < activeStep;
            const isActive = index === activeStep;
            return (
              <View key={step} style={styles.stepRow}>
                {isDone ? <CheckCircle2 size={20} color={colors.secondaryBlue} /> : <Circle size={20} color={isActive ? colors.secondaryBlue : 'rgba(255,255,255,0.3)'} />}
                <Text style={[styles.stepText, (isDone || isActive) && styles.stepTextActive]}>{step}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.deepNavy },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  title: { ...typography.headlineLgMobile, color: colors.white, textAlign: 'center', marginTop: spacing.md },
  subtitle: { ...typography.bodyMd, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: spacing.lg },
  steps: { width: '100%', gap: spacing.md, marginTop: spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepText: { ...typography.bodyMd, color: 'rgba(255,255,255,0.5)' },
  stepTextActive: { color: colors.white },
});
