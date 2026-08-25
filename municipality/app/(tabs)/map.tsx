import { router } from 'expo-router';
import {
  AlertTriangle,
  Clock,
  Crosshair,
  Eye,
  Layers,
  MapPin,
  Wrench,
  X,
} from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { DEFAULT_MAP_CENTER } from '@/constants/config';
import { rasterStyleFor } from '@/constants/mapStyle';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import { useHazards } from '@/features/hazards/useHazards';
import { useMapStore } from '@/store/mapStore';
import { useMunicipalityStore } from '@/store/municipalityStore';
import type { MunicipalityHazard } from '@/types/municipality';
import { toMapLibreCoordinate } from '@/utils/geoCoordinate';

let MapLibreMap: any = null;
let Camera: any = null;
let MapLibreMarker: any = null;
let UserLocation: any = null;
let isMapLibreAvailable = false;

try {
  const mod = require('@maplibre/maplibre-react-native');
  MapLibreMap = mod.Map;
  Camera = mod.Camera;
  MapLibreMarker = mod.Marker;
  UserLocation = mod.UserLocation;
  if (MapLibreMap && Camera) {
    isMapLibreAvailable = true;
  }
} catch {
  isMapLibreAvailable = false;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#E5484D',
  HIGH: '#F97316',
  MEDIUM: '#F59E0B',
  LOW: '#3B82F6',
};

type MapLayerMode = 'street' | 'satellite' | 'osm';

// §map-provider — none of these three need a key either; the previous
// react-native-maps version already used free tile providers for the
// *visible* tiles, but Android's underlying MapView was still Google Play
// Services' native Maps SDK regardless (needing a billed key just to
// initialize at all). MapLibre has no such hidden dependency.
const TILE_URLS: Record<MapLayerMode, string> = {
  street: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  osm: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
};

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<any>(null);

  const selectedCityId = useMunicipalityStore((s) => s.selectedCityId);
  const authorizedCities = useMunicipalityStore((s) => s.authorizedCities);
  const selectedCity = authorizedCities.find((c) => c.id === selectedCityId);

  const viewport = useMapStore((s) => s.viewport);
  const setViewport = useMapStore((s) => s.setViewport);

  const [activeSeverity, setActiveSeverity] = useState<string>('ALL');
  const [activeStatus, setActiveStatus] = useState<string>('ALL');
  const [selectedHazard, setSelectedHazard] = useState<MunicipalityHazard | null>(null);
  const [layerMode, setLayerMode] = useState<MapLayerMode>('street');

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    if (activeSeverity !== 'ALL') f.severity = activeSeverity;
    if (activeStatus !== 'ALL') f.status = activeStatus;
    return f;
  }, [activeSeverity, activeStatus]);

  const centerLat = selectedCity?.centerLatitude ?? DEFAULT_MAP_CENTER.latitude;
  const centerLon = selectedCity?.centerLongitude ?? DEFAULT_MAP_CENTER.longitude;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, isError, error, refetch } = useHazards(selectedCityId, filters, viewport ?? undefined);

  const onRegionDidChange = useCallback(
    (event: { nativeEvent?: any }) => {
      const nativeEvent = event?.nativeEvent;
      if (!nativeEvent?.bounds) return;
      const [west, south, east, north] = nativeEvent.bounds;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => setViewport({ north, south, east, west }), 400);
    },
    [setViewport]
  );

  const handleRecenter = () => {
    cameraRef.current?.easeTo({ center: [centerLon, centerLat], zoom: 12, duration: 800 });
  };

  const toggleLayerMode = () => {
    setLayerMode((prev) => (prev === 'street' ? 'satellite' : prev === 'satellite' ? 'osm' : 'street'));
  };

  const handleMarkerPress = (hazard: MunicipalityHazard) => {
    setSelectedHazard(hazard);
    cameraRef.current?.easeTo({ center: [hazard.longitude, hazard.latitude - 0.006], zoom: 15, duration: 500 });
  };

  const hazardsList = data?.items ?? [];
  const mapStyle = useMemo(() => rasterStyleFor(TILE_URLS[layerMode]), [layerMode]);

  return (
    <View style={styles.flex}>
      {isMapLibreAvailable ? (
        <MapLibreMap
          key={layerMode}
          style={StyleSheet.absoluteFill}
          mapStyle={mapStyle}
          onRegionDidChange={onRegionDidChange}
          onPress={() => setSelectedHazard(null)}
          compass={false}
        >
          <Camera ref={cameraRef} initialViewState={{ center: [centerLon, centerLat], zoom: 12 }} />
          {UserLocation ? <UserLocation animated /> : null}

          {hazardsList.map((hazard) => {
            const pinColor = SEVERITY_COLORS[hazard.severity] || colors.primaryBlue;
            return (
              <MapLibreMarker key={hazard.id} lngLat={toMapLibreCoordinate(hazard)} onPress={() => handleMarkerPress(hazard)}>
                <View style={[styles.hazardPin, { backgroundColor: pinColor, borderWidth: selectedHazard?.id === hazard.id ? 3 : 2 }]}>
                  <AlertTriangle size={12} color="#FFFFFF" />
                </View>
              </MapLibreMarker>
            );
          })}
        </MapLibreMap>
      ) : (
        <View style={styles.mapFallbackBg}>
          <View style={styles.mapFallbackCenter}>
            <MapPin size={32} color={colors.primaryBlue} />
            <Text style={styles.mapFallbackTitle}>{selectedCity?.name ?? 'Bengaluru'} Road Intelligence Map</Text>
            <Text style={styles.mapFallbackSubtitle}>{hazardsList.length} active road hazards tracked across wards.</Text>
          </View>
        </View>
      )}

      {/* Top Header & Filter Chips */}
      <View style={[styles.topContainer, { top: insets.top + 8 }]}>
        <View style={styles.cityHeader}>
          <View style={styles.cityHeaderLeft}>
            <MapPin size={16} color="#FFFFFF" />
            <Text style={styles.cityHeaderText}>
              {selectedCity?.name ?? 'City'} · {hazardsList.length} hazards
            </Text>
          </View>
          <TouchableOpacity style={styles.modeBadge} onPress={toggleLayerMode} activeOpacity={0.7}>
            <Text style={styles.modeBadgeText}>
              {layerMode === 'street' ? 'STREET' : layerMode === 'satellite' ? 'SATELLITE' : 'OSM'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Horizontal Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => {
            const isActive = activeSeverity === sev;
            const chipColor = sev === 'ALL' ? colors.deepNavy : SEVERITY_COLORS[sev] || colors.primaryBlue;

            return (
              <TouchableOpacity
                key={sev}
                style={[
                  styles.filterChip,
                  isActive && { backgroundColor: chipColor, borderColor: chipColor },
                ]}
                onPress={() => setActiveSeverity(sev)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {sev}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Floating Action Controls */}
      <View style={[styles.fabContainer, { top: insets.top + 100 }]}>
        <TouchableOpacity
          style={styles.fabButton}
          onPress={toggleLayerMode}
          activeOpacity={0.8}
        >
          <Layers size={20} color={colors.deepNavy} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fabButton}
          onPress={handleRecenter}
          activeOpacity={0.8}
        >
          <Crosshair size={20} color={colors.primaryBlue} />
        </TouchableOpacity>
      </View>

      {/* Selected Hazard Bottom Preview Card */}
      {selectedHazard ? (
        <View style={[styles.hazardCard, { bottom: insets.bottom + 16 }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View
                style={[
                  styles.severityTag,
                  { backgroundColor: `${SEVERITY_COLORS[selectedHazard.severity]}20` },
                ]}
              >
                <Text
                  style={[
                    styles.severityTagText,
                    { color: SEVERITY_COLORS[selectedHazard.severity] },
                  ]}
                >
                  {selectedHazard.severity}
                </Text>
              </View>
              <Text style={styles.cardHazardCode}>{selectedHazard.hazardCode}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedHazard(null)}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.cardBody}>
            {selectedHazard.imageUrl ? (
              <Image
                source={{ uri: selectedHazard.imageUrl }}
                style={styles.cardThumbnail}
              />
            ) : null}
            <View style={styles.cardInfo}>
              <Text style={styles.cardRoadName} numberOfLines={1}>
                {selectedHazard.roadName || selectedHazard.locationText}
              </Text>
              <Text style={styles.cardLocation} numberOfLines={2}>
                {selectedHazard.locationText}
              </Text>
              <View style={styles.statusRow}>
                <Clock size={12} color={colors.textSecondary} />
                <Text style={styles.statusText}>Status: {selectedHazard.status}</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionButtonSecondary}
              onPress={() => router.push(`/hazard/${selectedHazard.id}`)}
            >
              <Eye size={16} color={colors.deepNavy} />
              <Text style={styles.actionButtonSecondaryText}>View Evidence</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButtonPrimary}
              onPress={() => router.push(`/repair/assign?hazardId=${selectedHazard.id}`)}
            >
              <Wrench size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonPrimaryText}>Assign Repair</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.overlay}>
          <LoadingState label="Loading city map…" />
        </View>
      ) : null}

      {isError ? (
        <View style={styles.overlay}>
          <ErrorState message={(error as Error)?.message ?? 'Map data unavailable.'} onRetry={refetch} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#E5E9F0' },
  hazardPin: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 3 },
  topContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
    gap: spacing.xs,
    zIndex: 20,
  },
  cityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(11, 31, 51, 0.94)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadow.md,
  },
  cityHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cityHeaderText: {
    color: '#FFFFFF',
    ...typography.labelMd,
    fontWeight: '700',
  },
  modeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  modeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  filterRow: {
    gap: spacing.xs,
    paddingVertical: 4,
  },
  filterChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  filterChipText: {
    ...typography.labelSm,
    color: colors.text,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  fabContainer: {
    position: 'absolute',
    right: 14,
    gap: spacing.sm,
    zIndex: 20,
  },
  fabButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.md,
  },
  hazardCard: {
    position: 'absolute',
    left: 14,
    right: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.md,
    zIndex: 30,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  severityTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  severityTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardHazardCode: {
    ...typography.headlineMd,
    fontSize: 16,
    color: colors.deepNavy,
  },
  closeButton: {
    padding: 4,
  },
  cardBody: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardThumbnail: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardRoadName: {
    ...typography.labelMd,
    color: colors.text,
    fontWeight: '700',
  },
  cardLocation: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusText: {
    ...typography.labelSm,
    color: colors.textSecondary,
    fontSize: 11,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  actionButtonSecondaryText: {
    ...typography.labelMd,
    color: colors.deepNavy,
  },
  actionButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.primaryBlue,
  },
  actionButtonPrimaryText: {
    ...typography.labelMd,
    color: '#FFFFFF',
  },
  overlay: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 25,
  },
  mapFallbackBg: {
    flex: 1,
    backgroundColor: '#E5E9F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  mapFallbackCenter: {
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    borderRadius: radius.lg,
    ...shadow.md,
  },
  mapFallbackTitle: {
    ...typography.headlineMd,
    color: colors.deepNavy,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  mapFallbackSubtitle: {
    ...typography.bodyMd,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
