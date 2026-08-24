import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';
import type { BoundingBox } from '@/types';

/** Draws the AI result's normalized (0..1) bounding box over the captured
 * image (section 21) — purely visual, no gesture handling needed. */
export function BoundingBoxOverlay({ box }: { box: BoundingBox }) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.box,
        {
          left: `${box.x * 100}%`,
          top: `${box.y * 100}%`,
          width: `${box.width * 100}%`,
          height: `${box.height * 100}%`,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: colors.critical,
    backgroundColor: `${colors.critical}22`,
    borderRadius: 6,
  },
});
