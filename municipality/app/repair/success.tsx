import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/common/Button';
import { colors, spacing, typography } from '@/constants/theme';

export default function RepairSuccessScreen() {
  const { hazardId } = useLocalSearchParams<{ hazardId: string }>();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.iconCircle}>
        <CheckCircle2 size={40} color={colors.white} />
      </View>
      <Text style={styles.title}>Repair Assigned</Text>
      <Text style={styles.message}>The maintenance team has been notified and the hazard is now under repair.</Text>
      <View style={styles.actions}>
        <Button label="View Hazard" onPress={() => router.replace(`/hazard/${hazardId}`)} />
        <Button label="Back to Repairs" variant="outline" onPress={() => router.replace('/(tabs)/repairs')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', padding: spacing.lg },
  iconCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xxl, marginBottom: spacing.lg },
  title: { ...typography.headlineLgMobile, color: colors.deepNavy },
  message: { ...typography.bodyLg, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  actions: { width: '100%', gap: spacing.sm, marginTop: spacing.xl },
});
