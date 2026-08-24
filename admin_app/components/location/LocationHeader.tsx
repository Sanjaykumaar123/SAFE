/** §concept — the sticky "location context" card shown across Dashboard/
 * Hazards/Fleet once a place has been searched: name, state, live-data
 * indicator, and the radius selector, matching the Stitch design
 * reference's "Location Context Header". */
import { MapPin, RefreshCw } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RadiusSelector } from './RadiusSelector';
import { RADIUS_STEPS_KM, colors, radius, shadow, spacing, typography } from '@/constants/theme';
import type { LocationContext } from '@/types/geo';

export function LocationHeader({ place, onChangeLocation, onRadiusChange, resultCountLabel }: {
  place: LocationContext;
  onChangeLocation: () => void;
  onRadiusChange: (km: (typeof RADIUS_STEPS_KM)[number]) => void;
  resultCountLabel?: string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={styles.titleRow}>
            <MapPin size={14} color={colors.primaryBlue} />
            <Text style={styles.title} numberOfLines={1}>
              {place.name.toUpperCase()}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.meta} numberOfLines={1}>
              {place.subtitle}
            </Text>
            <View style={styles.liveDot} />
            <Text style={styles.live}>LIVE DATA</Text>
          </View>
        </View>
        <Pressable onPress={onChangeLocation} style={styles.changeButton} accessibilityRole="button" accessibilityLabel="Change location">
          <RefreshCw size={14} color={colors.primaryBlue} />
        </Pressable>
      </View>

      <RadiusSelector valueKm={place.radiusKm} onChange={onRadiusChange} />
      {resultCountLabel ? <Text style={styles.resultCount}>{resultCountLabel}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: radius.lg, padding: spacing.sm + 2, borderWidth: 1, borderColor: colors.border, gap: spacing.xs, ...shadow.sm },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  titleWrap: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { ...typography.headlineMd, fontSize: 15, color: colors.deepNavy },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { ...typography.caps, color: colors.textSecondary },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.critical, marginLeft: 4 },
  live: { ...typography.caps, color: colors.critical },
  changeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  resultCount: { ...typography.numeric, color: colors.textSecondary, fontSize: 11 },
});
