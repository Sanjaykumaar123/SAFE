/** §map-provider — MapLibre's `<Marker>` places a plain React Native View
 * on the map (unlike react-native-maps' `<Marker pinColor=.../>`, there's
 * no built-in pin styling), so every marker needs its own visual — this is
 * the one shared pin used across the admin map screens. */
import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';

export function MapMarker({ color = colors.deepNavy, size = 26 }: { color?: string; size?: number }) {
  return (
    <View style={[styles.pin, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <View style={styles.dot} />
    </View>
  );
}

const styles = StyleSheet.create({
  pin: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
});
