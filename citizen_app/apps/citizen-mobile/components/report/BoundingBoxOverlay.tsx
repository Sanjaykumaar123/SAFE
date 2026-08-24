import { StyleSheet, Text, View } from 'react-native';

import type { BoundingBox } from '@/types';

/** Draws all AI result normalized (0..1) bounding boxes over the image with badges */
export function BoundingBoxOverlay({
  box,
  boxes,
  label = 'AI DETECTED POTHOLE',
}: {
  box?: BoundingBox | null;
  boxes?: BoundingBox[] | null;
  label?: string;
}) {
  const allBoxes = boxes && boxes.length > 0 ? boxes : box ? [box] : [];
  if (allBoxes.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {allBoxes.map((b, idx) => (
        <View
          key={idx}
          pointerEvents="none"
          style={[
            styles.box,
            {
              left: `${b.x * 100}%`,
              top: `${b.y * 100}%`,
              width: `${b.width * 100}%`,
              height: `${b.height * 100}%`,
            },
          ]}
        >
          <View style={styles.labelBadge}>
            <Text style={styles.labelText} numberOfLines={1}>
              {b.label ?? (b.confidence ? `POTHOLE ${Math.round(b.confidence * 100)}%` : label)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 8,
    zIndex: 9999,
  },
  labelBadge: {
    position: 'absolute',
    top: -24,
    left: -2,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    minWidth: 135,
    zIndex: 10000,
  },
  labelText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
