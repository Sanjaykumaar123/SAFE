/**
 * The full-page real-time map — live "you are here" tracking, nearby
 * hazards that refresh on a poll, and Safe Route: search (or long-press)
 * a destination, get ranked road-routed alternatives scored by hazard
 * exposure, and follow the recommended one with a live "new hazard ahead"
 * warning if one appears on it while it's active. This is the entire
 * screen (`app/index.tsx` just renders it) — no navigation chrome, so the
 * map itself fills the device edge-to-edge like a native maps app.
 *
 * §map-provider — runs on MapLibre Native, not react-native-maps/Google
 * Maps (constants/mapStyle.ts) — no billed Google Cloud API key needed.
 */
import { Camera, type CameraRef, GeoJSONSource, Layer, Map as MapLibreMap, Marker as MapLibreMarker, UserLocation, type PressEvent, type ViewStateChangeEvent } from '@maplibre/maplibre-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPinOff } from 'lucide-react-native';

import { DEFAULT_MAP_CENTER, DEFAULT_RADIUS_METERS } from '@/constants/config';
import { MAP_STYLE_JSON } from '@/constants/mapStyle';
import { SEVERITY_OPTIONS, type SeverityType } from '@/constants/severity';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import { useLiveLocation } from '@/features/location/useLiveLocation';
import { useNearbyHazards } from '@/features/hazards/useNearbyHazards';
import { HAZARD_CORRIDOR_METERS, useSafeRoute } from '@/features/routes/useSafeRoute';
import { distanceToPolylineMeters, haversineDistanceMeters } from '@/utils/geo';
import { toMapLibreCoordinate } from '@/utils/geoCoordinate';
import type { Hazard, LocationSearchResult, RoutePoint } from '@/types';

import { HazardAlertBanner } from './HazardAlertBanner';
import { HazardDetailCard } from './HazardDetailCard';
import { HazardMarker } from './HazardMarker';
import { MapControls } from './MapControls';
import { MapSearchBar } from './MapSearchBar';
import { RouteSheet } from './RouteSheet';
import { SeverityLegend } from './SeverityLegend';

const FOLLOW_ZOOM = 16.5;
const SEARCH_ROW_HEIGHT = 48;
const CONTROLS_TOP_GAP = spacing.sm + SEARCH_ROW_HEIGHT + spacing.sm;
const BANNER_RIGHT_INSET = spacing.md + 44 + spacing.sm;

const SEVERITY_HEATMAP_WEIGHT: Record<SeverityType, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

export function MapScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraRef | null>(null);
  const hasCenteredRef = useRef(false);
  const knownRouteHazardIdsRef = useRef<Set<string>>(new Set());
  const regionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const live = useLiveLocation();
  const safeRoute = useSafeRoute();

  const [viewportCenter, setViewportCenter] = useState<RoutePoint | null>(null);
  const [viewportRadius, setViewportRadius] = useState(DEFAULT_RADIUS_METERS);
  const [isFollowing, setIsFollowing] = useState(true);
  const [layersOpen, setLayersOpen] = useState(false);
  // §heatmap — "GPS marked on the map as a heatmap for citizens". A plain
  // MapLibre style layer (unlike react-native-maps' Google-only Heatmap),
  // so it works identically on iOS and Android with no extra key.
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [activeSeverities, setActiveSeverities] = useState<Set<SeverityType>>(
    () => new Set(SEVERITY_OPTIONS.map((option) => option.value))
  );
  const [destination, setDestination] = useState<{ point: RoutePoint; label: string } | null>(null);
  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);
  const [bannerHazard, setBannerHazard] = useState<Hazard | null>(null);

  const nearbyHazards = useNearbyHazards(viewportCenter, viewportRadius);
  const visibleHazards = useMemo(
    () => (nearbyHazards.data?.items ?? []).filter((hazard) => activeSeverities.has(hazard.severity)),
    [nearbyHazards.data, activeSeverities]
  );

  // Center on the user's location the first time a fix resolves.
  useEffect(() => {
    if (!live.coords || hasCenteredRef.current) return;
    hasCenteredRef.current = true;
    const point = { latitude: live.coords.latitude, longitude: live.coords.longitude };
    cameraRef.current?.easeTo({ center: toMapLibreCoordinate(point), zoom: FOLLOW_ZOOM, duration: 400 });
    setViewportCenter(point);
  }, [live.coords]);

  // Keep the camera on the user while follow mode is on.
  useEffect(() => {
    if (!isFollowing || !live.coords || !hasCenteredRef.current) return;
    cameraRef.current?.easeTo({ center: toMapLibreCoordinate(live.coords), zoom: FOLLOW_ZOOM, duration: 350 });
  }, [isFollowing, live.coords]);

  // Reset the "seen" hazard set whenever the active route changes.
  useEffect(() => {
    knownRouteHazardIdsRef.current = new Set(safeRoute.selected?.hazardsOnRoute.map((warning) => warning.hazard.id) ?? []);
  }, [safeRoute.selected?.id, safeRoute.selected?.hazardsOnRoute]);

  // Live safety check: if the hazard poll turns up something new sitting on
  // the active route, surface it immediately instead of waiting for the
  // user to re-open the route sheet.
  useEffect(() => {
    if (!safeRoute.selected || !nearbyHazards.data) return;
    const routeCoords = safeRoute.selected.coordinates;
    const onRouteNow = nearbyHazards.data.items.filter(
      (hazard) => distanceToPolylineMeters({ latitude: hazard.latitude, longitude: hazard.longitude }, routeCoords) <= HAZARD_CORRIDOR_METERS
    );
    const freshlySeen = onRouteNow.filter((hazard) => !knownRouteHazardIdsRef.current.has(hazard.id));
    if (freshlySeen.length > 0) {
      knownRouteHazardIdsRef.current = new Set([...knownRouteHazardIdsRef.current, ...onRouteNow.map((hazard) => hazard.id)]);
      setBannerHazard(freshlySeen[0]);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBannerHazard(null), 7000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearbyHazards.data, safeRoute.selected?.id]);

  useEffect(
    () => () => {
      if (regionDebounceRef.current) clearTimeout(regionDebounceRef.current);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    },
    []
  );

  const handleRegionDidChange = useCallback((event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    const nativeEvent = event?.nativeEvent;
    if (!nativeEvent?.center || !nativeEvent?.bounds) return;
    const { center, bounds } = nativeEvent;
    if (regionDebounceRef.current) clearTimeout(regionDebounceRef.current);
    regionDebounceRef.current = setTimeout(() => {
      const [west, , east] = bounds;
      setViewportCenter({ latitude: center[1], longitude: center[0] });
      const spanMeters = haversineDistanceMeters({ latitude: center[1], longitude: west }, { latitude: center[1], longitude: east });
      setViewportRadius(Math.min(Math.max(spanMeters, 600), 20000));
    }, 400);
  }, []);

  // MapLibre has no isolated "user dragged the map" event the way
  // react-native-maps' onPanDrag did — `onRegionWillChange`'s
  // `userInteraction` flag distinguishes a real touch-driven move (pan,
  // pinch, or rotate) from one of this screen's own `easeTo` calls, which
  // is actually a better signal than onPanDrag ever was (that only caught
  // drags, not pinch-zoom).
  const handleRegionWillChange = useCallback((event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    if (event?.nativeEvent?.userInteraction) setIsFollowing(false);
  }, []);

  const handleRecenter = useCallback(() => {
    setIsFollowing(true);
    if (live.coords) {
      cameraRef.current?.easeTo({ center: toMapLibreCoordinate(live.coords), zoom: FOLLOW_ZOOM, duration: 400 });
    } else {
      live.retry();
    }
  }, [live]);

  const toggleSeverity = useCallback((severity: SeverityType) => {
    setActiveSeverities((previous) => {
      const next = new Set(previous);
      if (next.has(severity)) {
        next.delete(severity);
      } else {
        next.add(severity);
      }
      return next;
    });
  }, []);

  function startRoute(point: RoutePoint, label: string) {
    const origin: RoutePoint = live.coords
      ? { latitude: live.coords.latitude, longitude: live.coords.longitude }
      : (viewportCenter ?? DEFAULT_MAP_CENTER);
    setSelectedHazard(null);
    setBannerHazard(null);
    setDestination({ point, label });
    setIsFollowing(false);
    safeRoute.calculate(origin, point);
  }

  // Fit the camera to whichever route is selected once real road geometry
  // comes back (and again if the rider switches to a different alternative).
  useEffect(() => {
    if (safeRoute.status !== 'ready' || !safeRoute.selected) return;
    const coords = safeRoute.selected.coordinates;
    if (coords.length === 0) return;
    const lats = coords.map((c) => c.latitude);
    const lons = coords.map((c) => c.longitude);
    const bounds: [number, number, number, number] = [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
    cameraRef.current?.fitBounds(bounds, { padding: { top: insets.top + 140, right: 60, bottom: 260, left: 60 }, duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeRoute.status, safeRoute.selected?.id]);

  const handleClearRoute = useCallback(() => {
    safeRoute.clear();
    setDestination(null);
    setBannerHazard(null);
    knownRouteHazardIdsRef.current = new Set();
  }, [safeRoute]);

  const handleSelectDestination = useCallback((result: LocationSearchResult) => {
    startRoute({ latitude: result.latitude, longitude: result.longitude }, result.label);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLongPress = useCallback((event: NativeSyntheticEvent<PressEvent>) => {
    const [longitude, latitude] = event.nativeEvent.lngLat;
    startRoute({ latitude, longitude }, 'Dropped pin');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // §heatmap — weight by severity so a cluster of CRITICAL potholes reads
  // hotter than the same number of LOW ones, not just "more dots = hotter".
  // GeoJSON feature properties (not a separate `weight` prop, unlike
  // react-native-maps' Heatmap) is how MapLibre's heatmap layer reads it.
  const heatmapGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: visibleHazards.map((hazard) => ({
        type: 'Feature' as const,
        properties: { weight: SEVERITY_HEATMAP_WEIGHT[hazard.severity] ?? 1 },
        geometry: { type: 'Point' as const, coordinates: toMapLibreCoordinate(hazard) },
      })),
    }),
    [visibleHazards]
  );

  const initialCenter = live.coords ?? viewportCenter ?? DEFAULT_MAP_CENTER;

  return (
    <View style={styles.container}>
      <MapLibreMap
        style={StyleSheet.absoluteFill}
        mapStyle={MAP_STYLE_JSON}
        compass={false}
        onRegionWillChange={handleRegionWillChange}
        onRegionDidChange={handleRegionDidChange}
        onLongPress={handleLongPress}
      >
        <Camera ref={cameraRef} initialViewState={{ center: toMapLibreCoordinate(initialCenter), zoom: FOLLOW_ZOOM }} />
        {live.status === 'granted' ? <UserLocation animated /> : null}

        {showHeatmap && heatmapGeoJSON.features.length > 0 ? (
          <GeoJSONSource id="hazard-heatmap" data={heatmapGeoJSON}>
            <Layer
              type="heatmap"
              id="hazard-heatmap-layer"
              paint={{
                'heatmap-weight': ['interpolate', ['linear'], ['get', 'weight'], 1, 0.3, 4, 1],
                'heatmap-intensity': 1,
                'heatmap-radius': 32,
                'heatmap-opacity': 0.75,
                'heatmap-color': [
                  'interpolate',
                  ['linear'],
                  ['heatmap-density'],
                  0,
                  'rgba(0,0,0,0)',
                  0.2,
                  colors.green,
                  0.5,
                  colors.warning,
                  1,
                  colors.critical,
                ],
              }}
            />
          </GeoJSONSource>
        ) : (
          visibleHazards.map((hazard) => <HazardMarker key={hazard.id} hazard={hazard} onPress={setSelectedHazard} />)
        )}

        {safeRoute.options.map((option) => {
          const isSelected = option.id === safeRoute.selectedId;
          return (
            <GeoJSONSource
              key={option.id}
              id={`route-${option.id}`}
              data={{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: option.coordinates.map(toMapLibreCoordinate) } }}
              onPress={() => safeRoute.setSelectedId(option.id)}
            >
              <Layer
                type="line"
                id={`route-line-${option.id}`}
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                paint={{
                  'line-color': isSelected ? (option.isSafest ? colors.green : colors.primaryBlue) : `${colors.textSecondary}80`,
                  'line-width': isSelected ? 5 : 3,
                  ...(isSelected ? {} : { 'line-dasharray': [2, 2] }),
                }}
              />
            </GeoJSONSource>
          );
        })}

        {destination ? (
          <MapLibreMarker lngLat={toMapLibreCoordinate(destination.point)}>
            <View style={styles.destinationPin} />
          </MapLibreMarker>
        ) : null}
      </MapLibreMap>

      {live.status === 'denied' && (
        <View style={styles.permissionOverlay}>
          <View style={styles.permissionCard}>
            <MapPinOff size={28} color={colors.critical} />
            <Text style={styles.permissionTitle}>Location access needed</Text>
            <Text style={styles.permissionBody}>{live.errorMessage}</Text>
            <Pressable style={styles.permissionButton} onPress={() => Linking.openSettings()}>
              <Text style={styles.permissionButtonText}>Open Settings</Text>
            </Pressable>
            <Pressable style={styles.permissionRetry} onPress={live.retry}>
              <Text style={styles.permissionRetryText}>Try again</Text>
            </Pressable>
          </View>
        </View>
      )}

      <MapSearchBar
        topOffset={insets.top + spacing.sm}
        hasActiveRoute={destination !== null}
        onSelectDestination={handleSelectDestination}
        onClear={handleClearRoute}
      />

      <MapControls
        topOffset={insets.top + CONTROLS_TOP_GAP}
        isFollowing={isFollowing}
        layersActive={layersOpen}
        onRecenter={handleRecenter}
        onToggleLayers={() => setLayersOpen((value) => !value)}
        heatmapActive={showHeatmap}
        onToggleHeatmap={() => setShowHeatmap((value) => !value)}
      />

      {layersOpen && (
        <SeverityLegend
          topOffset={insets.top + CONTROLS_TOP_GAP + 44 + spacing.sm}
          activeSeverities={activeSeverities}
          onToggleSeverity={toggleSeverity}
        />
      )}

      <HazardAlertBanner
        hazard={bannerHazard}
        topOffset={insets.top + CONTROLS_TOP_GAP}
        rightOffset={BANNER_RIGHT_INSET}
        onDismiss={() => setBannerHazard(null)}
      />

      {selectedHazard && !destination && (
        <HazardDetailCard hazard={selectedHazard} bottomInset={insets.bottom} onClose={() => setSelectedHazard(null)} />
      )}

      <RouteSheet
        status={safeRoute.status}
        errorMessage={safeRoute.errorMessage}
        destinationLabel={destination?.label ?? null}
        options={safeRoute.options}
        selectedId={safeRoute.selectedId}
        onSelect={safeRoute.setSelectedId}
        onClose={handleClearRoute}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  destinationPin: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primaryBlue, borderWidth: 3, borderColor: colors.white, ...shadow.sm },
  permissionOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    zIndex: 10,
  },
  permissionCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadow.md,
  },
  permissionTitle: { ...typography.headlineMd, color: colors.text, marginTop: spacing.sm, textAlign: 'center' },
  permissionBody: { ...typography.bodyMd, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
  permissionButton: {
    marginTop: spacing.lg,
    height: 44,
    minWidth: 160,
    borderRadius: radius.md,
    backgroundColor: colors.primaryBlue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  permissionButtonText: { ...typography.bodyMd, color: colors.white, fontWeight: '600' },
  permissionRetry: { marginTop: spacing.sm, paddingVertical: spacing.xs },
  permissionRetryText: { ...typography.bodyMd, color: colors.primaryBlue },
});
