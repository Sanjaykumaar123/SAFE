import { Briefcase, GraduationCap, Home as HomeIcon, MapPin, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { Input } from '@/components/common/Input';
import { LoadingState } from '@/components/common/LoadingState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useCreateSavedLocation, useDeleteSavedLocation, useSavedLocations } from '@/features/location/useSavedLocations';
import { locationService } from '@/services/location/locationService';
import type { SavedLocationLabel } from '@/types';

const LABEL_ICONS: Record<SavedLocationLabel, typeof HomeIcon> = {
  HOME: HomeIcon,
  WORK: Briefcase,
  COLLEGE: GraduationCap,
  CUSTOM: MapPin,
};

const LABEL_OPTIONS: SavedLocationLabel[] = ['HOME', 'WORK', 'COLLEGE', 'CUSTOM'];

export default function SavedLocationsScreen() {
  const { data, isPending } = useSavedLocations();
  const createLocation = useCreateSavedLocation();
  const deleteLocation = useDeleteSavedLocation();

  const [isAdding, setIsAdding] = useState(false);
  const [label, setLabel] = useState<SavedLocationLabel>('HOME');
  const [customLabel, setCustomLabel] = useState('');
  const [address, setAddress] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  async function handleUseCurrentLocation() {
    setIsLocating(true);
    const coords = await locationService.getCurrentLocation();
    if (coords) {
      const resolved = await locationService.reverseGeocode(coords);
      setAddress(resolved ?? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
      await createLocation.mutateAsync({
        label,
        customLabel: label === 'CUSTOM' ? customLabel || 'Custom place' : undefined,
        address: resolved ?? 'Current location',
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      setIsAdding(false);
      setAddress('');
      setCustomLabel('');
    }
    setIsLocating(false);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader
        title="Saved Locations"
        right={
          <Pressable onPress={() => setIsAdding((v) => !v)} accessibilityLabel="Add saved location">
            <Plus size={22} color={colors.primaryBlue} />
          </Pressable>
        }
      />

      {isAdding && (
        <View style={styles.addForm}>
          <View style={styles.labelRow}>
            {LABEL_OPTIONS.map((option) => {
              const Icon = LABEL_ICONS[option];
              const selected = option === label;
              return (
                <Pressable key={option} onPress={() => setLabel(option)} style={[styles.labelChip, selected && styles.labelChipSelected]}>
                  <Icon size={16} color={selected ? colors.white : colors.text} />
                  <Text style={[styles.labelChipText, selected && styles.labelChipTextSelected]}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
          {label === 'CUSTOM' ? <Input placeholder="Label (e.g. Gym)" value={customLabel} onChangeText={setCustomLabel} /> : null}
          <Input placeholder="Address (or use current location below)" value={address} onChangeText={setAddress} />
          <Button label="Use My Current Location" onPress={handleUseCurrentLocation} loading={isLocating} variant="outline" />
        </View>
      )}

      {isPending ? (
        <LoadingState label="Loading saved locations…" />
      ) : !data?.length ? (
        <EmptyState icon={<MapPin size={40} color={colors.textSecondary} />} title="No saved locations" message="Save Home, Work, or College for faster reporting and alerts." />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const Icon = LABEL_ICONS[item.label];
            return (
              <View style={styles.row}>
                <View style={styles.rowIcon}>
                  <Icon size={18} color={colors.primaryBlue} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowLabel}>{item.label === 'CUSTOM' ? item.customLabel || 'Custom' : item.label}</Text>
                  <Text style={styles.rowAddress} numberOfLines={1}>
                    {item.address}
                  </Text>
                </View>
                <Pressable onPress={() => deleteLocation.mutate(item.id)} accessibilityLabel={`Delete ${item.label}`}>
                  <Trash2 size={18} color={colors.critical} />
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  addForm: { padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  labelRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  labelChipSelected: { backgroundColor: colors.primaryBlue, borderColor: colors.primaryBlue },
  labelChipText: { ...typography.labelSm, color: colors.text },
  labelChipTextSelected: { color: colors.white },
  list: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowLabel: { ...typography.labelMd, color: colors.text },
  rowAddress: { ...typography.bodyMd, color: colors.textSecondary },
});
