import { StyleSheet, Text, View } from 'react-native';

import { monitoringPalette, radius, spacing } from '@/constants/theme';
import type { AIInferenceResult } from '@/types/ai';

/** §22/25 — AI bounding box overlay on the live camera preview: "POTHOLE
 * 94%". Purely visual/automatic — the operator never confirms or dismisses
 * a detection (§04/25). */
export function DetectionOverlay({ result, previewWidth, previewHeight }: { result: AIInferenceResult | null; previewWidth: number; previewHeight: number }) {
  if (!result || !result.detected || !result.boundingBox) return null;

  const { x, y, width, height } = result.boundingBox;
  const left = x * previewWidth;
  const top = y * previewHeight;
  const boxWidth = width * previewWidth;
  const boxHeight = height * previewHeight;

  return (
    <View pointerEvents="none" style={[styles.box, { left, top, width: boxWidth, height: boxHeight }]}>
      <View style={styles.labelPill}>
        <Text style={styles.labelText}>
          {result.hazardType} {Math.round(result.confidence * 100)}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: monitoringPalette.detected,
    borderRadius: radius.sm,
  },
  labelPill: {
    position: 'absolute',
    top: -28,
    left: 0,
    backgroundColor: monitoringPalette.detected,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  labelText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
