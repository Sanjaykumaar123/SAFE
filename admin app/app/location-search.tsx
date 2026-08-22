/** §12/§57/§concept — the place-search screen every "Search a place"
 * entry point in this app opens: type a city, area, road, landmark, PIN
 * code, or raw "lat, lon" and every screen re-scopes to a radius around
 * it. Mirrors the design reference's "Location Home" hero search. */
import { router } from 'expo-router';
import { Building2, Clock, MapPin, Milestone, Navigation, Search, Signpost, X } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadingState } from '@/components/common/LoadingState';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { usePlaceSearch } from '@/features/location/usePlaceSearch';
import { useLocationStore } from '@/store/locationStore';
import type { PlaceResult } from '@/types/geo';

const TYPE_ICON: Record<PlaceResult['type'], typeof MapPin> = {
  city: Building2,
  area: MapPin,
  road: Signpost,
  landmark: Milestone,
  pincode: MapPin,
  coordinates: Navigation,
};

export default function LocationSearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const setPlace = useLocationStore((s) => s.setPlace);
  const clearPlace = useLocationStore((s) => s.clearPlace);
  const recentSearches = useLocationStore((s) => s.recentSearches);
  const { data: results, isFetching } = usePlaceSearch(query);

  const onSelect = (place: PlaceResult) => {
    setPlace(place);
    router.back();
  };

  const showRecent = !query.trim() && recentSearches.length > 0;
  const list = showRecent ? recentSearches : results ?? [];

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="Search a city, area, road, PIN or landmark…"
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton} accessibilityLabel="Close">
          <X size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.clearRow}
        onPress={() => {
          clearPlace();
          router.back();
        }}
      >
        <Text style={styles.clearRowText}>View nationwide (clear location filter)</Text>
      </TouchableOpacity>

      {showRecent ? <Text style={styles.sectionLabel}>RECENT SEARCHES</Text> : query.trim() ? <Text style={styles.sectionLabel}>RESULTS</Text> : <Text style={styles.sectionLabel}>TRY “600042”, “13.0827, 80.2707”, “OMR”, “MG Road”…</Text>}

      {isFetching && !showRecent ? (
        <LoadingState label="Searching…" />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={query.trim() ? <Text style={styles.emptyText}>No matches. Try a nearby city or a PIN code.</Text> : null}
          renderItem={({ item }) => {
            const Icon = TYPE_ICON[item.type];
            return (
              <TouchableOpacity style={styles.resultRow} onPress={() => onSelect(item)}>
                <View style={styles.resultIcon}>
                  <Icon size={16} color={colors.primaryBlue} />
                </View>
                <View style={styles.resultBody}>
                  <Text style={styles.resultTitle}>{item.name}</Text>
                  <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
                </View>
                {showRecent ? <Clock size={14} color={colors.textSecondary} /> : null}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 10 },
  input: { flex: 1, ...typography.bodyMd, color: colors.text },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  clearRow: { marginHorizontal: spacing.md, marginTop: spacing.sm },
  clearRowText: { ...typography.labelMd, color: colors.primaryBlue },
  sectionLabel: { ...typography.caps, color: colors.textSecondary, marginHorizontal: spacing.md, marginTop: spacing.md, marginBottom: spacing.xs },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl, gap: spacing.xs },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm + 2 },
  resultIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${colors.primaryBlue}14`, alignItems: 'center', justifyContent: 'center' },
  resultBody: { flex: 1, gap: 2 },
  resultTitle: { ...typography.bodyMd, fontWeight: '600', color: colors.text },
  resultSubtitle: { ...typography.labelSm, color: colors.textSecondary },
  emptyText: { ...typography.bodyMd, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
});
