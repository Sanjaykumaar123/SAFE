/**
 * Google Maps-style Draggable Route Bottom Sheet:
 * - Large duration, distance, and Safety score badge
 * - "Start Navigation" and "Open in Google Maps" actions
 * - Route alternatives comparison
 * - Hazards along route corridor
 * - Turn-by-Turn directions step list
 */
/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps --
 * Reanimated's `useSharedValue` intentionally returns a mutable ref-like
 * object — `.value` is written from gesture callbacks outside React's
 * render cycle by design. */
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CornerDownRight,
  ExternalLink,
  MapPin,
  Navigation,
  Route as RouteIcon,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  X,
} from 'lucide-react-native';

import { SEVERITY_LABELS } from '@/constants/severity';
import { colors, radius, shadow, spacing, typography, severityColors } from '@/constants/theme';
import { formatDistance, formatDuration } from '@/utils/geo';
import type { RoutePlannerLocation, SafeRouteOption } from '@/types';
import type { SafeRouteStatus } from '@/features/routes/useSafeRoute';

const PEEK_HEIGHT = 195;
const SPRING_CONFIG = { damping: 22, stiffness: 240 };

interface Props {
  status: SafeRouteStatus;
  errorMessage: string | null;
  origin: RoutePlannerLocation | null;
  destination: RoutePlannerLocation | null;
  options: SafeRouteOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  bottomInset: number;
}

export function RouteSheet({
  status,
  errorMessage,
  origin,
  destination,
  options,
  selectedId,
  onSelect,
  onClose,
  bottomInset,
}: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const expandedHeight = Math.min(windowHeight * 0.75, 620);
  const restY = Math.max(0, expandedHeight - PEEK_HEIGHT);

  const translateY = useSharedValue(restY);
  const isExpanded = useSharedValue(false);

  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    translateY.value = withSpring(restY, SPRING_CONFIG);
    isExpanded.value = false;
  }, [status, destination?.label, restY]);

  const setExpanded = useCallback(
    (next: boolean) => {
      translateY.value = withSpring(next ? 0 : restY, SPRING_CONFIG);
      isExpanded.value = next;
    },
    [restY]
  );

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      const base = isExpanded.value ? 0 : restY;
      translateY.value = Math.min(restY, Math.max(0, base + event.translationY));
    })
    .onEnd((event) => {
      const shouldExpand = translateY.value < restY / 2 || event.velocityY < -600;
      translateY.value = withSpring(shouldExpand ? 0 : restY, SPRING_CONFIG);
      isExpanded.value = shouldExpand;
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  if (status === 'idle') return null;

  const selected = options.find((option) => option.id === selectedId) ?? options[0] ?? null;

  const handleOpenGoogleMaps = () => {
    if (!origin?.point || !destination?.point) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.point.latitude},${origin.point.longitude}&destination=${destination.point.latitude},${destination.point.longitude}&travelmode=driving`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <Animated.View style={[styles.sheet, { height: expandedHeight, paddingBottom: bottomInset + spacing.md }, sheetStyle]}>
      <GestureDetector gesture={pan}>
        <Pressable style={styles.handleArea} onPress={() => setExpanded(!isExpanded.value)}>
          <View style={styles.handle} />
        </Pressable>
      </GestureDetector>

      {/* Header Summary */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          {status === 'loading' && (
            <Text style={styles.title} numberOfLines={1}>
              Calculating safest road route…
            </Text>
          )}

          {status === 'ready' && selected && (
            <View>
              <View style={styles.statsRow}>
                <Text style={styles.durationHighlight}>{formatDuration(selected.durationSeconds)}</Text>
                <Text style={styles.distanceText}>({formatDistance(selected.distanceMeters)})</Text>
                <View
                  style={[
                    styles.safetyPill,
                    { backgroundColor: selected.hazardsOnRoute.length === 0 ? `${colors.green}18` : `${colors.warning}18` },
                  ]}
                >
                  {selected.hazardsOnRoute.length === 0 ? (
                    <ShieldCheck size={14} color={colors.green} />
                  ) : (
                    <ShieldAlert size={14} color={colors.warning} />
                  )}
                  <Text
                    style={[
                      styles.safetyPillText,
                      { color: selected.hazardsOnRoute.length === 0 ? colors.green : colors.warning },
                    ]}
                  >
                    {selected.hazardsOnRoute.length === 0
                      ? '0 Hazards · Safest'
                      : `${selected.hazardsOnRoute.length} Hazard${selected.hazardsOnRoute.length === 1 ? '' : 's'}`}
                  </Text>
                </View>
              </View>

              <Text style={styles.routePathSubtitle} numberOfLines={1}>
                {origin?.label ?? 'Start'} → {destination?.label ?? 'Destination'}
              </Text>
            </View>
          )}
        </View>

        <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
          <X size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Action Buttons Row */}
      {status === 'ready' && (
        <View style={styles.actionsRow}>
          <Pressable style={styles.primaryActionButton} onPress={() => setExpanded(true)}>
            <Navigation size={16} color={colors.white} />
            <Text style={styles.primaryActionText}>Steps & Hazards</Text>
          </Pressable>

          <Pressable style={styles.secondaryActionButton} onPress={handleOpenGoogleMaps}>
            <ExternalLink size={16} color={colors.primaryBlue} />
            <Text style={styles.secondaryActionText}>Open in G-Maps</Text>
          </Pressable>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.errorBox}>
          <TriangleAlert size={16} color={colors.critical} />
          <Text style={styles.errorText}>{errorMessage ?? 'Could not calculate a route between these two locations.'}</Text>
        </View>
      )}

      {status === 'ready' && (
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {/* Route Alternatives Selection */}
          <Text style={styles.sectionLabel}>ROUTE CHOICES</Text>
          <View style={styles.routesContainer}>
            {options.map((option, index) => {
              const isSelected = option.id === (selectedId ?? options[0]?.id);
              const clear = option.hazardsOnRoute.length === 0;
              return (
                <Pressable
                  key={option.id}
                  style={[styles.routeCard, isSelected && styles.routeCardActive]}
                  onPress={() => onSelect(option.id)}
                >
                  <View
                    style={[
                      styles.routeIcon,
                      { backgroundColor: option.isSafest ? colors.green : colors.surfaceMuted },
                    ]}
                  >
                    {option.isSafest ? (
                      <ShieldCheck size={16} color={colors.white} />
                    ) : (
                      <RouteIcon size={16} color={colors.textSecondary} />
                    )}
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.routeCardTitle}>
                        {option.isSafest ? 'Safest Route' : `Alternative ${index + 1}`}
                      </Text>
                      {option.isSafest && (
                        <View style={styles.recommendedBadge}>
                          <Text style={styles.recommendedBadgeText}>RECOMMENDED</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.routeCardMeta}>
                      {formatDuration(option.durationSeconds)} · {formatDistance(option.distanceMeters)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.riskBadge,
                      { backgroundColor: clear ? `${colors.green}18` : `${colors.warning}18` },
                    ]}
                  >
                    <Text style={[styles.riskBadgeText, { color: clear ? colors.green : colors.warning }]}>
                      {clear ? 'Clear' : `${option.hazardsOnRoute.length} hazard${option.hazardsOnRoute.length === 1 ? '' : 's'}`}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Hazards along active route */}
          {selected && selected.hazardsOnRoute.length > 0 && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>HAZARDS ON SELECTED ROUTE</Text>
              {selected.hazardsOnRoute.map(({ hazard, distanceFromRouteMeters }) => (
                <View key={hazard.id} style={styles.hazardRow}>
                  <View style={[styles.hazardDot, { backgroundColor: severityColors[hazard.severity] }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.hazardLabel} numberOfLines={1}>
                      {hazard.roadName ?? hazard.locationText}
                    </Text>
                    <Text style={styles.hazardMeta}>
                      {SEVERITY_LABELS[hazard.severity]} · {Math.round(distanceFromRouteMeters)}m from route line
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.textSecondary} />
                </View>
              ))}
            </View>
          )}

          {/* Turn-by-Turn Navigation Steps */}
          {selected && selected.steps && selected.steps.length > 0 && (
            <View style={styles.sectionBlock}>
              <Pressable style={styles.stepsHeaderToggle} onPress={() => setShowSteps(!showSteps)}>
                <Text style={styles.sectionLabel}>TURN-BY-TURN DIRECTIONS ({selected.steps.length})</Text>
                {showSteps ? <ChevronUp size={18} color={colors.textSecondary} /> : <ChevronDown size={18} color={colors.textSecondary} />}
              </Pressable>

              {showSteps && (
                <View style={styles.stepsList}>
                  {selected.steps.map((step, index) => (
                    <View key={`step-${index}`} style={styles.stepItem}>
                      <View style={styles.stepIconBox}>
                        {index === selected.steps!.length - 1 ? (
                          <MapPin size={16} color={colors.critical} />
                        ) : (
                          <CornerDownRight size={16} color={colors.primaryBlue} />
                        )}
                      </View>
                      <View style={styles.stepTextContent}>
                        <Text style={styles.stepInstruction}>{step.instruction}</Text>
                        {step.distanceMeters > 0 && (
                          <Text style={styles.stepDistance}>{formatDistance(step.distanceMeters)}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.md,
    ...shadow.md,
    zIndex: 15,
  },
  handleArea: { alignItems: 'center', paddingVertical: spacing.sm },
  handle: { width: 40, height: 4, borderRadius: radius.full, backgroundColor: colors.border },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingBottom: spacing.xs },
  title: { ...typography.headlineMd, color: colors.text },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  durationHighlight: { fontSize: 20, fontWeight: '700', color: colors.green },
  distanceText: { ...typography.bodyMd, color: colors.textSecondary, fontWeight: '500' },
  safetyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginLeft: spacing.xs,
  },
  safetyPillText: { ...typography.labelSm, fontWeight: '700' },
  routePathSubtitle: { ...typography.labelSm, color: colors.textSecondary, marginTop: 4 },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  primaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 42,
    backgroundColor: colors.primaryBlue,
    borderRadius: radius.md,
  },
  primaryActionText: { ...typography.labelMd, color: colors.white, fontWeight: '700' },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 42,
    paddingHorizontal: spacing.md,
    backgroundColor: `${colors.primaryBlue}15`,
    borderRadius: radius.md,
  },
  secondaryActionText: { ...typography.labelMd, color: colors.primaryBlue, fontWeight: '700' },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: `${colors.critical}14`,
    marginVertical: spacing.sm,
  },
  errorText: { ...typography.bodyMd, color: colors.critical, flex: 1 },

  body: { flex: 1, marginTop: spacing.xs },
  sectionBlock: { marginTop: spacing.md },
  sectionLabel: { ...typography.labelSm, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },

  routesContainer: { gap: spacing.xs },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  routeCardActive: { borderColor: colors.primaryBlue, backgroundColor: `${colors.primaryBlue}0A` },
  routeIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeCardTitle: { ...typography.bodyMd, color: colors.text, fontWeight: '700' },
  recommendedBadge: { backgroundColor: colors.green, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  recommendedBadgeText: { fontSize: 9, color: colors.white, fontWeight: '800' },
  routeCardMeta: { ...typography.labelSm, color: colors.textSecondary, marginTop: 2 },
  riskBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  riskBadgeText: { ...typography.labelSm, fontWeight: '700' },

  // Hazard list
  hazardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  hazardDot: { width: 10, height: 10, borderRadius: 5 },
  hazardLabel: { ...typography.bodyMd, color: colors.text, fontWeight: '500' },
  hazardMeta: { ...typography.labelSm, color: colors.textSecondary, marginTop: 2 },

  // Steps
  stepsHeaderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  stepsList: {
    marginTop: spacing.xs,
    paddingLeft: spacing.xs,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  stepIconBox: {
    width: 24,
    alignItems: 'center',
    marginTop: 2,
  },
  stepTextContent: { flex: 1 },
  stepInstruction: { ...typography.bodyMd, color: colors.text, fontWeight: '500' },
  stepDistance: { ...typography.labelSm, color: colors.textSecondary, marginTop: 1 },
});
