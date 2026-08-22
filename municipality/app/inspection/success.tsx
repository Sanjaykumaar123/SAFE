import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/common/Button';
import { colors, spacing, typography } from '@/constants/theme';

export default function ResolutionSuccessScreen() {
  const { hazardId } = useLocalSearchParams<{ hazardId: string }>();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.iconCircle}>
        <CheckCircle2 size={40} color={colors.white} />
      </View>
      <Text style={styles.title}>Hazard Resolved</Text>
      <Text style={styles.message}>
        This hazard has been confirmed resolved. It has been removed from the active map and will now appear in resolved history — for every
        connected SafePath app.
      </Text>
      <View style={styles.actions}>
        <Button label="View Hazard" onPress={() => router.replace(`/hazard/${hazardId}`)} />
        <Button label="Back to Dashboard" variant="outline" onPress={() => router.replace('/(tabs)/dashboard')} />
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
