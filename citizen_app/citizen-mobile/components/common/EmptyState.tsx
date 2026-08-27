import { StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { colors, spacing, typography } from '@/constants/theme';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon}
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
  title: { ...typography.headlineMd, color: colors.text, textAlign: 'center' },
  message: { ...typography.bodyMd, color: colors.textSecondary, textAlign: 'center' },
  action: { marginTop: spacing.md },
});
