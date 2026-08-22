import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow, spacing } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  elevated?: boolean;
  onPress?: () => void;
  accentColor?: string;
}

export function Card({ children, style, padded = true, elevated = true, onPress, accentColor }: CardProps) {
  const content = (
    <View style={[styles.base, padded && styles.padded, elevated && shadow.sm, accentColor && { borderLeftWidth: 3, borderLeftColor: accentColor }, style]}>
      {children}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  padded: { padding: spacing.md },
  pressed: { opacity: 0.85 },
});
