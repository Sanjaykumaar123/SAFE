import { router } from 'expo-router';
import { ChevronRight, Clock, Eye, Layers } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ConfidenceBadge, HazardStatusBadge, SeverityBadge, SourceBadge } from '@/components/common/Badge';
import { Card } from '@/components/common/Card';
import { colors, radius, severityColors, shadow, spacing } from '@/constants/theme';
import type { AdminHazard } from '@/types/admin';
import { formatDistanceKm, formatRelativeTime } from '@/utils/format';

export function HazardCard({ hazard }: { hazard: AdminHazard }) {
  const accentColor = severityColors[hazard.severity] || colors.primaryBlue;

  return (
    <Card
      accentColor={accentColor}
      onPress={() => router.push(`/hazard/${hazard.id}`)}
      style={styles.card}
    >
      {/* Header Row: Code & Badges */}
      <View style={styles.headerRow}>
        <View style={styles.idRow}>
          <View style={[styles.codeBadge, { borderColor: accentColor + '40' }]}>
            <Text style={styles.code}>{hazard.code}</Text>
          </View>
          <SeverityBadge severity={hazard.severity} />
        </View>

        <View style={styles.rightHeader}>
          {hazard.distanceKm !== undefined ? (
            <Text style={styles.distance}>{formatDistanceKm(hazard.distanceKm)}</Text>
          ) : null}
          <ChevronRight size={16} color="#94A3B8" />
        </View>
      </View>

      {/* Main Title & Location */}
      <Text style={styles.title} numberOfLines={1}>
        {hazard.title}
      </Text>
      <Text style={styles.location} numberOfLines={1}>
        {hazard.locationText} · {hazard.cityName}
      </Text>

      {/* Tags / Badges Row */}
      <View style={styles.badgeRow}>
        <HazardStatusBadge status={hazard.status} />
        <SourceBadge label={hazard.source} />
        <ConfidenceBadge confidence={hazard.aiConfidence} />
      </View>

      {/* Footer Info Row */}
      <View style={styles.footerRow}>
        <View style={styles.evidenceCount}>
          <Text style={styles.footerText}>
            {hazard.citizenReportCount} citizen · {hazard.fleetObservationCount} fleet
          </Text>
        </View>

        <View style={styles.timeWrap}>
          <Clock size={12} color="#64748B" />
          <Text style={styles.timeText}>{formatRelativeTime(hazard.lastUpdateAt)}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadow.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  codeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  code: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.deepNavy,
    fontFamily: 'monospace',
  },
  rightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distance: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryBlue,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.deepNavy,
    letterSpacing: -0.2,
  },
  location: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: -2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  evidenceCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
});
