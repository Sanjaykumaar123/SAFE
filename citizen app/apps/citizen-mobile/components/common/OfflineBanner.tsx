import { WifiOff } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { colors, radius, spacing, typography } from '@/constants/theme';

/** Section 34: never let a citizen wonder why data looks stale — this
 * banner is mounted once near the app root and shows itself automatically. */
export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  if (!isOffline) return null;

  return (
    <View style={styles.container} accessibilityRole="alert">
      <WifiOff size={16} color={colors.white} />
      <Text style={styles.text}>Offline — showing recently cached road data</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.deepNavy,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    marginHorizontal: spacing.md,
  },
  text: { ...typography.labelSm, color: colors.white },
});
