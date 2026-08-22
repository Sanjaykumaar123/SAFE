import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react-native';
import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { registerSchema, type RegisterFormValues } from '@/features/auth/schemas';
import { useAuthStore } from '@/store/authStore';

export default function RegisterScreen() {
  const registerUser = useAuthStore((s) => s.register);
  const isSubmitting = useAuthStore((s) => s.isSubmitting);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', phone: '', email: '', password: '', city: '', acceptedTerms: false },
  });

  async function onSubmit(values: RegisterFormValues) {
    try {
      await registerUser(values);
      router.replace('/(tabs)/home');
    } catch {
      setError('email', { message: 'An account with this email or phone already exists.' });
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Join citizens making Chennai&apos;s roads safer.</Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="fullName"
              render={({ field }) => (
                <Input label="Full name" placeholder="Priya Sharma" value={field.value} onChangeText={field.onChange} error={errors.fullName?.message} />
              )}
            />
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <Input
                  label="Mobile number"
                  placeholder="+91 98765 43210"
                  keyboardType="phone-pad"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.phone?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="email"
              render={({ field }) => (
                <Input
                  label="Email"
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.email?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field }) => (
                <Input label="Password" placeholder="At least 8 characters" secureTextEntry value={field.value} onChangeText={field.onChange} error={errors.password?.message} />
              )}
            />
            <Controller
              control={control}
              name="city"
              render={({ field }) => (
                <Input label="City" placeholder="Chennai" value={field.value} onChangeText={field.onChange} error={errors.city?.message} />
              )}
            />

            <Controller
              control={control}
              name="acceptedTerms"
              render={({ field }) => (
                <View>
                  <Pressable style={styles.checkboxRow} onPress={() => field.onChange(!field.value)} accessibilityRole="checkbox" accessibilityState={{ checked: field.value }}>
                    <View style={[styles.checkbox, field.value && styles.checkboxChecked]}>{field.value ? <Check size={14} color={colors.white} /> : null}</View>
                    <Text style={styles.checkboxLabel}>I agree to the SafePath Terms of Service and Privacy Policy.</Text>
                  </Pressable>
                  {errors.acceptedTerms ? <Text style={styles.errorText}>{errors.acceptedTerms.message}</Text> : null}
                </View>
              )}
            />

            <Button label="Create Account" onPress={handleSubmit(onSubmit)} loading={isSubmitting} size="lg" />
          </View>

          <View style={styles.registerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login">
              <Text style={styles.footerLink}>Log in</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl },
  header: { gap: spacing.xs, marginTop: spacing.md },
  title: { ...typography.headlineLg, color: colors.text },
  subtitle: { ...typography.bodyMd, color: colors.textSecondary },
  form: { gap: spacing.md },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, minHeight: 44 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: colors.primaryBlue, borderColor: colors.primaryBlue },
  checkboxLabel: { ...typography.bodyMd, color: colors.text, flex: 1 },
  errorText: { ...typography.labelSm, color: colors.critical, marginTop: spacing.xxs },
  registerRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  footerText: { ...typography.bodyMd, color: colors.textSecondary },
  footerLink: { ...typography.bodyMd, color: colors.primaryBlue, fontWeight: '600' },
});
