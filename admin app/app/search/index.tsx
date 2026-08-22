/** §40/§57 — Global Search: hazard/report/repair/vehicle/operator/
 * municipality/city/user IDs, always server-side. */
import { router } from 'expo-router';
import { Building2, Landmark, MapPinned, Search, Truck, User, Users2, X } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadingState } from '@/components/common/LoadingState';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useGlobalSearch } from '@/features/search/useGlobalSearch';
import type { GlobalSearchResult } from '@/types/admin';

const KIND_ICON: Record<GlobalSearchResult['kind'], typeof Search> = {
  HAZARD: MapPinned,
  REPORT: MapPinned,
  REPAIR: MapPinned,
  VEHICLE: Truck,
  OPERATOR: Users2,
  MUNICIPALITY: Landmark,
  CITY: Building2,
  USER: User,
};

function routeFor(result: GlobalSearchResult): string {
  switch (result.kind) {
    case 'HAZARD':
    case 'REPORT':
    case 'REPAIR':
      return `/hazard/${result.id}`;
    case 'VEHICLE':
      return `/fleet/vehicle/${result.id}`;
    case 'OPERATOR':
      return `/fleet/operator/${result.id}`;
    case 'MUNICIPALITY':
      return `/municipality/${result.id}`;
    case 'CITY':
      return `/cities/${result.id}`;
    case 'USER':
      return `/users/${result.id}`;
    default:
      return '/(tabs)/dashboard';
  }
}

export default function GlobalSearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const { data, isFetching } = useGlobalSearch(query);

  return (
    <View style={[styles.flex, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="Hazard, report, vehicle, operator, city, user ID…"
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

      {isFetching ? (
        <LoadingState label="Searching…" />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={query.trim().length > 1 ? <Text style={styles.emptyText}>No matches across the platform.</Text> : <Text style={styles.emptyText}>Search hazards, reports, vehicles, operators, cities, municipalities, or users.</Text>}
          renderItem={({ item }) => {
            const Icon = KIND_ICON[item.kind];
            return (
              <TouchableOpacity style={styles.resultRow} onPress={() => router.push(routeFor(item) as never)}>
                <View style={styles.resultIcon}>
                  <Icon size={16} color={colors.primaryBlue} />
                </View>
                <View style={styles.resultBody}>
                  <Text style={styles.resultTitle}>{item.title}</Text>
                  <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
                </View>
                <Text style={styles.resultKind}>{item.kind}</Text>
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
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.xs },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm + 2 },
  resultIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${colors.primaryBlue}14`, alignItems: 'center', justifyContent: 'center' },
  resultBody: { flex: 1, gap: 2 },
  resultTitle: { ...typography.bodyMd, fontWeight: '600', color: colors.text },
  resultSubtitle: { ...typography.labelSm, color: colors.textSecondary },
  resultKind: { ...typography.caps, color: colors.textSecondary },
  emptyText: { ...typography.bodyMd, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl, paddingHorizontal: spacing.lg },
});
