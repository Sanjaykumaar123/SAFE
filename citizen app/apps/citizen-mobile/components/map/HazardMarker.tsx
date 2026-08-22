/**
 * A single hazard pin: circular, white-bordered, colored by severity, with
 * a type icon — matches the "Map Markers" spec in the design system.
 * CRITICAL markers pulsate subtly to read as real-time/urgent; every other
 * severity renders as a static dot so the map stays smooth with dozens of
 * markers on screen.
 */
import { Marker } from '@maplibre/maplibre-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { CircleAlert, Construction, TriangleAlert, Waves } from 'lucide-react-native';

import { Severity } from '@/constants/severity';
import { HazardType } from '@/constants/hazardType';
import { colors, severityColors, shadow } from '@/constants/theme';
import type { Hazard } from '@/types';
import { toMapLibreCoordinate } from '@/utils/geoCoordinate';

interface Props {
  hazard: Hazard;
  onPress: (hazard: Hazard) => void;
}

/** Renders the already-picked icon element directly (rather than handing
 * back a component reference) so this stays a plain render helper, not a
 * component defined during render. */
function renderHazardIcon(type: Hazard['type'], color: string) {
  switch (type) {
    case HazardType.FLOODING:
      return <Waves size={13} color={color} strokeWidth={2.5} />;
    case HazardType.POTHOLE:
    case HazardType.ROAD_DAMAGE:
    case HazardType.BROKEN_PAVEMENT:
      return <Construction size={13} color={color} strokeWidth={2.5} />;
    case HazardType.DEBRIS:
      return <TriangleAlert size={13} color={color} strokeWidth={2.5} />;
    default:
      return <CircleAlert size={13} color={color} strokeWidth={2.5} />;
  }
}

export function HazardMarker({ hazard, onPress }: Props) {
  const isCritical = hazard.severity === Severity.CRITICAL;
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (isCritical) {
      pulse.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }), -1, false);
    }
  }, [isCritical, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 1 - pulse.value,
    transform: [{ scale: 1 + pulse.value * 1.3 }],
  }));

  const color = severityColors[hazard.severity];

  return (
    <Marker lngLat={toMapLibreCoordinate(hazard)} onPress={() => onPress(hazard)}>
      <View style={styles.wrap}>
        {isCritical && <Animated.View style={[styles.ring, { borderColor: color }, ringStyle]} />}
        <View style={[styles.dot, { backgroundColor: color }]}>{renderHazardIcon(hazard.type, colors.white)}</View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 30, height: 30, borderRadius: 15, borderWidth: 2 },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
});
