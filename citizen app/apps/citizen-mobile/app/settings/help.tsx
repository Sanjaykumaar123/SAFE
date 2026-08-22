import { Linking, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, MessageCircle, MapPin as RoadIcon } from 'lucide-react-native';

import { Card } from '@/components/common/Card';
import { MenuRow } from '@/components/common/MenuRow';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { colors, spacing } from '@/constants/theme';

export default function HelpScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Help & Support" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card padded={false}>
          <MenuRow icon={<RoadIcon size={20} color={colors.text} />} label="How reporting works" subtitle="Capture, confirm, submit — see your progress" onPress={() => undefined} />
          <MenuRow icon={<MessageCircle size={20} color={colors.text} />} label="Frequently Asked Questions" onPress={() => undefined} />
          <MenuRow icon={<Mail size={20} color={colors.text} />} label="Contact Support" subtitle="support@safepath.ai" onPress={() => Linking.openURL('mailto:support@safepath.ai')} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg },
});
