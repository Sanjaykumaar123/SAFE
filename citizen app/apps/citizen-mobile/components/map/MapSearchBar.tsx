/**
 * Floating destination search — debounced calls into the existing
 * `/locations/search` backend endpoint. Selecting a result (or a hazard
 * hit) kicks off Safe Route calculation in `MapScreen`.
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MapPin, Navigation, Search, X } from 'lucide-react-native';

import { locationsApi } from '@/services/api/locationsApi';
import { colors, radius, shadow, spacing, typography } from '@/constants/theme';
import type { LocationSearchResult } from '@/types';

interface Props {
  topOffset: number;
  hasActiveRoute: boolean;
  onSelectDestination: (result: LocationSearchResult) => void;
  onClear: () => void;
}

export function MapSearchBar({ topOffset, hasActiveRoute, onSelectDestination, onClear }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    // Every state update below runs inside the debounce timer, including
    // the "query too short" case — keeps this effect a pure subscription
    // (no synchronous setState in the effect body) and avoids firing a
    // search on every keystroke.
    debounceRef.current = setTimeout(async () => {
      if (trimmed.length < 3) {
        setResults([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await locationsApi.search(trimmed);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = (result: LocationSearchResult) => {
    setQuery(result.label);
    setResults([]);
    onSelectDestination(result);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    onClear();
  };

  return (
    <View style={[styles.container, { top: topOffset }]} pointerEvents="box-none">
      <View style={styles.searchRow}>
        <Search size={18} color={colors.textSecondary} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder={hasActiveRoute ? 'Change destination' : 'Search for a safe route to…'}
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
        />
        {loading && <ActivityIndicator size="small" color={colors.primaryBlue} />}
        {!loading && (query.length > 0 || hasActiveRoute) && (
          <Pressable onPress={handleClear} hitSlop={8}>
            <X size={18} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {results.length > 0 && (
        <View style={styles.results}>
          {results.map((result, index) => (
            <Pressable
              key={`${result.label}-${index}`}
              style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
              onPress={() => handleSelect(result)}
            >
              {result.kind === 'HAZARD' ? (
                <Navigation size={16} color={colors.textSecondary} />
              ) : (
                <MapPin size={16} color={colors.textSecondary} />
              )}
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
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: spacing.md, right: spacing.md },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  input: { flex: 1, ...typography.bodyMd, color: colors.text, paddingVertical: 0 },
  results: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.md,
  },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  resultRowPressed: { backgroundColor: colors.surfaceMuted },
  resultText: { flex: 1 },
  resultLabel: { ...typography.bodyMd, color: colors.text },
  resultSubtitle: { ...typography.labelSm, color: colors.textSecondary, marginTop: 2 },
});
