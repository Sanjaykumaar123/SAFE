/** §23 — City Management: list, add, activate/deactivate. */
import { router } from 'expo-router';
import { ChevronRight, Search } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card } from '@/components/common/Card';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useCities } from '@/features/cities/useCities';

export default function CitiesScreen() {
  const [query, setQuery] = useState('');
  const { data, isLoading, isError, error, refetch } = useCities(query);

  return (
    <View style={styles.flex}>
      <ScreenHeader title="City Management" />
      <View style={styles.searchRow}>
        <Search size={16} color={colors.textSecondary} />
        <TextInput style={styles.searchInput} placeholder="Search city or state…" placeholderTextColor={colors.textSecondary} value={query} onChangeText={setQuery} />
      </View>

      {isLoading ? (
        <LoadingState label="Loading cities…" />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message ?? 'Could not load cities.'} onRetry={refetch} />
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
          renderItem={({ item }) => (
            <Card onPress={() => router.push(`/cities/${item.id}`)} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.body}>
                  <View style={styles.headerRow}>
                    <Text style={styles.name}>{item.name}</Text>
                    <View style={[styles.statusPill, item.status === 'ACTIVE' ? styles.statusActive : styles.statusOnboarding]}>
                      <Text style={[styles.statusText, item.status === 'ACTIVE' ? styles.statusTextActive : styles.statusTextOnboarding]}>{item.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.subtitle}>
                    {item.code} · {item.state} · {item.municipalityName}
                  </Text>
                  <View style={styles.metricsRow}>
                    <Text style={styles.metric}>Active: <Text style={styles.metricValue}>{item.activeHazards}</Text></Text>
                    <Text style={styles.metric}>Coverage: <Text style={styles.metricValue}>{item.fleetCoveragePct}%</Text></Text>
                    <Text style={styles.metric}>Wards: <Text style={styles.metricValue}>{item.wardsCount}</Text></Text>
                  </View>
                </View>
                <ChevronRight size={18} color={colors.textSecondary} />
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.md, marginBottom: spacing.xs, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 8 },
  searchInput: { flex: 1, ...typography.bodyMd, color: colors.text },
  listContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  body: { flex: 1, gap: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...typography.bodyMd, fontWeight: '700', color: colors.text },
  subtitle: { ...typography.labelSm, color: colors.textSecondary },
  statusPill: { paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.full },
  statusActive: { backgroundColor: `${colors.green}1A` },
  statusOnboarding: { backgroundColor: `${colors.warning}1A` },
  statusText: { ...typography.caps },
  statusTextActive: { color: colors.green },
  statusTextOnboarding: { color: colors.warning },
  metricsRow: { flexDirection: 'row', gap: spacing.md, marginTop: 2 },
  metric: { ...typography.labelSm, color: colors.textSecondary },
  metricValue: { color: colors.text, fontWeight: '700' },
});
