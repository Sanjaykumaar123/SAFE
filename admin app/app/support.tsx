/** §08 — Support / Forgot Password entry point. */
import { Mail, MessageCircle, Phone } from 'lucide-react-native';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function SupportScreen() {
  return (
    <View style={styles.flex}>
      <ScreenHeader title="Support" />
      <View style={styles.content}>
        <Text style={styles.intro}>Authorized SafePath personnel only. If you're locked out or need elevated access, contact the platform team below.</Text>

        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('mailto:platform-support@safepath.ai')}>
          <Mail size={18} color={colors.primaryBlue} />
          <Text style={styles.rowText}>platform-support@safepath.ai</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('tel:+911800123456')}>
          <Phone size={18} color={colors.primaryBlue} />
          <Text style={styles.rowText}>+91 1800-123-456</Text>
        </TouchableOpacity>
        <View style={styles.row}>
          <MessageCircle size={18} color={colors.primaryBlue} />
          <Text style={styles.rowText}>Internal Slack: #safepath-admin-support</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm },
  intro: { ...typography.bodyMd, color: colors.textSecondary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm + 2 },
  rowText: { ...typography.bodyMd, color: colors.text },
});
