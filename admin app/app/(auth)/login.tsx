/** §08 — enterprise-style Admin login. Demo mode seeds one account per
 * role (§06) so the access-control behavior in §86 can be exercised
 * directly from the login screen. */
import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect, router } from 'expo-router';
import { Lock, Mail, ShieldCheck } from 'lucide-react-native';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { z } from 'zod';

import { Button } from '@/components/common/Button';
import { ADMIN_ROLE_LABELS, AdminRole } from '@/constants/enums';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

const loginSchema = z.object({
  adminId: z.string().min(2, 'Enter your Admin ID or official email'),
  password: z.string().min(1, 'Enter your password'),
});
type LoginForm = z.infer<typeof loginSchema>;

const DEMO_ROLES = Object.values(AdminRole);

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
    defaultValues: { adminId: 'super.admin@safepath.ai', password: 'SafePath@Admin1' },
  });

  if (status === 'authenticated') {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  const fillDemo = (role: string) => {
    setValue('adminId', `${role.toLowerCase().replace(/_/g, '.')}@safepath.ai`);
    setValue('password', 'SafePath@Admin1');
  };

  const onSubmit = async (values: LoginForm) => {
    setSubmitError(null);
    try {
      await login(values);
      router.replace('/(tabs)/dashboard');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Login failed. Check your Admin ID and password.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoCircle}>
          <ShieldCheck size={32} color={colors.white} strokeWidth={2.2} />
        </View>
        <Text style={styles.title}>SafePath AI</Text>
        <Text style={styles.subtitle}>Central Admin Sign-In</Text>

        <View style={styles.form}>
          <Field
            control={control}
            name="adminId"
            label="Admin ID / Official Email"
            placeholder="you@safepath.ai"
            icon={<Mail size={18} color={colors.textSecondary} />}
            autoCapitalize="none"
            keyboardType="email-address"
            error={errors.adminId?.message}
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

          <Button label="SIGN IN" onPress={handleSubmit(onSubmit)} loading={isSubmitting} style={styles.submit} />

          <View style={styles.linksRow}>
            <Text style={styles.link} onPress={() => router.push('/support')}>
              Forgot Password
            </Text>
            <Text style={styles.link} onPress={() => router.push('/support')}>
              Support
            </Text>
          </View>

          <Text style={styles.security}>Authorized SafePath personnel only. All access is logged and audited.</Text>

          <View style={styles.demoBlock}>
            <Text style={styles.demoLabel}>DEMO ACCOUNTS (tap to fill · role-based access §06)</Text>
            <View style={styles.demoChips}>
              {DEMO_ROLES.map((role) => (
                <TouchableOpacity key={role} style={styles.demoChip} onPress={() => fillDemo(role)}>
                  <Text style={styles.demoChipText}>{ADMIN_ROLE_LABELS[role]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
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
  keyboardType?: 'default' | 'email-address';
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
  linksRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  link: { ...typography.labelMd, color: colors.primaryBlue },
  security: { ...typography.labelSm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },
  demoBlock: { marginTop: spacing.lg, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  demoLabel: { ...typography.caps, color: colors.textSecondary, textAlign: 'center' },
  demoChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'center' },
  demoChip: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceMuted },
  demoChipText: { ...typography.labelSm, color: colors.text },
});
