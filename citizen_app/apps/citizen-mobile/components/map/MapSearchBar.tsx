/**
 * Google Maps-style Route Planner & Search component:
 * - Idle state: sleek floating search bar with quick "Directions" button.
 * - Route Planner state: dual-input (From: Origin, To: Destination) with
 *   Swap button (⇅), live OSM/Photon autocomplete, "Your location" and
 *   "Choose on map" actions.
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ArrowLeft, ArrowUpDown, Crosshair, MapPin, Navigation, Search, ShieldCheck, X } from 'lucide-react-native';

import { searchPlaces } from '@/services/routing/geocodingService';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import type { LocationSearchResult, RoutePlannerLocation, RoutePoint } from '@/types';

interface Props {
  topOffset: number;
  origin: RoutePlannerLocation | null;
  destination: RoutePlannerLocation | null;
  userCoords: RoutePoint | null;
  hasActiveRoute: boolean;
  isPickingOnMap: boolean;
  onSelectOrigin: (location: RoutePlannerLocation) => void;
  onSelectDestination: (location: RoutePlannerLocation) => void;
  onSwapPoints: () => void;
  onClear: () => void;
  onStartPickOnMap: (target: 'origin' | 'destination') => void;
  onCancelPickOnMap: () => void;
}

type ActiveField = 'origin' | 'destination' | null;

export function MapSearchBar({
  topOffset,
  origin,
  destination,
  userCoords,
  hasActiveRoute,
  isPickingOnMap,
  onSelectOrigin,
  onSelectDestination,
  onSwapPoints,
  onClear,
  onStartPickOnMap,
  onCancelPickOnMap,
}: Props) {
  // Whether the Google Maps-style dual From/To planner is expanded
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [activeField, setActiveField] = useState<ActiveField>(null);

  const [originQuery, setOriginQuery] = useState(origin?.label ?? 'Your location');
  const [destinationQuery, setDestinationQuery] = useState(destination?.label ?? '');
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync prop changes into local input strings
  useEffect(() => {
    if (origin) {
      setOriginQuery(origin.label);
    } else {
      setOriginQuery(userCoords ? 'Your location' : '');
    }
  }, [origin, userCoords]);

  useEffect(() => {
    if (destination) {
      setDestinationQuery(destination.label);
    } else {
      setDestinationQuery('');
    }
  }, [destination]);

  // Open planner automatically if active route exists
  useEffect(() => {
    if (hasActiveRoute) {
      setPlannerOpen(true);
    }
  }, [hasActiveRoute]);

  // Search when user is typing in active field
  useEffect(() => {
    if (!activeField) {
      setResults([]);
      setLoading(false);
      return;
    }

    const currentText = activeField === 'origin' ? originQuery : destinationQuery;
    const trimmed = currentText.trim();

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (trimmed.length < 2 || trimmed === 'Your location' || trimmed === 'Dropped pin') {
      setResults([]);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchPlaces(trimmed, userCoords);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 320);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [originQuery, destinationQuery, activeField, userCoords]);

  const handleSelectResult = (result: LocationSearchResult) => {
    const loc: RoutePlannerLocation = {
      point: { latitude: result.latitude, longitude: result.longitude },
      label: result.label,
      isCurrentLocation: false,
    };

    if (activeField === 'origin') {
      setOriginQuery(result.label);
      onSelectOrigin(loc);
      setActiveField(null);
    } else {
      setDestinationQuery(result.label);
      onSelectDestination(loc);
      setActiveField(null);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!userCoords) return;
    const loc: RoutePlannerLocation = {
      point: userCoords,
      label: 'Your location',
      isCurrentLocation: true,
    };

    if (activeField === 'origin') {
      setOriginQuery('Your location');
      onSelectOrigin(loc);
    } else {
      setDestinationQuery('Your location');
      onSelectDestination(loc);
    }
    setActiveField(null);
  };

  const handlePickOnMap = () => {
    const target = activeField === 'origin' ? 'origin' : 'destination';
    setActiveField(null);
    onStartPickOnMap(target);
  };

  const handleClearField = (field: 'origin' | 'destination') => {
    if (field === 'origin') {
      if (userCoords) {
        setOriginQuery('Your location');
        onSelectOrigin({ point: userCoords, label: 'Your location', isCurrentLocation: true });
      } else {
        setOriginQuery('');
      }
    } else {
      setDestinationQuery('');
      if (hasActiveRoute) {
        onClear();
      }
    }
  };

  const handleClosePlanner = () => {
    setPlannerOpen(false);
    setActiveField(null);
    onClear();
  };

  // Picking on map banner
  if (isPickingOnMap) {
    return (
      <View style={[styles.container, { top: topOffset }]} pointerEvents="box-none">
        <View style={styles.pickingBanner}>
          <MapPin size={20} color={colors.primaryBlue} />
          <Text style={styles.pickingText}>Tap anywhere on the map to set point</Text>
          <Pressable style={styles.cancelPickingButton} onPress={onCancelPickOnMap}>
            <Text style={styles.cancelPickingText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // 1. Idle single-bar state
  if (!plannerOpen && !hasActiveRoute) {
    return (
      <View style={[styles.container, { top: topOffset }]} pointerEvents="box-none">
        <View style={styles.idleSearchRow}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.idleInput}
            value={destinationQuery}
            onChangeText={(text) => {
              setDestinationQuery(text);
              setPlannerOpen(true);
              setActiveField('destination');
            }}
            onFocus={() => {
              setPlannerOpen(true);
              setActiveField('destination');
            }}
            placeholder="Search destination or safe route…"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="search"
          />
          <Pressable
            style={styles.directionsPill}
            onPress={() => {
              setPlannerOpen(true);
              setActiveField('destination');
            }}
          >
            <Navigation size={15} color={colors.white} />
            <Text style={styles.directionsPillText}>Directions</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // 2. Google Maps-style dual From/To Route Planner state
  return (
    <View style={[styles.container, { top: topOffset }]} pointerEvents="box-none">
      <View style={styles.plannerCard}>
        {/* Top Header Controls */}
        <View style={styles.plannerHeader}>
          <Pressable style={styles.headerIconButton} onPress={handleClosePlanner} hitSlop={8}>
            <ArrowLeft size={20} color={colors.text} />
          </Pressable>
          <View style={styles.modeBadge}>
            <ShieldCheck size={14} color={colors.green} />
            <Text style={styles.modeBadgeText}>SafePath AI Routing</Text>
          </View>
          {hasActiveRoute && (
            <Pressable style={styles.clearAllButton} onPress={handleClosePlanner}>
              <Text style={styles.clearAllText}>Clear</Text>
            </Pressable>
          )}
        </View>

        {/* Origin & Destination Inputs with Visual Route Connector */}
        <View style={styles.inputsContainer}>
          {/* Connector Graphic */}
          <View style={styles.connectorColumn}>
            <View style={styles.originDot} />
            <View style={styles.connectorLine} />
            <View style={styles.destinationPinGraphic}>
              <MapPin size={14} color={colors.critical} />
            </View>
          </View>

          {/* Fields */}
          <View style={styles.fieldsColumn}>
            {/* Origin Input (From) */}
            <View style={[styles.inputRow, activeField === 'origin' && styles.inputRowFocused]}>
              <TextInput
                style={styles.fieldInput}
                value={originQuery}
                onChangeText={(text) => {
                  setOriginQuery(text);
                  setActiveField('origin');
                }}
                onFocus={() => setActiveField('origin')}
                placeholder="Choose starting point…"
                placeholderTextColor={colors.textSecondary}
                selectTextOnFocus
              />
              {originQuery.length > 0 && activeField === 'origin' && (
                <Pressable onPress={() => handleClearField('origin')} hitSlop={8} style={styles.fieldClear}>
                  <X size={15} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>

            <View style={styles.inputDivider} />

            {/* Destination Input (To) */}
            <View style={[styles.inputRow, activeField === 'destination' && styles.inputRowFocused]}>
              <TextInput
                style={styles.fieldInput}
                value={destinationQuery}
                onChangeText={(text) => {
                  setDestinationQuery(text);
                  setActiveField('destination');
                }}
                onFocus={() => setActiveField('destination')}
                placeholder="Choose destination…"
                placeholderTextColor={colors.textSecondary}
                autoFocus={!hasActiveRoute && destinationQuery === ''}
                selectTextOnFocus
              />
              {destinationQuery.length > 0 && (
                <Pressable onPress={() => handleClearField('destination')} hitSlop={8} style={styles.fieldClear}>
                  <X size={15} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Swap Button (⇅) */}
          <Pressable style={styles.swapButton} onPress={onSwapPoints} hitSlop={8}>
            <ArrowUpDown size={18} color={colors.primaryBlue} />
          </Pressable>
        </View>
      </View>

      {/* Autocomplete / Quick Actions Dropdown */}
      {activeField !== null && (
        <View style={styles.dropdownContainer}>
          <ScrollView style={styles.dropdownScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Quick Action: Current Location */}
            {userCoords && (
              <Pressable
                style={({ pressed }) => [styles.quickActionRow, pressed && styles.resultRowPressed]}
                onPress={handleUseCurrentLocation}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: `${colors.primaryBlue}1A` }]}>
                  <Crosshair size={18} color={colors.primaryBlue} />
                </View>
                <View style={styles.resultText}>
                  <Text style={styles.quickActionTitle}>Your current location</Text>
                  <Text style={styles.quickActionSubtitle}>GPS Live Location</Text>
                </View>
              </Pressable>
            )}

            {/* Quick Action: Choose on Map */}
            <Pressable
              style={({ pressed }) => [styles.quickActionRow, pressed && styles.resultRowPressed]}
              onPress={handlePickOnMap}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: `${colors.green}1A` }]}>
                <MapPin size={18} color={colors.green} />
              </View>
              <View style={styles.resultText}>
                <Text style={styles.quickActionTitle}>Choose on map</Text>
                <Text style={styles.quickActionSubtitle}>Select point with a pin</Text>
              </View>
            </Pressable>

            {/* Loading indicator */}
            {loading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primaryBlue} />
                <Text style={styles.loadingText}>Searching places…</Text>
              </View>
            )}

            {/* Search Results List */}
            {results.map((result, index) => (
              <Pressable
                key={`${result.label}-${result.latitude}-${index}`}
                style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
                onPress={() => handleSelectResult(result)}
              >
                <View style={styles.resultIconWrapper}>
                  {result.kind === 'HAZARD' ? (
                    <Navigation size={16} color={colors.critical} />
                  ) : (
                    <MapPin size={16} color={colors.textSecondary} />
                  )}
                </View>
                <View style={styles.resultText}>
                  <Text style={styles.resultLabel} numberOfLines={1}>
                    {result.label}
                  </Text>
                  {result.subtitle ? (
                    <Text style={styles.resultSubtitle} numberOfLines={1}>
                      {result.subtitle}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: spacing.md, right: spacing.md, zIndex: 20 },

  // Idle search row
  idleSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 50,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.md,
  },
  idleInput: { flex: 1, ...typography.bodyMd, color: colors.text, paddingVertical: 0 },
  directionsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryBlue,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  directionsPillText: { ...typography.labelMd, color: colors.white, fontWeight: '700' },

  // Planner Card
  plannerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.md,
  },
  plannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    paddingHorizontal: 4,
  },
  headerIconButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.green}15`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  modeBadgeText: { ...typography.labelSm, color: colors.green, fontWeight: '700' },
  clearAllButton: { paddingHorizontal: spacing.xs, paddingVertical: 4 },
  clearAllText: { ...typography.labelMd, color: colors.primaryBlue, fontWeight: '600' },

  // Inputs container with connector
  inputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  connectorColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    marginRight: spacing.xs,
  },
  originDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.green,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  connectorLine: {
    width: 2,
    height: 22,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  destinationPinGraphic: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldsColumn: {
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: spacing.xs,
  },
  inputRowFocused: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
  },
  fieldInput: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.text,
    paddingVertical: 0,
    fontSize: 14,
  },
  fieldClear: {
    padding: 4,
  },
  inputDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  swapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
    ...shadow.sm,
  },

  // Dropdown
  dropdownContainer: {
    marginTop: spacing.xs,
    maxHeight: 280,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.md,
  },
  dropdownScroll: {
    flexGrow: 0,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTitle: { ...typography.bodyMd, color: colors.text, fontWeight: '600' },
  quickActionSubtitle: { ...typography.labelSm, color: colors.textSecondary },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  loadingText: { ...typography.bodyMd, color: colors.textSecondary },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultRowPressed: { backgroundColor: colors.surfaceMuted },
  resultIconWrapper: {
    width: 28,
    alignItems: 'center',
  },
  resultText: { flex: 1 },
  resultLabel: { ...typography.bodyMd, color: colors.text, fontWeight: '500' },
  resultSubtitle: { ...typography.labelSm, color: colors.textSecondary, marginTop: 1 },

  // Picking banner
  pickingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primaryBlue,
    gap: spacing.sm,
    ...shadow.md,
  },
  pickingText: { ...typography.bodyMd, color: colors.text, flex: 1, fontWeight: '600' },
  cancelPickingButton: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  cancelPickingText: { ...typography.labelMd, color: colors.critical, fontWeight: '600' },
});
