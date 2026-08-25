import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CheckCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAddRepairProgress, useRepairDetail } from '@/features/repairs/useRepairs';
import { uploadMedia } from '@/services/api/mediaApi';

export default function LogRepairProgressScreen() {
  const { repairId } = useLocalSearchParams<{ repairId: string }>();
  const insets = useSafeAreaInsets();
  const { data: repair } = useRepairDetail(repairId ?? null);

  const [note, setNote] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const addProgress = useAddRepairProgress(repairId ?? '', repair?.hazardId);

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
      setSubmitted(true);
    } catch (err) {
      setUploading(false);
      setFormError(err instanceof Error ? err.message : 'Could not save progress update.');
    }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top + spacing.sm }]}>
      <ScreenHeader title="Log Repair Progress" />
      <ScrollView contentContainerStyle={styles.container}>
        {submitted ? (
          <Card style={styles.successCard}>
            <CheckCircle size={48} color={colors.green} />
            <Text style={styles.successTitle}>Progress Saved!</Text>
            <Text style={styles.successSubtitle}>The update was added to repair {repair?.repairCode ?? repairId}.</Text>
            <Button label="Done" onPress={() => router.back()} />
          </Card>
        ) : (
          <Card style={styles.formCard}>
            <Text style={styles.codeText}>{repair?.repairCode ? `Repair ${repair.repairCode}` : 'Update Repair Progress'}</Text>
            <Text style={styles.label}>Progress Notes</Text>
            <TextInput
              style={styles.input}
              placeholder="Describe work completed (e.g. cold mix applied, resurfaced, cured)"
              placeholderTextColor={colors.textSecondary}
              value={note}
              onChangeText={setNote}
              multiline
            />

            <Pressable style={styles.photoButton} onPress={pickPhoto}>
              <Camera size={18} color={colors.primaryBlue} />
              <Text style={styles.photoButtonLabel}>{photoUri ? 'Photo Attached' : 'Attach Photo Evidence'}</Text>
            </Pressable>

            {photoUri ? <Image source={{ uri: photoUri }} style={styles.previewImage} /> : null}

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <Button label="Submit Progress Update" onPress={submitProgress} loading={uploading || addProgress.isPending} />
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.md },
  formCard: { gap: spacing.sm },
  codeText: { ...typography.headlineMd, color: colors.deepNavy },
  label: { ...typography.bodyMd, color: colors.text, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, minHeight: 90, textAlignVertical: 'top', ...typography.bodyMd, color: colors.text },
  photoButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  photoButtonLabel: { ...typography.labelMd, color: colors.primaryBlue },
  previewImage: { width: '100%', height: 180, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  errorText: { ...typography.bodyMd, color: colors.critical },
  successCard: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  successTitle: { ...typography.headlineLg, color: colors.deepNavy },
  successSubtitle: { ...typography.bodyMd, color: colors.textSecondary, textAlign: 'center' },
});
