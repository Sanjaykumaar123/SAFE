import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import {
  ChevronRight,
  Filter,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HazardCard } from '@/components/admin/HazardCard';
import { HazardTabPills } from '@/components/admin/HazardTabPills';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { RadiusSelector } from '@/components/location/RadiusSelector';
import type { HazardTab } from '@/constants/enums';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import { useHazards } from '@/features/hazards/useHazards';
import { useLocationStore } from '@/store/locationStore';

export default function HazardsScreen() {
  const insets = useSafeAreaInsets();
  const place = useLocationStore((s) => s.place);
  const setRadiusKm = useLocationStore((s) => s.setRadiusKm);
  const [tab, setTab] = useState<HazardTab>('ALL');
  const [query, setQuery] = useState('');

  const { data, isLoading, isError, error, refetch } = useHazards(tab, query);

  const items = data?.items ?? [];

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      {/* Top App Bar & Location Header */}
      <View style={styles.topBar}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.headerTitle}>Hazard Intelligence</Text>
            <Text style={styles.headerSubtitle}>
              Central Road Safety & Pothole Registry
            </Text>
          </View>

          <TouchableOpacity
            style={styles.locationPill}
            onPress={() => router.push('/location-search')}
            activeOpacity={0.8}
          >
            <MapPin size={14} color={colors.primaryBlue} />
            <Text style={styles.locationPillText} numberOfLines={1}>
              {place ? `${place.name}` : 'All India'}
            </Text>
            <ChevronRight size={12} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Radius selector if location is active */}
      {place ? (
        <View style={styles.radiusWrap}>
          <RadiusSelector valueKm={place.radiusKm} onChange={setRadiusKm} />
        </View>
      ) : null}

      {/* Modern Search Box */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search hazard ID, street, ward, road..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Segmented / Filter Tabs */}
      <HazardTabPills
        value={tab}
        onChange={setTab}
        counts={{
          ALL: data?.total,
        }}
      />

      {/* Active Filter & Count Banner */}
      <View style={styles.metaRow}>
        <Text style={styles.metaCount}>
          <Text style={styles.metaCountBold}>{items.length}</Text> {items.length === 1 ? 'hazard' : 'hazards'} found
          {place ? ` in ${place.name}` : ''}
        </Text>
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')} style={styles.filterTag}>
            <Text style={styles.filterTagText}>"{query}"</Text>
            <X size={12} color={colors.primaryBlue} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Main List / States */}
      {isLoading ? (
        <LoadingState label="Loading road hazards…" />
      ) : isError ? (
        <ErrorState
          message={(error as Error)?.message ?? 'Could not load hazards.'}
          onRetry={refetch}
        />
      ) : !items.length ? (
        <EmptyState
          title="No hazards found"
          message={
            query
              ? `No results matching "${query}". Try clearing the search query.`
              : place
              ? `No hazards in "${tab}" within ${place.radiusKm}km of ${place.name}.`
              : 'Try selecting a different status filter tab.'
          }
        />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <HazardCard hazard={item} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8FAFC' },
  topBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.deepNavy,
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 1,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.white,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: 160,
    ...shadow.sm,
  },
  locationPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.deepNavy,
  },
  radiusWrap: {
    paddingHorizontal: spacing.md,
    paddingBottom: 4,
  },
  searchSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...shadow.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  clearBtn: {
    padding: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  metaCount: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  metaCountBold: {
    fontWeight: '700',
    color: colors.deepNavy,
  },
  filterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  filterTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryBlue,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 4,
    paddingBottom: spacing.xxl,
  },
});
