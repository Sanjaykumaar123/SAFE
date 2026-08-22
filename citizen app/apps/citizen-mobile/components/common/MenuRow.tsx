import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { MIN_TOUCH_TARGET, colors, spacing, typography } from '@/constants/theme';

interface MenuRowProps {
  icon?: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  destructive?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
}

export function MenuRow({ icon, label, subtitle, onPress, destructive, switchValue, onSwitchChange }: MenuRowProps) {
  const isSwitchRow = switchValue !== undefined;

  return (
    <Pressable
      onPress={isSwitchRow ? undefined : onPress}
      style={({ pressed }) => [styles.row, pressed && !isSwitchRow && styles.pressed]}
      accessibilityRole={isSwitchRow ? undefined : 'button'}
      accessibilityLabel={label}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <View style={styles.textWrap}>
        <Text style={[styles.label, destructive && styles.destructive]}>{label}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {isSwitchRow ? (
        <Switch value={switchValue} onValueChange={onSwitchChange} trackColor={{ true: colors.primaryBlue }} />
      ) : onPress ? (
        <ChevronRight size={18} color={colors.textSecondary} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  icon: { width: 24, alignItems: 'center' },
  textWrap: { flex: 1 },
  label: { ...typography.bodyLg, color: colors.text },
  destructive: { color: colors.critical },
  subtitle: { ...typography.labelSm, color: colors.textSecondary, marginTop: 1 },
});
