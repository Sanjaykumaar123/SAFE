import { router } from 'expo-router';
import { Clock, MapPin, RotateCcw } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/common/Button';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { locationService } from '@/services/location/locationService';
import { BoundingBoxOverlay } from '@/components/report/BoundingBoxOverlay';
import { useReportStore } from '@/store/reportStore';

/**
 * Media preview (section 16). Location and timestamp are attached
 * automatically here; "Analyze Road Condition" hands off to analyze.tsx,
 * which calls the MOCK AI service — never a real model (section 16 note).
 */
export default function PreviewScreen() {
  const media = useReportStore((s) => s.media);
  const location = useReportStore((s) => s.location);
  const capturedAt = useReportStore((s) => s.capturedAt);
  const aiResult = useReportStore((s) => s.aiResult);
  const setLocation = useReportStore((s) => s.setLocation);
  const setCapturedAt = useReportStore((s) => s.setCapturedAt);

  const [isLocating, setIsLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!media) {
      router.replace('/report/camera');
      return;
    }
    setCapturedAt(new Date().toISOString());
    (async () => {
      setIsLocating(true);
      const coords = await locationService.getCurrentLocation();
      if (!coords) {
        setLocationError('Location unavailable — you can set it manually before submitting.');
        setIsLocating(false);
        return;
      }
      const address = await locationService.reverseGeocode(coords);
      setLocation({ latitude: coords.latitude, longitude: coords.longitude, locationText: address ?? 'Current location', isManuallyAdjusted: false });
      setIsLocating(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!media) return null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: media.uri }} style={styles.image} />
        {aiResult?.detected ? <BoundingBoxOverlay box={aiResult.boundingBox} boxes={aiResult.boundingBoxes} /> : null}
        <Pressable style={styles.retakeButton} onPress={() => router.replace('/report/camera')} accessibilityLabel="Retake photo">
          <RotateCcw size={18} color={colors.white} />
          <Text style={styles.retakeText}>Retake</Text>
        </Pressable>
      </View>

      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <MapPin size={18} color={colors.primaryBlue} />
          <Text style={styles.detailText} numberOfLines={2}>
            {isLocating ? 'Detecting location…' : locationError ? locationError : location?.locationText}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Clock size={18} color={colors.textSecondary} />
          <Text style={styles.detailText}>{capturedAt ? new Date(capturedAt).toLocaleString() : ''}</Text>
        </View>
        <Text style={styles.autoNote}>Location added automatically. You can adjust it later if needed.</Text>
      </View>

      <View style={styles.footer}>
        <Button label="Analyze Road Condition" onPress={() => router.push('/report/analyze')} size="lg" loading={isLocating} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.deepNavy },
  imageWrap: { flex: 1 },
  image: { width: '100%', height: '100%' },
  retakeButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  retakeText: { ...typography.labelMd, color: colors.white },
  detailsCard: { backgroundColor: colors.background, padding: spacing.lg, gap: spacing.sm, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailText: { ...typography.bodyMd, color: colors.text, flex: 1 },
  autoNote: { ...typography.labelSm, color: colors.textSecondary },
  footer: { backgroundColor: colors.background, padding: spacing.lg, paddingTop: 0 },
});
