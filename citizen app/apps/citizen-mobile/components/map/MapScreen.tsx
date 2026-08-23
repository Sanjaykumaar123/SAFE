/**
 * Full-page real-time map screen with Google Maps-style Safe Route planning:
 * - Dual From/To routing with live "you are here" GPS, reverse geocoding, and map pin dropping.
 * - Ranked road-routed alternatives scored by hazard exposure corridor.
 * - Turn-by-turn navigation preview and Google Maps navigation export.
 * - Live "new hazard ahead" banner on active route.
 */
import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  UserLocation,
  type PressEvent,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flag, MapPin, MapPinOff, Navigation } from 'lucide-react-native';

import { DEFAULT_MAP_CENTER, DEFAULT_RADIUS_METERS } from '@/constants/config';
import { MAP_STYLE_JSON } from '@/constants/mapStyle';
import { SEVERITY_OPTIONS, type SeverityType } from '@/constants/severity';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import { useLiveLocation } from '@/features/location/useLiveLocation';
import { useNearbyHazards } from '@/features/hazards/useNearbyHazards';
import { HAZARD_CORRIDOR_METERS, useSafeRoute } from '@/features/routes/useSafeRoute';
import { reverseGeocode } from '@/services/routing/geocodingService';
import { distanceToPolylineMeters, haversineDistanceMeters } from '@/utils/geo';
import { toMapLibreCoordinate } from '@/utils/geoCoordinate';
import type { Hazard, RoutePlannerLocation, RoutePoint } from '@/types';

import { HazardAlertBanner } from './HazardAlertBanner';
import { HazardDetailCard } from './HazardDetailCard';
import { HazardMarker } from './HazardMarker';
import { MapControls } from './MapControls';
import { MapSearchBar } from './MapSearchBar';
import { RouteSheet } from './RouteSheet';
import { SeverityLegend } from './SeverityLegend';

const FOLLOW_ZOOM = 16.5;
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
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [activeSeverities, setActiveSeverities] = useState<Set<SeverityType>>(
    () => new Set(SEVERITY_OPTIONS.map((option) => option.value))
  );

  // Route Planning Locations (Origin "From" & Destination "To")
  const [origin, setOrigin] = useState<RoutePlannerLocation | null>(null);
  const [destination, setDestination] = useState<RoutePlannerLocation | null>(null);
  const [pickingTarget, setPickingTarget] = useState<'origin' | 'destination' | null>(null);

  const [selectedHazard, setSelectedHazard] = useState<Hazard | null>(null);
  const [bannerHazard, setBannerHazard] = useState<Hazard | null>(null);

  const nearbyHazards = useNearbyHazards(viewportCenter, viewportRadius);
  const visibleHazards = useMemo(
    () => (nearbyHazards.data?.items ?? []).filter((hazard) => activeSeverities.has(hazard.severity)),
    [nearbyHazards.data, activeSeverities]
  );

  // Default origin to live location once available if not explicitly set
  useEffect(() => {
    if (live.coords && !origin) {
      setOrigin({
        point: { latitude: live.coords.latitude, longitude: live.coords.longitude },
        label: 'Your location',
        isCurrentLocation: true,
      });
    }
  }, [live.coords, origin]);

  // Center on user's location the first time a fix resolves
  useEffect(() => {
    if (!live.coords || hasCenteredRef.current) return;
    hasCenteredRef.current = true;
    const point = { latitude: live.coords.latitude, longitude: live.coords.longitude };
    cameraRef.current?.easeTo({ center: toMapLibreCoordinate(point), zoom: FOLLOW_ZOOM, duration: 400 });
    setViewportCenter(point);
  }, [live.coords]);

  // Keep camera on user while follow mode is on
  useEffect(() => {
    if (!isFollowing || !live.coords || !hasCenteredRef.current || destination) return;
    cameraRef.current?.easeTo({ center: toMapLibreCoordinate(live.coords), zoom: FOLLOW_ZOOM, duration: 350 });
  }, [isFollowing, live.coords, destination]);

  // Reset seen hazard set on active route change
  useEffect(() => {
    knownRouteHazardIdsRef.current = new Set(safeRoute.selected?.hazardsOnRoute.map((w) => w.hazard.id) ?? []);
  }, [safeRoute.selected?.id, safeRoute.selected?.hazardsOnRoute]);

  // Live safety check: alert if newly reported hazard sits on active route
  useEffect(() => {
    if (!safeRoute.selected || !nearbyHazards.data) return;
    const routeCoords = safeRoute.selected.coordinates;
    const onRouteNow = nearbyHazards.data.items.filter(
      (hazard) => distanceToPolylineMeters({ latitude: hazard.latitude, longitude: hazard.longitude }, routeCoords) <= HAZARD_CORRIDOR_METERS
    );
    const freshlySeen = onRouteNow.filter((hazard) => !knownRouteHazardIdsRef.current.has(hazard.id));
    if (freshlySeen.length > 0) {
      knownRouteHazardIdsRef.current = new Set([...knownRouteHazardIdsRef.current, ...onRouteNow.map((h) => h.id)]);
      setBannerHazard(freshlySeen[0]);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBannerHazard(null), 7000);
    }
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

  // Compute route when origin and destination are present
  const triggerRouteCalculation = useCallback(
    (orig: RoutePlannerLocation | null, dest: RoutePlannerLocation | null) => {
      if (!dest) {
        safeRoute.clear();
        return;
      }

      const fromPoint: RoutePoint = orig?.point ?? (live.coords ? { latitude: live.coords.latitude, longitude: live.coords.longitude } : (viewportCenter ?? DEFAULT_MAP_CENTER));

      setSelectedHazard(null);
      setBannerHazard(null);
      setIsFollowing(false);
      safeRoute.calculate(fromPoint, dest.point);
    },
    [live.coords, viewportCenter, safeRoute]
  );

  const handleSelectOrigin = useCallback(
    (loc: RoutePlannerLocation) => {
      setOrigin(loc);
      if (destination) {
        triggerRouteCalculation(loc, destination);
      }
    },
    [destination, triggerRouteCalculation]
  );

  const handleSelectDestination = useCallback(
    (loc: RoutePlannerLocation) => {
      setDestination(loc);
      triggerRouteCalculation(origin, loc);
    },
    [origin, triggerRouteCalculation]
  );

  const handleSwapPoints = useCallback(() => {
    const currentOrigin = origin ?? (live.coords ? { point: live.coords, label: 'Your location', isCurrentLocation: true } : null);
    const currentDestination = destination;

    if (!currentOrigin && !currentDestination) return;

    setOrigin(currentDestination);
    setDestination(currentOrigin);

    if (currentOrigin && currentDestination) {
      triggerRouteCalculation(currentDestination, currentOrigin);
    }
  }, [origin, destination, live.coords, triggerRouteCalculation]);

  const handleClearRoute = useCallback(() => {
    safeRoute.clear();
    setDestination(null);
    setBannerHazard(null);
    knownRouteHazardIdsRef.current = new Set();
  }, [safeRoute]);

  // Fit camera bounds to show full route from Origin to Destination
  useEffect(() => {
    if (safeRoute.status !== 'ready' || !safeRoute.selected) return;
    const coords = safeRoute.selected.coordinates;
    if (coords.length === 0) return;
    const lats = coords.map((c) => c.latitude);
    const lons = coords.map((c) => c.longitude);
    const bounds: [number, number, number, number] = [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
    cameraRef.current?.fitBounds(bounds, { padding: { top: insets.top + 160, right: 60, bottom: 280, left: 60 }, duration: 600 });
  }, [safeRoute.status, safeRoute.selected?.id, insets.top]);

  // Map press / long press handling
  const handleMapPress = useCallback(
    async (event: NativeSyntheticEvent<PressEvent>) => {
      if (!pickingTarget) return;

      const [longitude, latitude] = event.nativeEvent.lngLat;
      const point: RoutePoint = { latitude, longitude };
      const placeName = await reverseGeocode(point);

      const loc: RoutePlannerLocation = {
        point,
        label: placeName,
        isCurrentLocation: false,
      };

      if (pickingTarget === 'origin') {
        handleSelectOrigin(loc);
      } else {
        handleSelectDestination(loc);
      }

      setPickingTarget(null);
    },
    [pickingTarget, handleSelectOrigin, handleSelectDestination]
  );

  const handleLongPress = useCallback(
    async (event: NativeSyntheticEvent<PressEvent>) => {
      if (pickingTarget) return;

      const [longitude, latitude] = event.nativeEvent.lngLat;
      const point: RoutePoint = { latitude, longitude };
      const placeName = await reverseGeocode(point);

      const loc: RoutePlannerLocation = {
        point,
        label: placeName,
        isCurrentLocation: false,
      };

      handleSelectDestination(loc);
    },
    [pickingTarget, handleSelectDestination]
  );

  // Heatmap GeoJSON
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
        onPress={handleMapPress}
        onRegionWillChange={handleRegionWillChange}
        onRegionDidChange={handleRegionDidChange}
        onLongPress={handleLongPress}
      >
        <Camera ref={cameraRef} initialViewState={{ center: toMapLibreCoordinate(initialCenter), zoom: FOLLOW_ZOOM }} />
        {live.status === 'granted' ? <UserLocation animated /> : null}

        {/* Heatmap or Hazard Markers */}
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

        {/* Safe Route Options Polylines */}
        {safeRoute.options.map((option) => {
          const isSelected = option.id === (safeRoute.selectedId ?? safeRoute.options[0]?.id);
          return (
            <GeoJSONSource
              key={option.id}
              id={`route-${option.id}`}
              data={{
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: option.coordinates.map(toMapLibreCoordinate) },
              }}
              onPress={() => safeRoute.setSelectedId(option.id)}
            >
              <Layer
                type="line"
                id={`route-line-${option.id}`}
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                paint={{
                  'line-color': isSelected ? (option.isSafest ? colors.green : colors.primaryBlue) : `${colors.textSecondary}70`,
                  'line-width': isSelected ? 6 : 3.5,
                  ...(isSelected ? {} : { 'line-dasharray': [2, 2] }),
                }}
              />
            </GeoJSONSource>
          );
        })}

        {/* Origin Marker (Green Pin / Start Marker) */}
        {origin && !origin.isCurrentLocation && (
          <MapLibreMarker lngLat={toMapLibreCoordinate(origin.point)}>
            <View style={styles.originPin}>
              <View style={styles.originInnerCircle} />
            </View>
          </MapLibreMarker>
        )}

        {/* Destination Marker (Red Finish Pin) */}
        {destination && (
          <MapLibreMarker lngLat={toMapLibreCoordinate(destination.point)}>
            <View style={styles.destinationPin}>
              <Flag size={13} color={colors.white} />
            </View>
          </MapLibreMarker>
        )}
      </MapLibreMap>

      {/* Permission Needed Card */}
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

      {/* Google Maps-style Search & Route Planner */}
      <MapSearchBar
        topOffset={insets.top + spacing.sm}
        origin={origin}
        destination={destination}
        userCoords={live.coords}
        hasActiveRoute={destination !== null}
        isPickingOnMap={pickingTarget !== null}
        onSelectOrigin={handleSelectOrigin}
        onSelectDestination={handleSelectDestination}
        onSwapPoints={handleSwapPoints}
        onClear={handleClearRoute}
        onStartPickOnMap={(target) => setPickingTarget(target)}
        onCancelPickOnMap={() => setPickingTarget(null)}
      />

      {/* Map Side Controls */}
      <MapControls
        topOffset={insets.top + (destination ? 140 : 64)}
        isFollowing={isFollowing}
        layersActive={layersOpen}
        onRecenter={handleRecenter}
        onToggleLayers={() => setLayersOpen((value) => !value)}
        heatmapActive={showHeatmap}
        onToggleHeatmap={() => setShowHeatmap((value) => !value)}
      />

      {/* Severity Legend */}
      {layersOpen && (
        <SeverityLegend
          topOffset={insets.top + (destination ? 140 : 64) + 44 + spacing.sm}
          activeSeverities={activeSeverities}
          onToggleSeverity={toggleSeverity}
        />
      )}

      {/* Live Route Hazard Alert Banner */}
      <HazardAlertBanner
        hazard={bannerHazard}
        topOffset={insets.top + (destination ? 140 : 64)}
        rightOffset={BANNER_RIGHT_INSET}
        onDismiss={() => setBannerHazard(null)}
      />

      {/* Hazard Detail Card (when tapped on map and not actively in route preview) */}
      {selectedHazard && !destination && (
        <HazardDetailCard hazard={selectedHazard} bottomInset={insets.bottom} onClose={() => setSelectedHazard(null)} />
      )}

      {/* Google Maps-style Route Details Bottom Sheet */}
      <RouteSheet
        status={safeRoute.status}
        errorMessage={safeRoute.errorMessage}
        origin={origin}
        destination={destination}
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

  // Origin & Destination Pin Styles
  originPin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.green,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.md,
  },
  originInnerCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  destinationPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.critical,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.md,
  },

  // Permission Overlay
  permissionOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    zIndex: 30,
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
