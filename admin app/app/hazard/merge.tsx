/** §18 — Duplicate Hazard Merging: pick a nearby candidate, choose the
 * canonical hazard, confirm. Evidence is never deleted — the merged
 * hazard's reports/observations roll up into the canonical one
 * (services/api/hazardsApi.ts::merge). */
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeftRight, X } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { HazardStatusBadge, SeverityBadge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useDuplicateCandidates, useHazardDetail } from '@/features/hazards/useHazardDetail';
import { useMergeHazards } from '@/features/hazards/useHazardMutations';

export default function MergeHazardsScreen() {
  const { hazardId } = useLocalSearchParams<{ hazardId: string }>();
  const { data: hazard } = useHazardDetail(hazardId);
  const { data: candidates, isLoading } = useDuplicateCandidates(hazardId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [canonicalIsA, setCanonicalIsA] = useState(true);
  const merge = useMergeHazards();

  const selected = candidates?.find((c) => c.hazardB.id === selectedId);

  const onConfirmMerge = async () => {
    if (!selected) return;
    const canonicalId = canonicalIsA ? selected.hazardA.id : selected.hazardB.id;
    const mergedId = canonicalIsA ? selected.hazardB.id : selected.hazardA.id;
    await merge.mutateAsync({ canonicalId, mergedId, version: (canonicalIsA ? selected.hazardA : selected.hazardB).version });
    router.back();
  };

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.title}>Merge Duplicate Hazards</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <LoadingState label="Finding nearby candidates…" />
      ) : !candidates?.length ? (
        <EmptyState title="No duplicate candidates" message={`No other hazards were found within 150m of ${hazard?.code ?? 'this hazard'}.`} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionLabel}>SELECT A CANDIDATE</Text>
          {candidates.map((c) => (
            <TouchableOpacity key={c.hazardB.id} onPress={() => setSelectedId(c.hazardB.id)}>
              <Card style={[styles.candidateCard, selectedId === c.hazardB.id && styles.candidateCardActive]}>
                <View style={styles.candidateRow}>
                  <Text style={styles.candidateCode}>{c.hazardB.code}</Text>
                  <Text style={styles.candidateDistance}>{c.distanceMeters}m away{c.sameRoad ? ' · same road' : ''}</Text>
                </View>
                <Text style={styles.candidateTitle}>{c.hazardB.title}</Text>
                <View style={styles.candidateBadges}>
                  <SeverityBadge severity={c.hazardB.severity} />
                  <HazardStatusBadge status={c.hazardB.status} />
                </View>
              </Card>
            </TouchableOpacity>
          ))}

          {selected ? (
            <>
              <Text style={styles.sectionLabel}>CHOOSE CANONICAL HAZARD</Text>
              <View style={styles.canonicalRow}>
                <CanonicalOption label={selected.hazardA.code} sub={selected.hazardA.title} active={canonicalIsA} onPress={() => setCanonicalIsA(true)} />
                <ArrowLeftRight size={18} color={colors.textSecondary} />
                <CanonicalOption label={selected.hazardB.code} sub={selected.hazardB.title} active={!canonicalIsA} onPress={() => setCanonicalIsA(false)} />
              </View>
              <Text style={styles.hint}>The other hazard becomes DUPLICATE and links to the canonical one. All citizen reports, fleet observations, and history are preserved (§18).</Text>
              <Button label="CONFIRM MERGE" onPress={onConfirmMerge} loading={merge.isPending} style={styles.confirmButton} />
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function CanonicalOption({ label, sub, active, onPress }: { label: string; sub: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.canonicalOption, active && styles.canonicalOptionActive]} onPress={onPress}>
      <Text style={[styles.canonicalLabel, active && styles.canonicalLabelActive]}>{label}</Text>
      <Text style={styles.canonicalSub} numberOfLines={2}>
        {sub}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  title: { ...typography.headlineMd, color: colors.deepNavy },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, paddingTop: 0, gap: spacing.xs, paddingBottom: spacing.xxl },
  sectionLabel: { ...typography.caps, color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.xs },
  candidateCard: { gap: 4, borderWidth: 1.5 },
  candidateCardActive: { borderColor: colors.primaryBlue, backgroundColor: `${colors.primaryBlue}0A` },
  candidateRow: { flexDirection: 'row', justifyContent: 'space-between' },
  candidateCode: { ...typography.numeric, color: colors.deepNavy },
  candidateDistance: { ...typography.labelSm, color: colors.primaryBlue },
  candidateTitle: { ...typography.bodyMd, color: colors.text },
  candidateBadges: { flexDirection: 'row', gap: spacing.xs },
  canonicalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  canonicalOption: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, gap: 2 },
  canonicalOptionActive: { borderColor: colors.primaryBlue, backgroundColor: `${colors.primaryBlue}0A` },
  canonicalLabel: { ...typography.numeric, color: colors.textSecondary },
  canonicalLabelActive: { color: colors.primaryBlue },
  canonicalSub: { ...typography.labelSm, color: colors.textSecondary },
  hint: { ...typography.labelSm, color: colors.textSecondary, marginTop: spacing.sm },
  confirmButton: { marginTop: spacing.lg },
});
