/** §11/§70/§72/§concept — SAFEPATH CONTROL CENTER. Before a place is
 * searched this renders the "Where do you want to operate?" home (hero
 * search + national overview) from the design reference; once a place is
 * selected it becomes the split-view radius dashboard (map top, KPI/
 * action-required drawer below) — the same screen, driven entirely by
 * `useLocationStore`. */
import { Camera, type CameraRef, GeoJSONSource, Layer, Map as MapLibreMap, Marker as MapLibreMarker } from '@maplibre/maplibre-react-native';
import { router } from 'expo-router';
import { AlertTriangle, Bell, Building2, Landmark, Menu, Search, Truck, Users } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionRequiredCard } from '@/components/admin/ActionRequiredCard';
import { LocationHeader } from '@/components/location/LocationHeader';
import { MapMarker } from '@/components/location/MapMarker';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { HealthBadge } from '@/components/common/Badge';
import { StatCard } from '@/components/common/StatCard';
import { INDIA_MAP_CENTER } from '@/constants/config';
import { MAP_STYLE_JSON } from '@/constants/mapStyle';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import { useActionRequired, useActivityFeed, useDashboardKpis, useSystemStatusSummary } from '@/features/dashboard/useDashboard';
import { useAuthStore } from '@/store/authStore';
import { useLocationStore } from '@/store/locationStore';
import { formatCompactNumber, formatRelativeTime } from '@/utils/format';
import { POPULAR_PLACES } from '@/services/demo/geoGazetteer';
import { circlePolygonGeoJSON, toMapLibreCoordinate, zoomForRadiusKm } from '@/utils/geoCircle';

export default function DashboardScreen() {
  const place = useLocationStore((s) => s.place);
  return place ? <ScopedDashboard /> : <HomeSearchDashboard />;
}

// ------------------------------------------------------------- No place yet

function HomeSearchDashboard() {
  const admin = useAuthStore((s) => s.admin);
  const setPlace = useLocationStore((s) => s.setPlace);
  const { data: kpis } = useDashboardKpis();
  const { data: status } = useSystemStatusSummary();
  const { data: activity } = useActivityFeed();
  const { data: actionItems } = useActionRequired();

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.homeScroll}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.push('/more')} accessibilityLabel="Menu">
          <Menu size={22} color={colors.primaryBlue} />
        </TouchableOpacity>
        <Text style={styles.brand}>SafePath AI</Text>
        <TouchableOpacity onPress={() => router.push('/search')} accessibilityLabel="Search">
          <Search size={22} color={colors.primaryBlue} />
        </TouchableOpacity>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>WHERE DO YOU WANT TO OPERATE?</Text>
        <Text style={styles.heroGreeting}>Welcome back, {admin?.name.split(' ')[0]} — {admin ? admin.role.replace(/_/g, ' ') : ''}</Text>
        <TouchableOpacity style={styles.searchBar} onPress={() => router.push('/location-search')} accessibilityRole="button">
          <Search size={18} color={colors.textSecondary} />
          <Text style={styles.searchPlaceholder}>Search a city, area, road, PIN or landmark…</Text>
        </TouchableOpacity>

        <Text style={styles.popularLabel}>POPULAR LOCATIONS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularRow}>
          {POPULAR_PLACES.map((p) => (
            <TouchableOpacity key={p.id} style={styles.popularChip} onPress={() => setPlace(p)}>
              <Building2 size={13} color={colors.primaryBlue} />
              <Text style={styles.popularChipText}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.nationalMapCard} onPress={() => router.push('/location-search')} activeOpacity={0.85}>
        <MapLibreMap
          style={StyleSheet.absoluteFill}
          mapStyle={MAP_STYLE_JSON}
          dragPan={false}
          touchZoom={false}
          touchRotate={false}
          touchPitch={false}
          doubleTapZoom={false}
          doubleTapHoldZoom={false}
          attribution={false}
          logo={false}
          compass={false}
        >
          <Camera initialViewState={{ center: toMapLibreCoordinate(INDIA_MAP_CENTER), zoom: 3.3 }} />
          {POPULAR_PLACES.map((p) => (
            <MapLibreMarker key={p.id} lngLat={toMapLibreCoordinate(p)}>
              <MapMarker color={colors.primaryBlue} size={16} />
            </MapLibreMarker>
          ))}
        </MapLibreMap>
        <View style={styles.nationalMapOverlay}>
          <Text style={styles.nationalMapTitle}>NATIONAL OVERVIEW</Text>
          <Text style={styles.nationalMapSubtitle}>Choose a location to load nearby road intelligence.</Text>
          <View style={styles.browseMapButton}>
            <Text style={styles.browseMapButtonText}>BROWSE MAP</Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.statusBanner}>
        {status ? <HealthBadge status={status.overall} /> : null}
        <Text style={styles.statusText}>ALL SYSTEMS {status?.overall ?? 'OPERATIONAL'}</Text>
      </View>

      <Text style={styles.sectionLabel}>NATIONWIDE SNAPSHOT</Text>
      <View style={styles.kpiGrid}>
        <StatCard label="Active Hazards" value={formatCompactNumber(kpis?.activeHazards ?? 0)} tone="critical" trendPct={kpis?.activeHazardsTrendPct} />
        <StatCard label="Citizen Reports Today" value={formatCompactNumber(kpis?.citizenReportsToday ?? 0)} tone="info" />
        <StatCard label="Fleet Observations Today" value={formatCompactNumber(kpis?.fleetObservationsToday ?? 0)} tone="info" />
        <StatCard label="Active Vehicles" value={kpis?.activeVehicles ?? 0} tone="default" />
        <StatCard label="Cities Active" value={kpis?.citiesActive ?? 0} tone="default" />
        <StatCard label="Municipalities" value={kpis?.municipalities ?? 0} tone="default" />
      </View>

      <View style={styles.sectionHeaderRow}>
        <AlertTriangle size={13} color={colors.critical} />
        <Text style={styles.sectionLabelRed}>ACTION REQUIRED (TOP NATIONWIDE)</Text>
      </View>
      <View style={styles.actionList}>
        {actionItems?.length ? actionItems.slice(0, 4).map((item) => <ActionRequiredCard key={item.id} item={item} />) : <Text style={styles.emptyHint}>No critical items right now.</Text>}
      </View>

      <Text style={styles.sectionLabel}>SYSTEM ACTIVITY</Text>
      <View style={styles.activityList}>
        {activity?.slice(0, 5).map((event) => (
          <View key={event.id} style={styles.activityRow}>
            <View style={styles.activityDot} />
            <View style={styles.activityBody}>
              <Text style={styles.activityMessage}>{event.message}</Text>
              <Text style={styles.activityMeta}>
                {event.cityName ? `${event.cityName} · ` : ''}
                {formatRelativeTime(event.createdAt)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// -------------------------------------------------------------- Has a place

function ScopedDashboard() {
  const insets = useSafeAreaInsets();
  const place = useLocationStore((s) => s.place)!;
  const setRadiusKm = useLocationStore((s) => s.setRadiusKm);
  const cameraRef = useRef<CameraRef | null>(null);

  const { data: kpis, isLoading, isError, error, refetch } = useDashboardKpis();
  const { data: actionItems } = useActionRequired();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // `Camera`'s `initialViewState` only applies on first mount — moving to a
  // newly-searched place or a changed radius after that needs an
  // imperative move (mirrors the old react-native-maps
  // `mapRef.current?.animateToRegion(...)` this replaced).
  useEffect(() => {
    cameraRef.current?.easeTo({ center: toMapLibreCoordinate(place), zoom: zoomForRadiusKm(place.radiusKm), duration: 500 });
  }, [place.latitude, place.longitude, place.radiusKm]);

  return (
    <View style={styles.flex}>
      <View style={styles.mapPane}>
        <MapLibreMap style={StyleSheet.absoluteFill} mapStyle={MAP_STYLE_JSON}>
          <Camera ref={cameraRef} initialViewState={{ center: toMapLibreCoordinate(place), zoom: zoomForRadiusKm(place.radiusKm) }} />
          <GeoJSONSource id="dashboard-radius" data={circlePolygonGeoJSON(place, place.radiusKm)}>
            <Layer type="fill" id="dashboard-radius-fill" paint={{ 'fill-color': colors.primaryBlue, 'fill-opacity': 0.15 }} />
            <Layer type="line" id="dashboard-radius-line" paint={{ 'line-color': colors.primaryBlue, 'line-width': 2 }} />
          </GeoJSONSource>
          <MapLibreMarker lngLat={toMapLibreCoordinate(place)}>
            <MapMarker color={colors.deepNavy} />
          </MapLibreMarker>
        </MapLibreMap>

        <View style={[styles.mapOverlay, { top: insets.top + 8 }]}>
          <LocationHeader
            place={place}
            onChangeLocation={() => router.push('/location-search')}
            onRadiusChange={setRadiusKm}
            resultCountLabel={kpis ? `${formatCompactNumber(kpis.activeHazards)} hazards in selected radius` : undefined}
          />
        </View>
      </View>

      <ScrollView style={styles.drawer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={styles.drawerContent}>
        {isError ? (
          <ErrorState message={(error as Error)?.message ?? 'Could not load dashboard.'} onRetry={refetch} />
        ) : (
          <>
            <Text style={styles.sectionLabel}>NETWORK STATUS ({place.radiusKm}KM)</Text>
            <View style={styles.kpiGrid}>
              <StatCard label="Active Hazards" value={kpis?.activeHazards ?? '—'} tone="critical" trendPct={kpis?.activeHazardsTrendPct} sub={`Critical: ${kpis?.criticalHazards ?? 0}`} />
              <StatCard label="Citizen Reports" value={kpis?.citizenReportsToday ?? '—'} tone="info" />
              <StatCard label="Fleet Obs." value={kpis?.fleetObservationsToday ?? '—'} tone="info" />
              <StatCard label="Under Repair" value={kpis?.underRepair ?? '—'} tone="warning" />
              <StatCard label="Resolved" value={kpis?.resolved ?? '—'} tone="success" />
              <StatCard label="Active Vehicles" value={kpis?.activeVehicles ?? '—'} tone="default" />
            </View>

            <View style={styles.coverageCard}>
              <View style={styles.coverageHeaderRow}>
                <Text style={styles.coverageLabel}>Data Coverage</Text>
                <Text style={styles.coverageValue}>{kpis?.dataCoveragePct ?? 0}%</Text>
              </View>
              <View style={styles.coverageTrack}>
                <View style={[styles.coverageFill, { width: `${kpis?.dataCoveragePct ?? 0}%` }]} />
              </View>
            </View>

            <View style={styles.sectionHeaderRow}>
              <AlertTriangle size={13} color={colors.critical} />
              <Text style={styles.sectionLabelRed}>ACTION REQUIRED</Text>
            </View>
            {actionItems?.length ? (
              <View style={styles.actionList}>
                {actionItems.map((item) => (
                  <ActionRequiredCard key={item.id} item={item} />
                ))}
              </View>
            ) : (
              <EmptyState title="No action required" message="Nothing critical is pending in this radius right now." />
            )}

            <View style={styles.quickLinksRow}>
              <QuickLink icon={<Truck size={16} color={colors.primaryBlue} />} label="Fleet" onPress={() => router.push('/(tabs)/fleet')} />
              <QuickLink icon={<Landmark size={16} color={colors.primaryBlue} />} label="Gov" onPress={() => router.push('/(tabs)/municipalities')} />
              <QuickLink icon={<Users size={16} color={colors.primaryBlue} />} label="Users" onPress={() => router.push('/users')} />
              <QuickLink icon={<Bell size={16} color={colors.primaryBlue} />} label="Alerts" onPress={() => router.push('/notifications')} />
            </View>
          </>
        )}
        {isLoading && !kpis ? <Text style={styles.emptyHint}>Loading…</Text> : null}
      </ScrollView>
    </View>
  );
}

function QuickLink({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickLink} onPress={onPress}>
      {icon}
      <Text style={styles.quickLinkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  homeScroll: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  brand: { ...typography.headlineLg, fontSize: 18, color: colors.deepNavy },
  hero: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  heroTitle: { ...typography.headlineLg, fontSize: 20, color: colors.deepNavy, textAlign: 'center', letterSpacing: 0.2 },
  heroGreeting: { ...typography.bodyMd, color: colors.textSecondary, textAlign: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, width: '100%', backgroundColor: colors.white, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4, marginTop: spacing.sm, ...shadow.sm },
  searchPlaceholder: { ...typography.bodyMd, color: colors.textSecondary, flex: 1 },
  popularLabel: { ...typography.caps, color: colors.textSecondary, marginTop: spacing.md },
  popularRow: { gap: spacing.xs, paddingVertical: spacing.xs },
  popularChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm + 2, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted },
  popularChipText: { ...typography.labelSm, color: colors.text },
  nationalMapCard: { height: 180, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceContainer },
  nationalMapOverlay: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.md, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: radius.md, padding: spacing.sm + 2, gap: 4, alignItems: 'center', ...shadow.sm },
  nationalMapTitle: { ...typography.headlineMd, fontSize: 13, color: colors.deepNavy, letterSpacing: 0.5 },
  nationalMapSubtitle: { ...typography.labelSm, color: colors.textSecondary, textAlign: 'center' },
  browseMapButton: { marginTop: 4, backgroundColor: colors.primaryBlue, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 6 },
  browseMapButtonText: { ...typography.caps, color: colors.white },
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.surfaceMuted, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.border },
  statusText: { ...typography.labelMd, color: colors.deepNavy },
  sectionLabel: { ...typography.caps, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs },
  sectionLabelRed: { ...typography.caps, color: colors.critical },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.md, marginBottom: spacing.xs },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  actionList: { gap: spacing.xs },
  emptyHint: { ...typography.bodyMd, color: colors.textSecondary, textAlign: 'center', paddingVertical: spacing.sm },
  activityList: { gap: spacing.sm },
  activityRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  activityDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primaryBlue, marginTop: 6 },
  activityBody: { flex: 1 },
  activityMessage: { ...typography.bodyMd, color: colors.text },
  activityMeta: { ...typography.labelSm, color: colors.textSecondary },

  mapPane: { height: '38%', backgroundColor: colors.surfaceContainer },
  mapOverlay: { position: 'absolute', left: spacing.sm, right: spacing.sm },
  drawer: { flex: 1, backgroundColor: colors.background },
  drawerContent: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.xs },
  coverageCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm + 2, gap: spacing.xs },
  coverageHeaderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  coverageLabel: { ...typography.caps, color: colors.textSecondary },
  coverageValue: { ...typography.numeric, color: colors.deepNavy, fontSize: 16 },
  coverageTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  coverageFill: { height: '100%', backgroundColor: colors.primaryBlue },
  quickLinksRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  quickLink: { flex: 1, alignItems: 'center', gap: 4, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.sm },
  quickLinkLabel: { ...typography.labelSm, color: colors.text },
});
