import { Map as MapLibreMap, Camera } from '@maplibre/maplibre-react-native';
import { LayersIcon, LocateFixed } from 'lucide-react-native';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { MAP_STYLE_JSON } from '@/constants/mapStyle';
import { colors, radius, shadow } from '@/constants/theme';
import type { Hazard } from '@/types';
import { toMapLibreCoordinate } from '@/utils/geoCoordinate';

import { HazardMarker } from './HazardMarker';

interface HazardMapPreviewProps {
  center: { latitude: number; longitude: number };
  hazards: Hazard[];
  onSelectHazard: (hazard: Hazard) => void;
}

/**
 * The compact "live map" preview embedded at the top of the Home screen
 * (section 9) — same marker language as the full-screen Map tab
 * (`components/map/MapScreen.tsx`) but non-navigational: locate/layers
 * buttons and tapping the map itself hand off to the full Map tab rather
 * than duplicating pan/zoom/route logic here.
 */
export function HazardMapPreview({ center, hazards, onSelectHazard }: HazardMapPreviewProps) {
  return (
    <View style={styles.container}>
      <MapLibreMap
        style={StyleSheet.absoluteFill}
        mapStyle={MAP_STYLE_JSON}
        compass={false}
        dragPan={false}
        touchZoom={false}
        touchRotate={false}
        touchPitch={false}
        doubleTapZoom={false}
        doubleTapHoldZoom={false}
        attribution={false}
        logo={false}
      >
        <Camera initialViewState={{ center: toMapLibreCoordinate(center), zoom: 13.5 }} />
        {hazards.map((hazard) => (
          <HazardMarker key={hazard.id} hazard={hazard} onPress={onSelectHazard} />
        ))}
      </MapLibreMap>

      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.push('/(tabs)/map')} accessibilityLabel="Open full map" />

      <View style={styles.controls}>
        <Pressable style={[styles.controlButton, shadow.sm]} onPress={() => router.push('/(tabs)/map')} accessibilityLabel="Center on my location">
          <LocateFixed size={18} color={colors.text} />
        </Pressable>
        <Pressable style={[styles.controlButton, shadow.sm]} onPress={() => router.push('/(tabs)/map')} accessibilityLabel="Map layers">
          <LayersIcon size={18} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 260, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  controls: { position: 'absolute', top: 12, right: 12, gap: 8 },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
