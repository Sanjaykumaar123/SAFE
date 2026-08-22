import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/common/Button';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useHazardDetail } from '@/features/hazards/useHazardDetail';
import { useResolveHazard } from '@/features/hazards/useHazardMutations';
import { useCreateInspection } from '@/features/repairs/useRepairs';

/** PAGE 19 — Confirm Resolution. Two backend calls, in order (section 38 vs
 * 39 of the product spec): the inspection APPROVED decision closes out the
 * repair, then the hazard resolve call is the one that actually flips
 * `hazards.status` to RESOLVED with its own required evidence/notes. */
export default function ConfirmResolutionScreen() {
  const { hazardId, repairId } = useLocalSearchParams<{ hazardId: string; repairId: string }>();
  const insets = useSafeAreaInsets();
  const { data: hazard } = useHazardDetail(hazardId ?? null);
  const createInspection = useCreateInspection(repairId ?? '', hazardId ?? '');
  const resolveHazard = useResolveHazard(hazardId ?? '');

  const [notes, setNotes] = useState('Road surface repaired and inspected.');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const confirm = async () => {
    if (!notes.trim()) {
      setError('Add a short resolution note.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createInspection.mutateAsync({ decision: 'APPROVED', notes: notes.trim() });
      await resolveHazard.mutateAsync({
        resolutionNotes: notes.trim(),
        repairId,
        verificationMethod: 'MUNICIPAL_INSPECTION',
        latitude: hazard?.latitude,
        longitude: hazard?.longitude,
      });
      router.replace({ pathname: '/inspection/success', params: { hazardId } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm resolution. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top + spacing.sm }]}>
      <ScreenHeader title="Confirm Resolution" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.hazardRoad}>{hazard?.roadName ?? hazard?.locationText}</Text>
        <Text style={styles.hint}>Confirming this marks the hazard resolved. It will no longer appear as active on the map, but its history is preserved.</Text>

        <Text style={styles.fieldLabel}>Resolution Notes</Text>
        <TextInput style={styles.input} value={notes} onChangeText={setNotes} multiline placeholderTextColor={colors.textSecondary} />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button label="Confirm Resolution" onPress={confirm} loading={submitting} style={styles.submit} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl },
  hazardRoad: { ...typography.headlineMd, color: colors.deepNavy, marginTop: spacing.sm },
  hint: { ...typography.bodyMd, color: colors.textSecondary },
  fieldLabel: { ...typography.labelMd, color: colors.text, marginTop: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, minHeight: 100, textAlignVertical: 'top', ...typography.bodyMd, color: colors.text },
  errorText: { ...typography.bodyMd, color: colors.critical },
  submit: { marginTop: spacing.md },
});
