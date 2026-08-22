/**
 * Draggable bottom sheet for Safe Route results — peek state shows the
 * recommended route's summary, dragging the handle up (or tapping it)
 * expands to the full list of route options + hazards along the selected
 * route. Only the handle strip is a drag target, so the results
 * ScrollView underneath keeps its own native scrolling with no gesture
 * conflict to resolve.
 */
/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps --
 * Reanimated's `useSharedValue` intentionally returns a mutable ref-like
 * object — `.value` is written from gesture callbacks outside React's
 * render cycle by design, and its identity is stable across renders like a
 * ref's, so it belongs out of dependency arrays. The react-hooks rules
 * don't know about this Reanimated convention and misfire on every shared
 * value read/write pair in this file. */
import { useCallback, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { ChevronRight, Route as RouteIcon, ShieldCheck, TriangleAlert, X } from 'lucide-react-native';

import { SEVERITY_LABELS } from '@/constants/severity';
import { colors, radius, shadow, spacing, typography, severityColors } from '@/constants/theme';
import { formatDistance, formatDuration } from '@/utils/geo';
import type { SafeRouteOption } from '@/types';
import type { SafeRouteStatus } from '@/features/routes/useSafeRoute';

const PEEK_HEIGHT = 176;
const SPRING_CONFIG = { damping: 22, stiffness: 240 };

interface Props {
  status: SafeRouteStatus;
  errorMessage: string | null;
  destinationLabel: string | null;
  options: SafeRouteOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  bottomInset: number;
}

export function RouteSheet({ status, errorMessage, destinationLabel, options, selectedId, onSelect, onClose, bottomInset }: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const expandedHeight = Math.min(windowHeight * 0.62, 560);
  const restY = Math.max(0, expandedHeight - PEEK_HEIGHT);

  const translateY = useSharedValue(restY);
  const isExpanded = useSharedValue(false);

  // `translateY`/`isExpanded` are Reanimated shared values — stable-identity
  // refs meant to be mutated outside React's render cycle, so (like a ref)
  // they're intentionally left out of these dependency arrays.
  useEffect(() => {
    translateY.value = withSpring(restY, SPRING_CONFIG);
    isExpanded.value = false;
  }, [status, destinationLabel, restY]);

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

  const selected = options.find((option) => option.id === selectedId) ?? null;

  return (
    <Animated.View style={[styles.sheet, { height: expandedHeight, paddingBottom: bottomInset + spacing.md }, sheetStyle]}>
      <GestureDetector gesture={pan}>
        <Pressable style={styles.handleArea} onPress={() => setExpanded(!isExpanded.value)}>
          <View style={styles.handle} />
        </Pressable>
      </GestureDetector>

      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {status === 'loading' ? 'Finding the safest route…' : (destinationLabel ?? 'Safe route')}
          </Text>
          {selected && status === 'ready' && (
            <Text style={styles.subtitle}>
              {formatDistance(selected.distanceMeters)} · {formatDuration(selected.durationSeconds)} ·{' '}
              {selected.hazardsOnRoute.length === 0
                ? 'No hazards on this route'
                : `${selected.hazardsOnRoute.length} hazard${selected.hazardsOnRoute.length === 1 ? '' : 's'} nearby`}
            </Text>
          )}
        </View>
        <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
          <X size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {status === 'error' && (
        <View style={styles.errorBox}>
          <TriangleAlert size={16} color={colors.critical} />
          <Text style={styles.errorText}>{errorMessage ?? 'Could not calculate a route.'}</Text>
        </View>
      )}

      {status === 'ready' && (
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>ROUTE OPTIONS</Text>
          {options.map((option, index) => {
            const isSelected = option.id === selectedId;
            const clear = option.hazardsOnRoute.length === 0;
            return (
              <Pressable key={option.id} style={[styles.routeCard, isSelected && styles.routeCardActive]} onPress={() => onSelect(option.id)}>
                <View style={[styles.routeIcon, { backgroundColor: option.isSafest ? colors.green : colors.surfaceMuted }]}>
                  {option.isSafest ? <ShieldCheck size={16} color={colors.white} /> : <RouteIcon size={16} color={colors.textSecondary} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeCardTitle}>{option.isSafest ? 'Safest route' : `Alternative ${index + 1}`}</Text>
                  <Text style={styles.routeCardMeta}>
                    {formatDistance(option.distanceMeters)} · {formatDuration(option.durationSeconds)}
                  </Text>
                </View>
                <View style={[styles.riskBadge, { backgroundColor: clear ? `${colors.green}1A` : `${colors.warning}1A` }]}>
                  <Text style={[styles.riskBadgeText, { color: clear ? colors.green : colors.warning }]}>
                    {clear ? 'Clear' : `${option.hazardsOnRoute.length} hazard${option.hazardsOnRoute.length === 1 ? '' : 's'}`}
                  </Text>
                </View>
              </Pressable>
            );
          })}

          {selected && selected.hazardsOnRoute.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>HAZARDS ON THIS ROUTE</Text>
              {selected.hazardsOnRoute.map(({ hazard, distanceFromRouteMeters }) => (
                <View key={hazard.id} style={styles.hazardRow}>
                  <View style={[styles.hazardDot, { backgroundColor: severityColors[hazard.severity] }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.hazardLabel} numberOfLines={1}>
                      {hazard.roadName ?? hazard.locationText}
                    </Text>
                    <Text style={styles.hazardMeta}>
                      {SEVERITY_LABELS[hazard.severity]} · {Math.round(distanceFromRouteMeters)}m from route
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.textSecondary} />
                </View>
              ))}
            </>
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
  },
  handleArea: { alignItems: 'center', paddingVertical: spacing.sm },
  handle: { width: 40, height: 4, borderRadius: radius.full, backgroundColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingBottom: spacing.sm },
  title: { ...typography.headlineMd, color: colors.text },
  subtitle: { ...typography.labelSm, color: colors.textSecondary, marginTop: 2 },
  closeButton: { width: 28, height: 28, borderRadius: radius.full, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: `${colors.critical}14`,
  },
  errorText: { ...typography.bodyMd, color: colors.critical, flex: 1 },
  body: { flex: 1 },
  sectionLabel: { ...typography.labelMd, color: colors.textSecondary, textTransform: 'uppercase', marginTop: spacing.sm, marginBottom: spacing.sm },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  routeCardActive: { borderColor: colors.primaryBlue, backgroundColor: `${colors.primaryBlue}0D` },
  routeIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  routeCardTitle: { ...typography.bodyLg, color: colors.text, fontWeight: '600' },
  routeCardMeta: { ...typography.labelSm, color: colors.textSecondary, marginTop: 2 },
  riskBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  riskBadgeText: { ...typography.labelSm, fontWeight: '700' },
  hazardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  hazardDot: { width: 10, height: 10, borderRadius: 5 },
  hazardLabel: { ...typography.bodyMd, color: colors.text },
  hazardMeta: { ...typography.labelSm, color: colors.textSecondary, marginTop: 2 },
});
