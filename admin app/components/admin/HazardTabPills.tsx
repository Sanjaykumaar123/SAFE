import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Flame,
  Layers,
  RefreshCw,
  Sparkles,
} from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { HazardTab } from '@/constants/enums';
import { colors, radius, shadow, spacing } from '@/constants/theme';

interface TabConfig {
  id: HazardTab;
  label: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  color: string;
}

const TAB_CONFIGS: TabConfig[] = [
  { id: 'ALL', label: 'All', icon: Layers, color: colors.deepNavy },
  { id: 'NEW', label: 'New', icon: Sparkles, color: '#2563EB' },
  { id: 'UNDER_REVIEW', label: 'Under Review', icon: Clock, color: '#7C3AED' },
  { id: 'ACTIVE', label: 'Active', icon: Flame, color: '#DC2626' },
  { id: 'HIGH_PRIORITY', label: 'High Priority', icon: AlertTriangle, color: '#EA580C' },
  { id: 'DUPLICATE', label: 'Duplicate', icon: Copy, color: '#64748B' },
  { id: 'RESOLVED', label: 'Resolved', icon: CheckCircle2, color: '#16A34A' },
  { id: 'REOPENED', label: 'Reopened', icon: RefreshCw, color: '#D946EF' },
];

interface HazardTabPillsProps {
  value: HazardTab;
  onChange: (tab: HazardTab) => void;
  counts?: Partial<Record<HazardTab, number>>;
}

export function HazardTabPills({ value, onChange, counts }: HazardTabPillsProps) {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {TAB_CONFIGS.map((tab) => {
          const isActive = tab.id === value;
          const Icon = tab.icon;
          const count = counts?.[tab.id];

          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => onChange(tab.id)}
              activeOpacity={0.75}
              style={[
                styles.pill,
                isActive ? [styles.pillActive, { backgroundColor: tab.color, borderColor: tab.color }] : styles.pillInactive,
              ]}
            >
              <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
                <Icon size={14} color={isActive ? '#FFFFFF' : tab.color} strokeWidth={2.4} />
              </View>

              <Text style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>
                {tab.label}
              </Text>

              {count !== undefined && count > 0 ? (
                <View style={[styles.countBadge, isActive ? styles.countBadgeActive : styles.countBadgeInactive]}>
                  <Text style={[styles.countText, isActive ? styles.countTextActive : styles.countTextInactive]}>
                    {count}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingVertical: 6,
  },
  container: {
    paddingHorizontal: spacing.md,
    gap: 8,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1.2,
    gap: 6,
    ...shadow.sm,
  },
  pillInactive: {
    backgroundColor: colors.white,
    borderColor: '#E2E8F0',
  },
  pillActive: {
    elevation: 3,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  iconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  labelInactive: {
    color: '#334155',
  },
  labelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeInactive: {
    backgroundColor: '#F1F5F9',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
  countTextInactive: {
    color: '#475569',
  },
  countTextActive: {
    color: '#FFFFFF',
  },
});
