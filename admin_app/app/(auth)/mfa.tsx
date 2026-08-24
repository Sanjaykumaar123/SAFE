/** §03/§08 — MFA verification step. Not triggered by the demo backend
 * fallback (mfaRequired is always false there), but wired up end-to-end
 * so a real backend that returns `mfaRequired: true` from
 * `POST /admin/auth/login` drops the admin here before a session exists. */
import { router } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { colors, radius, spacing, typography } from '@/constants/theme';

export default function MfaScreen() {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onVerify = () => {
    setSubmitting(true);
    // A real integration re-submits { adminId, password, mfaCode } to
    // authApi.login (§08) — this demo build never actually requires it.
    setTimeout(() => {
      setSubmitting(false);
      router.replace('/(tabs)/dashboard');
    }, 400);
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <ShieldCheck size={32} color={colors.primaryBlue} />
      </View>
      <Text style={styles.title}>Verify your identity</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code from your authenticator app or email.</Text>

      <TextInput
        style={styles.codeInput}
        value={code}
        onChangeText={setCode}
        placeholder="000000"
        placeholderTextColor={colors.textSecondary}
        keyboardType="number-pad"
        maxLength={6}
        textAlign="center"
      />

      <Button label="VERIFY & CONTINUE" onPress={onVerify} loading={submitting} disabled={code.length < 6} style={styles.button} />
      <Text style={styles.resend} onPress={() => undefined}>
        Resend code
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: `${colors.primaryBlue}14`, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  title: { ...typography.headlineMd, color: colors.deepNavy },
  subtitle: { ...typography.bodyMd, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  codeInput: { width: 200, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md, fontSize: 28, letterSpacing: 8, color: colors.deepNavy, backgroundColor: colors.surface },
  button: { marginTop: spacing.lg, width: 240 },
  resend: { ...typography.labelMd, color: colors.primaryBlue, marginTop: spacing.md },
});
