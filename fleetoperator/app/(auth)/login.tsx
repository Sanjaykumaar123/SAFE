import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect, router } from 'expo-router';
import { IdCard, Lock, ShieldCheck } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/common/Button';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

const loginSchema = z.object({
  operatorCode: z.string().min(2, 'Enter your operator ID (e.g. OP-0042)'),
  password: z.string().min(1, 'Enter your password'),
});
type LoginForm = z.infer<typeof loginSchema>;

/** §15 — "Operator ID, Password" only, no email/phone step. */
export default function LoginScreen() {
  const status = useAuthStore((s) => s.status);
  const login = useAuthStore((s) => s.login);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { operatorCode: 'OP-0042', password: 'SafePath@123' },
  });

  if (status === 'authenticated') {
    return <Redirect href="/(tabs)/home" />;
  }

  const fillDemo = () => {
    setValue('operatorCode', 'OP-0042');
    setValue('password', 'SafePath@123');
  };

  const onSubmit = async (values: LoginForm) => {
    setSubmitError(null);
    try {
      await login(values);
      router.replace('/(tabs)/home');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Login failed. Check your operator ID and password.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoCircle}>
          <ShieldCheck size={32} color={colors.white} strokeWidth={2.2} />
        </View>
        <Text style={styles.title}>SafePath AI</Text>
        <Text style={styles.subtitle}>Fleet Operator Sign-In</Text>

        <View style={styles.form}>
          <Field
            control={control}
            name="operatorCode"
            label="Operator ID"
            placeholder="OP-0042"
            icon={<IdCard size={18} color={colors.textSecondary} />}
            autoCapitalize="characters"
            error={errors.operatorCode?.message}
          />
          <Field
            control={control}
            name="password"
            label="Password"
            placeholder="••••••••"
            icon={<Lock size={18} color={colors.textSecondary} />}
            secureTextEntry
            error={errors.password?.message}
          />

          {submitError ? <Text style={styles.errorBanner}>{submitError}</Text> : null}

          <Button label="Sign In" onPress={handleSubmit(onSubmit)} loading={isSubmitting} style={styles.submit} />

          <Text style={styles.demoHint} onPress={fillDemo}>
            Demo: OP-0042 · SafePath@123 (Tap to fill)
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  control,
  name,
  label,
  placeholder,
  icon,
  error,
  ...rest
}: {
  control: ReturnType<typeof useForm<LoginForm>>['control'];
  name: keyof LoginForm;
  label: string;
  placeholder: string;
  icon: React.ReactNode;
  error?: string;
  autoCapitalize?: 'none' | 'characters';
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={[styles.inputRow, error && styles.inputRowError]}>
            {icon}
            <TextInput
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor={colors.textSecondary}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              {...rest}
            />
          </View>
        )}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, alignItems: 'center', padding: spacing.lg, paddingTop: spacing.xxl },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.deepNavy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.headlineLgMobile, color: colors.deepNavy },
  subtitle: { ...typography.bodyLg, color: colors.textSecondary, marginBottom: spacing.xl },
  form: { width: '100%', gap: spacing.md },
  fieldGroup: { gap: spacing.xs },
  fieldLabel: { ...typography.labelMd, color: colors.text },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  inputRowError: { borderColor: colors.critical },
  input: { flex: 1, paddingVertical: spacing.sm + 4, ...typography.bodyLg, color: colors.text },
  fieldError: { ...typography.labelSm, color: colors.critical },
  errorBanner: {
    ...typography.bodyMd,
    color: colors.critical,
    backgroundColor: `${colors.critical}14`,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  submit: { marginTop: spacing.sm },
  demoHint: { ...typography.labelSm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },
});
