import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { VERIFICATION_STATE_LABELS } from '@/constants/enums';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useHazardDetail, useHazardVerification } from '@/features/hazards/useHazardDetail';
import { useCreateInspection } from '@/features/repairs/useRepairs';
import { aiService, type AIInspectionResponse } from '@/services/ai/aiService';

/** Section 38 — inspector reviews before/repair evidence + recent fleet
 * observations + current road-condition state, then chooses Approve or
 * Request Rework. */
export default function InspectionScreen() {
  const { hazardId } = useLocalSearchParams<{ hazardId: string }>();
  const insets = useSafeAreaInsets();
  const { data: hazard, isLoading, isError, error, refetch } = useHazardDetail(hazardId ?? null);
  const { data: verification } = useHazardVerification(hazardId ?? null);
  const [reworkNotes, setReworkNotes] = useState('');
  const [showRework, setShowRework] = useState(false);
  const [reworkError, setReworkError] = useState<string | null>(null);

  const [isScanningAI, setIsScanningAI] = useState(false);
  const [aiScanResult, setAiScanResult] = useState<AIInspectionResponse | null>(null);

  const createInspection = useCreateInspection(hazard?.currentRepair?.id ?? '', hazardId ?? '');

  if (isLoading) return <LoadingState label="Loading inspection…" />;
  if (isError || !hazard) return <ErrorState message={(error as Error)?.message ?? 'Hazard unavailable.'} onRetry={refetch} />;
  if (!hazard.currentRepair) return <ErrorState message="No repair is ready for inspection on this hazard." />;

  const handleRunAiScan = async () => {
    const targetUrl = hazard.latestAiAnalysis?.imageUrl ?? hazard.municipalityActions.find((a) => a.actionType === 'REPAIR_PROGRESS')?.notes;
    if (!targetUrl) return;
    setIsScanningAI(true);
    const result = await aiService.analyzeImage(targetUrl);
    setAiScanResult(result);
    setIsScanningAI(false);
  };

  const submitRework = async () => {
    if (!reworkNotes.trim()) {
      setReworkError('Explain what needs to be reworked.');
      return;
    }
    setReworkError(null);
    try {
      if (hazardId) {
        await aiService.rejectHazard(hazardId, reworkNotes.trim());
      }
      await createInspection.mutateAsync({ decision: 'REWORK_REQUESTED', notes: reworkNotes.trim() });
      router.back();
    } catch (err) {
      setReworkError((err as Error)?.message ?? 'Could not submit rework request. Please try again.');
    }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top + spacing.sm }]}>
      <ScreenHeader title="Inspection" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.hazardRoad}>{hazard.roadName ?? hazard.locationText}</Text>
        <Text style={styles.repairCode}>{hazard.currentRepair.repairCode}</Text>

        <Text style={styles.sectionTitle}>Before Evidence</Text>
        {hazard.latestAiAnalysis?.imageUrl ? <Image source={{ uri: hazard.latestAiAnalysis.imageUrl }} style={styles.image} /> : (
          <Text style={styles.emptyText}>No original evidence image on file.</Text>
        )}

        <Text style={styles.sectionTitle}>Trained AI Inspection Model</Text>
        <Card style={styles.aiCard}>
          <Text style={styles.aiCardTitle}>YOLOv8 Road Hazard AI Model Verification</Text>
          <Text style={styles.aiCardSub}>Evaluate evidence against trained SafePath AI server model routes.</Text>
          
          {aiScanResult ? (
            <View style={styles.aiResultsBox}>
              <Text style={styles.aiResultHeadline}>
                {aiScanResult.detected ? `🚨 ${aiScanResult.hazardCount} Hazard(s) Detected` : '✅ Road Clear / Hazard Resolved'}
              </Text>
              <Text style={styles.aiDetailText}>Model: {aiScanResult.modelVersion}</Text>
              <Text style={styles.aiDetailText}>Confidence: {Math.round(aiScanResult.confidence * 100)}%</Text>
              <Text style={styles.aiDetailText}>Severity: {aiScanResult.severity}</Text>
              <Text style={styles.aiDetailText}>Latency: {aiScanResult.inferenceLatencyMs} ms</Text>
            </View>
          ) : null}

          <Button
            label={isScanningAI ? 'Analyzing Image…' : 'Run Live AI Model Scan'}
            variant="outline"
            onPress={handleRunAiScan}
            loading={isScanningAI}
          />
        </Card>

        <Text style={styles.sectionTitle}>Repair Evidence</Text>
        {hazard.municipalityActions
          .filter((a) => a.actionType === 'REPAIR_PROGRESS')
          .slice(0, 3)
          .map((a) => (
            <Card key={a.id} style={styles.progressCard}>
              <Text style={styles.progressNote}>{a.notes ?? 'Progress update'}</Text>
              <Text style={styles.progressMeta}>{new Date(a.createdAt).toLocaleString()}</Text>
            </Card>
          ))}

        <Text style={styles.sectionTitle}>Recent Fleet Observations</Text>
        {verification ? (
          <Card>
            <Text style={styles.verificationState}>{VERIFICATION_STATE_LABELS[verification.state]} — {verification.confidence}%</Text>
            <Text style={styles.progressMeta}>{verification.summary}</Text>
          </Card>
        ) : (
          <LoadingState label="Loading verification…" />
        )}

        {showRework ? (
          <Card style={styles.reworkCard}>
            <Text style={styles.formTitle}>What needs rework?</Text>
            <TextInput
              style={styles.input}
              placeholder="Describe the remaining issue…"
              placeholderTextColor={colors.textSecondary}
              value={reworkNotes}
              onChangeText={setReworkNotes}
              multiline
            />
            {reworkError ? <Text style={styles.errorText}>{reworkError}</Text> : null}
            <Button label="Send Back for Rework" variant="danger" onPress={submitRework} loading={createInspection.isPending} />
          </Card>
        ) : null}
      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Button
          label="Approve Resolution"
          onPress={async () => {
            if (hazardId) {
              await aiService.verifyHazard(hazardId, 'Approved by inspector via trained AI model verification');
            }
            router.push({
              pathname: '/inspection/confirm',
              params: { hazardId: hazard.id, repairId: hazard.currentRepair!.id },
            });
          }}
        />
        <Button label="Request Rework" variant="outline" onPress={() => setShowRework(true)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, paddingBottom: spacing.xl, gap: 4 },
  hazardRoad: { ...typography.headlineMd, color: colors.deepNavy, marginTop: spacing.sm },
  repairCode: { ...typography.bodyMd, color: colors.textSecondary },
  sectionTitle: { ...typography.headlineMd, color: colors.deepNavy, marginTop: spacing.lg, marginBottom: spacing.xs },
  emptyText: { ...typography.bodyMd, color: colors.textSecondary },
  image: { width: '100%', height: 180, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  progressCard: { marginBottom: spacing.sm },
  progressNote: { ...typography.bodyMd, color: colors.text },
  progressMeta: { ...typography.labelSm, color: colors.textSecondary, marginTop: 4 },
  verificationState: { ...typography.bodyLg, color: colors.text, fontWeight: '700' },
  reworkCard: { marginTop: spacing.md, gap: spacing.sm },
  formTitle: { ...typography.bodyLg, color: colors.text, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, minHeight: 70, textAlignVertical: 'top', ...typography.bodyMd, color: colors.text },
  errorText: { ...typography.bodyMd, color: colors.critical },
  actionBar: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, gap: spacing.sm },
  aiCard: { marginVertical: spacing.sm, gap: spacing.xs },
  aiCardTitle: { ...typography.headlineMd, color: colors.deepNavy, fontWeight: '700' },
  aiCardSub: { ...typography.bodyMd, color: colors.textSecondary, marginBottom: spacing.xs },
  aiResultsBox: { backgroundColor: colors.surfaceMuted, padding: spacing.sm, borderRadius: radius.md, gap: 4, marginVertical: spacing.xs },
  aiResultHeadline: { ...typography.bodyLg, color: colors.deepNavy, fontWeight: '700' },
  aiDetailText: { ...typography.bodyMd, color: colors.textSecondary },
});
