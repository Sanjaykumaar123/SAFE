import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { Button } from '@/components/common/Button';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { RepairPriority } from '@/constants/enums';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAssignRepair } from '@/features/repairs/useRepairs';

const schema = z.object({
  department: z.string().min(1, 'Department is required'),
  zone: z.string().optional(),
  team: z.string().optional(),
  assignedOfficerName: z.string().optional(),
  priority: z.enum([RepairPriority.LOW, RepairPriority.MEDIUM, RepairPriority.HIGH, RepairPriority.CRITICAL]),
  targetDate: z.string().optional(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const PRIORITIES = [RepairPriority.LOW, RepairPriority.MEDIUM, RepairPriority.HIGH, RepairPriority.CRITICAL];

export default function AssignRepairScreen() {
  const { hazardId } = useLocalSearchParams<{ hazardId: string }>();
  const insets = useSafeAreaInsets();
  const assignRepair = useAssignRepair();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { control, handleSubmit, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { department: 'Road Maintenance', priority: RepairPriority.MEDIUM },
  });
  const priority = watch('priority');

  const onSubmit = async (values: FormValues) => {
    if (!hazardId) return;
    setSubmitError(null);
    try {
      await assignRepair.mutateAsync({ hazardId, ...values });
      router.replace({ pathname: '/repair/success' as never, params: { hazardId } });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not assign repair. Please try again.');
    }
  };

  return (
    <View style={[styles.flex, { paddingTop: insets.top + spacing.sm }]}>
      <ScreenHeader title="Assign Repair" />
      <ScrollView contentContainerStyle={styles.container}>
        <TextField control={control} name="department" label="Department" placeholder="Road Maintenance" />
        <TextField control={control} name="zone" label="Maintenance Zone" placeholder="Zone 4" />
        <TextField control={control} name="team" label="Team" placeholder="Zone 4 Road Maintenance Team" />
        <TextField control={control} name="assignedOfficerName" label="Assigned Officer (optional)" placeholder="Officer name" />

        <Text style={styles.fieldLabel}>Priority</Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => (
            <Text key={p} style={[styles.priorityChip, priority === p && styles.priorityChipActive]} onPress={() => setValue('priority', p)}>
              {p}
            </Text>
          ))}
        </View>

        <TextField control={control} name="targetDate" label="Target Date (YYYY-MM-DD)" placeholder="2026-08-25" />
        <TextField control={control} name="notes" label="Notes" placeholder="Additional instructions for the crew…" multiline />

        {submitError ? <Text style={styles.errorBanner}>{submitError}</Text> : null}

        <Button label="Assign Repair" onPress={handleSubmit(onSubmit)} loading={assignRepair.isPending} style={styles.submit} />
      </ScrollView>
    </View>
  );
}

function TextField({
  control,
  name,
  label,
  placeholder,
  multiline,
}: {
  control: ReturnType<typeof useForm<FormValues>>['control'];
  name: keyof FormValues;
  label: string;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.input, multiline && styles.inputMultiline]}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value ?? ''}
            multiline={multiline}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  fieldGroup: { gap: spacing.xs },
  fieldLabel: { ...typography.labelMd, color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4, backgroundColor: colors.surface, ...typography.bodyLg, color: colors.text },
  inputMultiline: { minHeight: 90, textAlignVertical: 'top' },
  priorityRow: { flexDirection: 'row', gap: spacing.xs },
  priorityChip: {
    ...typography.labelMd,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  priorityChipActive: { backgroundColor: colors.deepNavy, color: colors.white },
  errorBanner: { ...typography.bodyMd, color: colors.critical, backgroundColor: `${colors.critical}14`, padding: spacing.sm, borderRadius: radius.sm },
  submit: { marginTop: spacing.sm },
});
