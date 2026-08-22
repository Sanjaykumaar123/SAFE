import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, KeyRound } from 'lucide-react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { colors, spacing, typography } from '@/constants/theme';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '@/features/auth/schemas';

type Step = 'request' | 'reset' | 'done';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>('request');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { identifier: '' } });

  async function handleSendCode() {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setIsSubmitting(false);
    setStep('reset');
  }

  async function handleReset() {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setIsSubmitting(false);
    setStep('done');
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {step === 'request' && (
            <>
              <View style={styles.header}>
                <View style={styles.iconCircle}>
                  <KeyRound size={28} color={colors.white} />
                </View>
                <Text style={styles.title}>Reset your password</Text>
                <Text style={styles.subtitle}>Enter the email or mobile number linked to your account. We&apos;ll send you a reset code.</Text>
              </View>
              <View style={styles.form}>
                <Controller
                  control={control}
                  name="identifier"
                  render={({ field }) => (
                    <Input label="Email or mobile" placeholder="you@example.com" autoCapitalize="none" value={field.value} onChangeText={field.onChange} error={errors.identifier?.message} />
                  )}
                />
                <Button label="Send Reset Code" onPress={handleSubmit(handleSendCode)} loading={isSubmitting} size="lg" />
              </View>
            </>
          )}

          {step === 'reset' && (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Enter reset code</Text>
                <Text style={styles.subtitle}>We sent a 6-digit code. Enter it below along with your new password.</Text>
              </View>
              <View style={styles.form}>
                <Input label="Reset code" placeholder="123456" keyboardType="number-pad" value={code} onChangeText={setCode} />
                <Input label="New password" placeholder="At least 8 characters" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
                <Button label="Reset Password" onPress={handleReset} loading={isSubmitting} size="lg" disabled={code.length < 4 || newPassword.length < 8} />
              </View>
            </>
          )}

          {step === 'done' && (
            <View style={styles.doneContainer}>
              <CheckCircle2 size={56} color={colors.green} />
              <Text style={styles.title}>Password reset</Text>
              <Text style={styles.subtitle}>You can now log in with your new password.</Text>
              <Button label="Back to Login" onPress={() => router.replace('/(auth)/login')} size="lg" />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.xl },
  header: { alignItems: 'center', gap: spacing.xs },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.deepNavy, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  title: { ...typography.headlineLg, color: colors.text, textAlign: 'center' },
  subtitle: { ...typography.bodyMd, color: colors.textSecondary, textAlign: 'center' },
  form: { gap: spacing.md },
  doneContainer: { alignItems: 'center', gap: spacing.sm },
});
