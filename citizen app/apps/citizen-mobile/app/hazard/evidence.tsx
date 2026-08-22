import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ImageOff } from 'lucide-react-native';
import { Dimensions, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { colors, spacing, typography } from '@/constants/theme';
import { useHazardDetail } from '@/features/hazards/useHazardDetail';

const { width } = Dimensions.get('window');

/**
 * Full-screen evidence gallery for a hazard (section 4) — every photo
 * attached across the reports that contributed to this hazard, reached
 * from "View all evidence" on the hazard detail screen.
 */
export default function HazardEvidenceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: hazard, isPending } = useHazardDetail(id);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton} accessibilityLabel="Back" accessibilityRole="button">
          <ArrowLeft size={22} color={colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Evidence</Text>
        <View style={styles.headerButton} />
      </View>

      {isPending ? (
        <LoadingState label="Loading evidence…" />
      ) : !hazard?.media.length ? (
        <EmptyState icon={<ImageOff size={40} color={colors.textSecondary} />} title="No evidence photos" message="No photos have been attached to this hazard yet." />
      ) : (
        <FlatList
          data={hazard.media}
          keyExtractor={(uri, index) => `${uri}-${index}`}
          renderItem={({ item }) => <Image source={{ uri: item }} style={styles.image} resizeMode="cover" />}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.deepNavy },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.headlineMd, color: colors.white },
  list: { gap: spacing.sm, padding: spacing.sm },
  image: { width: width - spacing.sm * 2, aspectRatio: 4 / 3, borderRadius: 12 },
});
