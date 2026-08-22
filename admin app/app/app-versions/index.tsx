/** §41/§42 — App Version Management + Maintenance Mode. */
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { PermissionGate } from '@/components/common/PermissionGate';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { Permission } from '@/constants/permissions';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useAppVersions, useMaintenanceMode, useSetAppUpdateMode, useSetMaintenanceMode } from '@/features/platform/usePlatform';
import type { AppVersionInfo, MaintenanceModeConfig } from '@/types/admin';

const UPDATE_MODES: AppVersionInfo['updateMode'][] = ['NONE', 'OPTIONAL', 'FORCE'];
const TARGETS: MaintenanceModeConfig['target'][] = ['ALL', 'CITIZEN', 'MUNICIPALITY', 'FLEET'];

export default function AppVersionsScreen() {
  const { data: versions } = useAppVersions();
  const setUpdateMode = useSetAppUpdateMode();
  const { data: maintenance } = useMaintenanceMode();
  const setMaintenance = useSetMaintenanceMode();
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<MaintenanceModeConfig['target']>('ALL');
  const [confirmToggle, setConfirmToggle] = useState<boolean | null>(null);

  return (
    <View style={styles.flex}>
      <ScreenHeader title="App Versions & Maintenance" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>APP VERSIONS</Text>
        {versions?.map((v) => (
          <View key={v.app} style={styles.versionCard}>
            <View style={styles.versionHeaderRow}>
              <Text style={styles.appName}>{v.app}</Text>
              <Text style={styles.versionText}>v{v.currentVersion} · min v{v.minSupportedVersion}</Text>
            </View>
            <PermissionGate permission={Permission.MANAGE_SYSTEM}>
              <View style={styles.modeRow}>
                {UPDATE_MODES.map((mode) => (
                  <TouchableOpacity key={mode} style={[styles.modeChip, v.updateMode === mode && styles.modeChipActive]} onPress={() => setUpdateMode.mutate({ app: v.app, updateMode: mode })}>
                    <Text style={[styles.modeChipText, v.updateMode === mode && styles.modeChipTextActive]}>{mode}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </PermissionGate>
          </View>
        ))}

        <Text style={styles.sectionLabel}>MAINTENANCE MODE</Text>
        <View style={styles.maintenanceCard}>
          <View style={styles.maintenanceHeaderRow}>
            <Text style={styles.maintenanceStatus}>{maintenance?.active ? 'ACTIVE' : 'INACTIVE'}</Text>
            <PermissionGate permission={Permission.MANAGE_SYSTEM}>
              <Switch value={maintenance?.active ?? false} onValueChange={(next) => setConfirmToggle(next)} trackColor={{ true: colors.critical, false: colors.border }} />
            </PermissionGate>
          </View>
          <Text style={styles.maintenanceMessage}>{maintenance?.message}</Text>
          <Text style={styles.maintenanceTarget}>Target: {maintenance?.target}</Text>

          <PermissionGate permission={Permission.MANAGE_SYSTEM}>
            <TextInput style={styles.messageInput} value={message} onChangeText={setMessage} placeholder={maintenance?.message} placeholderTextColor={colors.textSecondary} multiline />
            <View style={styles.chipRow}>
              {TARGETS.map((t) => (
                <TouchableOpacity key={t} style={[styles.modeChip, target === t && styles.modeChipActive]} onPress={() => setTarget(t)}>
                  <Text style={[styles.modeChipText, target === t && styles.modeChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button
              label="Update Maintenance Settings"
              variant="outline"
              onPress={() => maintenance && setMaintenance.mutate({ patch: { active: maintenance.active, message: message || maintenance.message, target }, version: maintenance.version })}
            />
          </PermissionGate>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmToggle !== null}
        title={confirmToggle ? 'Activate maintenance mode?' : 'Deactivate maintenance mode?'}
        message={confirmToggle ? 'Connected apps will show a maintenance message and may restrict actions.' : 'Connected apps resume normal operation.'}
        destructive={!!confirmToggle}
        busy={setMaintenance.isPending}
        onConfirm={() => {
          if (maintenance) setMaintenance.mutate({ patch: { active: !!confirmToggle, message: message || maintenance.message, target }, version: maintenance.version });
          setConfirmToggle(null);
        }}
        onCancel={() => setConfirmToggle(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xxl },
  sectionLabel: { ...typography.caps, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs },
  versionCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm + 2, gap: spacing.xs },
  versionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  appName: { ...typography.bodyMd, fontWeight: '700', color: colors.text },
  versionText: { ...typography.labelSm, color: colors.textSecondary },
  modeRow: { flexDirection: 'row', gap: spacing.xs },
  modeChip: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  modeChipActive: { backgroundColor: colors.primaryBlue, borderColor: colors.primaryBlue },
  modeChipText: { ...typography.labelSm, color: colors.textSecondary },
  modeChipTextActive: { color: colors.white },
  maintenanceCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm + 2, gap: spacing.xs },
  maintenanceHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  maintenanceStatus: { ...typography.headlineMd, fontSize: 15, color: colors.deepNavy },
  maintenanceMessage: { ...typography.bodyMd, color: colors.text },
  maintenanceTarget: { ...typography.labelSm, color: colors.textSecondary },
  messageInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm, minHeight: 60, color: colors.text, textAlignVertical: 'top', marginTop: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
