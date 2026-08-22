import { useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { RepairStatusBadge } from '@/components/common/Badge';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAddRepairProgress, useMarkReadyForInspection, useRepairDetail } from '@/features/repairs/useRepairs';
import { uploadMedia } from '@/services/api/mediaApi';

export default function RepairDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: repair, isLoading, isError, error, refetch } = useRepairDetail(id ?? null);

  const [note, setNote] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const addProgress = useAddRepairProgress(id ?? '', repair?.hazardId);
  const markReady = useMarkReadyForInspection(id ?? '', repair?.hazardId);

  if (isLoading) return <LoadingState label="Loading repair…" />;
  if (isError || !repair) return <ErrorState message={(error as Error)?.message ?? 'Repair unavailable.'} onRetry={refetch} />;

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const submitProgress = async () => {
    setFormError(null);
    try {
      let photoUrl: string | undefined;
      if (photoUri) {
        setUploading(true);
        const filename = photoUri.split('/').pop() ?? 'progress.jpg';
        const uploaded = await uploadMedia(photoUri, filename, 'image/jpeg');
        photoUrl = uploaded.url;
        setUploading(false);
      }
      await addProgress.mutateAsync({ note: note.trim() || undefined, photoUrl });
      setNote('');
      setPhotoUri(null);
    } catch (err) {
      setUploading(false);
      setFormError(err instanceof Error ? err.message : 'Could not save progress update.');
    }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top + spacing.sm }]}>
      <ScreenHeader title={repair.repairCode} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.hazardRoad}>{repair.hazardRoadName ?? repair.hazardLocationText}</Text>
          <RepairStatusBadge status={repair.status} />
        </View>
        <Text style={styles.meta}>
          {repair.priority} priority · {repair.department}
          {repair.zone ? ` · ${repair.zone}` : ''}
        </Text>
        <Text style={styles.meta}>Team: {repair.team ?? 'Unassigned'} {repair.assignedOfficerName ? `(${repair.assignedOfficerName})` : ''}</Text>
        {repair.targetDate ? <Text style={styles.meta}>Target date: {repair.targetDate}</Text> : null}
        {repair.notes ? <Text style={styles.notes}>{repair.notes}</Text> : null}

        <Text style={styles.sectionTitle}>Progress</Text>
        {repair.progressEntries.length === 0 ? (
          <Text style={styles.emptyText}>No progress logged yet.</Text>
        ) : (
          repair.progressEntries.map((entry) => (
            <Card key={entry.id} style={styles.progressCard}>
              {entry.note ? <Text style={styles.progressNote}>{entry.note}</Text> : null}
              {entry.photoUrl ? <Image source={{ uri: entry.photoUrl }} style={styles.progressImage} /> : null}
              <Text style={styles.progressMeta}>
                {entry.createdByName ?? 'Officer'} · {new Date(entry.createdAt).toLocaleString()}
              </Text>
            </Card>
          ))
        )}

        {repair.status !== 'RESOLVED' ? (
          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>Log Progress</Text>
            <TextInput
              style={styles.input}
              placeholder="What was done? (e.g. surface leveled, awaiting curing)"
              placeholderTextColor={colors.textSecondary}
              value={note}
              onChangeText={setNote}
              multiline
            />
            <Pressable style={styles.photoButton} onPress={pickPhoto}>
              <Camera size={16} color={colors.primaryBlue} />
              <Text style={styles.photoButtonLabel}>{photoUri ? 'Photo attached' : 'Attach photo'}</Text>
            </Pressable>
            {photoUri ? <Image source={{ uri: photoUri }} style={styles.progressImage} /> : null}
            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
            <Button label="Submit Update" onPress={submitProgress} loading={uploading || addProgress.isPending} />
            {repair.status !== 'READY_FOR_INSPECTION' ? (
              <Button
                label="Mark Ready for Inspection"
                variant="outline"
                onPress={() => markReady.mutate()}
                loading={markReady.isPending}
              />
            ) : (
              <Text style={styles.readyNote}>This repair is ready for inspection.</Text>
            )}
          </Card>
        ) : (
          <Card style={styles.formCard}>
            <Text style={styles.readyNote}>This repair has been resolved.</Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, paddingBottom: spacing.xxl, gap: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  hazardRoad: { ...typography.headlineMd, color: colors.deepNavy, flex: 1 },
  meta: { ...typography.bodyMd, color: colors.textSecondary },
  notes: { ...typography.bodyMd, color: colors.text, marginTop: spacing.xs },
  sectionTitle: { ...typography.headlineMd, color: colors.deepNavy, marginTop: spacing.lg, marginBottom: spacing.xs },
  emptyText: { ...typography.bodyMd, color: colors.textSecondary },
  progressCard: { marginBottom: spacing.sm, gap: 4 },
  progressNote: { ...typography.bodyMd, color: colors.text },
  progressMeta: { ...typography.labelSm, color: colors.textSecondary, marginTop: 4 },
  progressImage: { width: '100%', height: 160, borderRadius: radius.md, marginTop: spacing.xs, backgroundColor: colors.surfaceMuted },
  formCard: { marginTop: spacing.md, gap: spacing.sm },
  formTitle: { ...typography.bodyLg, color: colors.text, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, minHeight: 70, textAlignVertical: 'top', ...typography.bodyMd, color: colors.text },
  photoButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  photoButtonLabel: { ...typography.labelMd, color: colors.primaryBlue },
  errorText: { ...typography.bodyMd, color: colors.critical },
  readyNote: { ...typography.bodyMd, color: colors.purple, fontWeight: '600', textAlign: 'center' },
});
