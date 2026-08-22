import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck } from 'lucide-react-native';
import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { colors, spacing, typography } from '@/constants/theme';
import { loginSchema, type LoginFormValues } from '@/features/auth/schemas';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const isSubmitting = useAuthStore((s) => s.isSubmitting);
  const enableGuestMode = useSettingsStore((s) => s.enableGuestMode);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema), defaultValues: { identifier: '', password: '' } });

  async function onSubmit(values: LoginFormValues) {
    try {
      await login(values);
      router.replace('/(tabs)/home');
    } catch {
      setError('password', { message: 'Incorrect email/mobile or password.' });
    }
  }

  function handleGuest() {
    enableGuestMode();
    router.replace('/(tabs)/home');
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <ShieldCheck size={32} color={colors.white} />
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Log in to report and track road hazards.</Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="identifier"
              render={({ field }) => (
                <Input
                  label="Email or mobile"
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.identifier?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <Input
                  label="Password"
                  placeholder="••••••••"
                  secureTextEntry
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.password?.message}
                />
              )}
            />

            <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Link>

            <Button label="Log In" onPress={handleSubmit(onSubmit)} loading={isSubmitting} size="lg" />
          </View>

          <View style={styles.footer}>
            <View style={styles.divider} />
            <Button label="Continue as Guest" onPress={handleGuest} variant="outline" />
            <View style={styles.registerRow}>
              <Text style={styles.footerText}>Don&apos;t have an account? </Text>
              <Link href="/(auth)/register">
                <Text style={styles.footerLink}>Create account</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.xl },
  header: { alignItems: 'center', gap: spacing.xs },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.deepNavy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { ...typography.headlineLg, color: colors.text },
  subtitle: { ...typography.bodyMd, color: colors.textSecondary, textAlign: 'center' },
  form: { gap: spacing.md },
  forgotLink: { alignSelf: 'flex-end' },
  forgotText: { ...typography.labelMd, color: colors.primaryBlue },
  footer: { gap: spacing.md },
  divider: { height: 1, backgroundColor: colors.border },
  registerRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  footerText: { ...typography.bodyMd, color: colors.textSecondary },
  footerLink: { ...typography.bodyMd, color: colors.primaryBlue, fontWeight: '600' },
});
