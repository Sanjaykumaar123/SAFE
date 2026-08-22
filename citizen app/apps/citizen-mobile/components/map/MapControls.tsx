/** Floating right-edge FAB stack — recenter-on-me and the hazard-layer
 * toggle, matching the "Level 1 (Surface)" floating-control spec. */
import { Pressable, StyleSheet, View } from 'react-native';
import { Flame, Layers, LocateFixed } from 'lucide-react-native';

import { colors, radius, shadow, spacing } from '@/constants/theme';

interface Props {
  topOffset: number;
  isFollowing: boolean;
  layersActive: boolean;
  onRecenter: () => void;
  onToggleLayers: () => void;
  heatmapActive?: boolean;
  onToggleHeatmap?: () => void;
}

export function MapControls({ topOffset, isFollowing, layersActive, onRecenter, onToggleLayers, heatmapActive, onToggleHeatmap }: Props) {
  return (
    <View style={[styles.container, { top: topOffset }]} pointerEvents="box-none">
      {/* MapLibre's heatmap is a plain style layer (unlike react-native-maps'
       * Google-only Heatmap), so unlike an earlier pass at this it needs no
       * platform gate — it renders the same on iOS and Android. */}
      {onToggleHeatmap ? (
        <Pressable style={[styles.fab, heatmapActive && styles.fabActive]} onPress={onToggleHeatmap} hitSlop={4} accessibilityLabel="Toggle hazard heatmap">
          <Flame size={20} color={heatmapActive ? colors.white : colors.text} />
        </Pressable>
      ) : null}
      <Pressable style={[styles.fab, layersActive && styles.fabActive]} onPress={onToggleLayers} hitSlop={4}>
        <Layers size={20} color={layersActive ? colors.white : colors.text} />
      </Pressable>
      <Pressable style={[styles.fab, isFollowing && styles.fabActive]} onPress={onRecenter} hitSlop={4}>
        <LocateFixed size={20} color={isFollowing ? colors.white : colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', right: spacing.md, gap: spacing.sm },
  fab: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  fabActive: { backgroundColor: colors.primaryBlue },
});
