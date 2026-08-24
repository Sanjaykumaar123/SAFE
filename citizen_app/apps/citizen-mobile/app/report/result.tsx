import { router } from 'expo-router';
import { AlertTriangle, Camera, CircleAlert, CircleCheck, RotateCcw } from 'lucide-react-native';
import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { BoundingBoxOverlay } from '@/components/report/BoundingBoxOverlay';
import { HazardTypePicker } from '@/components/report/HazardTypePicker';
import { SeverityPicker } from '@/components/report/SeverityPicker';
import { HAZARD_TYPE_LABELS } from '@/constants/hazardType';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useSubmitReportFlow } from '@/features/reports/useSubmitReportFlow';
import { useReportStore } from '@/store/reportStore';

const LOW_CONFIDENCE_THRESHOLD = 0.7;

/**
 * AI result review (section 21). Renders one of four states from the mock
 * (soon real) AI service: detected / no-hazard / low-confidence / failed —
 * exactly the contract in types/ai.ts, with a "Does this look correct?"
 * confirm-or-edit step before submission (section 22's form lives inline
 * here, revealed by "Edit").
 */
export default function ResultScreen() {
  const media = useReportStore((s) => s.media);
  const location = useReportStore((s) => s.location);
  const aiResult = useReportStore((s) => s.aiResult);
  const aiError = useReportStore((s) => s.aiError);
  const hazardType = useReportStore((s) => s.hazardType);
  const severity = useReportStore((s) => s.severity);
  const description = useReportStore((s) => s.description);
  const setHazardType = useReportStore((s) => s.setHazardType);
  const setSeverity = useReportStore((s) => s.setSeverity);
  const setDescription = useReportStore((s) => s.setDescription);
  const setLocation = useReportStore((s) => s.setLocation);

  const { submit, isSubmitting, submitError } = useSubmitReportFlow();

  const isFailed = !!aiError;
  const isNoHazard = !isFailed && aiResult && !aiResult.detected;
  const isLowConfidence = !isFailed && aiResult?.detected && aiResult.confidence < LOW_CONFIDENCE_THRESHOLD;
  const isConfidentDetection = !isFailed && aiResult?.detected && aiResult.confidence >= LOW_CONFIDENCE_THRESHOLD;

  const [showForm, setShowForm] = useState(!!isNoHazard || !!isLowConfidence);

  if (!media || !location) return null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.imageWrap}>
          <Image source={{ uri: media.uri }} style={styles.image} />
          {isConfidentDetection && aiResult?.boundingBox ? <BoundingBoxOverlay box={aiResult.boundingBox} /> : null}
        </View>

        {isFailed && (
          <View style={styles.statusBlock}>
            <CircleAlert size={40} color={colors.critical} />
            <Text style={styles.statusTitle}>ANALYSIS FAILED</Text>
            <Text style={styles.statusBody}>{aiError}</Text>
          </View>
        )}

        {isNoHazard && !showForm && (
          <View style={styles.statusBlock}>
            <CircleCheck size={40} color={colors.green} />
            <Text style={styles.statusTitle}>NO CLEAR HAZARD DETECTED</Text>
            <Text style={styles.statusBody}>{aiResult?.message ?? 'SafePath AI could not confidently identify a road hazard in this photo.'}</Text>
          </View>
        )}

        {isLowConfidence && !showForm && (
          <View style={styles.statusBlock}>
            <AlertTriangle size={40} color={colors.warning} />
            <Text style={styles.statusTitle}>POSSIBLE HAZARD</Text>
            <Text style={styles.confidenceValue}>{Math.round((aiResult?.confidence ?? 0) * 100)}%</Text>
            <Text style={styles.statusBody}>SafePath AI isn&apos;t fully confident — please review the details before submitting.</Text>
          </View>
        )}

        {isConfidentDetection && !showForm && (
          <View style={styles.statusBlock}>
            <Text style={styles.statusTitle}>{HAZARD_TYPE_LABELS[hazardType].toUpperCase()} DETECTED</Text>
            <View style={styles.confidenceRow}>
              <View style={styles.confidenceItem}>
                <Text style={styles.confidenceLabel}>Confidence</Text>
                <Text style={styles.confidenceValue}>{Math.round((aiResult?.confidence ?? 0) * 100)}%</Text>
              </View>
              <View style={styles.confidenceDivider} />
              <View style={styles.confidenceItem}>
                <Text style={styles.confidenceLabel}>Severity</Text>
                <Text style={styles.confidenceValue}>{severity}</Text>
              </View>
            </View>
            <Text style={styles.statusBody}>Does this look correct?</Text>
          </View>
        )}

        {showForm && (
          <View style={styles.form}>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Hazard type</Text>
              <HazardTypePicker value={hazardType} onChange={setHazardType} />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Severity</Text>
              <SeverityPicker value={severity} onChange={setSeverity} />
            </View>
            <Input
              label="Description (optional)"
              placeholder="Add any extra detail…"
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
              style={styles.textArea}
            />
            <Input label="Location" value={location.locationText} onChangeText={(text) => setLocation({ ...location, locationText: text, isManuallyAdjusted: true })} />
          </View>
        )}

        {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        {isFailed ? (
          <>
            <Button label="Try Another Photo" onPress={() => router.replace('/report/camera')} icon={<Camera size={18} color={colors.white} />} />
            <Button label="Report Manually" onPress={() => setShowForm(true)} variant="outline" />
          </>
        ) : showForm ? (
          <Button label="Submit Report" onPress={submit} loading={isSubmitting} size="lg" />
        ) : isNoHazard ? (
          <>
            <Button label="Report Manually" onPress={() => setShowForm(true)} />
            <Button label="Try Another Photo" onPress={() => router.replace('/report/camera')} variant="outline" icon={<RotateCcw size={16} color={colors.primaryBlue} />} />
          </>
        ) : (
          <>
            <Button label="YES, SUBMIT" onPress={submit} loading={isSubmitting} size="lg" />
            <Button label="Edit" onPress={() => setShowForm(true)} variant="outline" />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.lg },
  imageWrap: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.deepNavy },
  image: { width: '100%', height: '100%' },
  statusBlock: { alignItems: 'center', gap: spacing.xs, padding: spacing.lg },
  statusTitle: { ...typography.headlineLg, color: colors.text, textAlign: 'center', letterSpacing: 0.5 },
  statusBody: { ...typography.bodyMd, color: colors.textSecondary, textAlign: 'center' },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginVertical: spacing.sm },
  confidenceItem: { alignItems: 'center' },
  confidenceDivider: { width: 1, height: 32, backgroundColor: colors.border },
  confidenceLabel: { ...typography.labelSm, color: colors.textSecondary },
  confidenceValue: { ...typography.headlineLg, color: colors.text },
  form: { paddingHorizontal: spacing.lg, gap: spacing.md },
  formField: { gap: spacing.xs },
  formLabel: { ...typography.labelMd, color: colors.text },
  textArea: { minHeight: 80, textAlignVertical: 'top', paddingTop: spacing.sm },
  submitError: { ...typography.bodyMd, color: colors.critical, textAlign: 'center', paddingHorizontal: spacing.lg },
  footer: { padding: spacing.lg, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white },
});
