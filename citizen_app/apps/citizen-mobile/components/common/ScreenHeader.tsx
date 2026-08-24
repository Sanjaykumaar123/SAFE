import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/constants/theme';

export function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} style={styles.button} accessibilityLabel="Back" accessibilityRole="button">
        <ArrowLeft size={22} color={colors.text} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.button}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm },
  button: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.headlineMd, color: colors.deepNavy, flex: 1, textAlign: 'center' },
});
