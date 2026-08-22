/**
 * SafePath Municipality design system tokens — same brand palette as the
 * Citizen app (SafePath AI is one product, four clients), duplicated here
 * on purpose rather than imported: this app is a separate codebase/repo
 * with no shared package between them (see README.md). Nothing outside
 * this file should hardcode a hex color or a magic spacing number.
 */
import { Platform } from 'react-native';

export const colors = {
  deepNavy: '#0B1F33',
  primaryBlue: '#1769E0',
  secondaryBlue: '#4A90E2',
  green: '#20A464',
  warning: '#F4A62A',
  critical: '#E5484D',
  amber: '#D97706',
  purple: '#7657D9',

  background: '#F7F9FC',
  white: '#FFFFFF',
  text: '#172033',
  textSecondary: '#667085',
  border: '#E4E8EF',

  surface: '#FFFFFF',
  surfaceMuted: '#F2F4F7',
  overlay: 'rgba(11, 31, 51, 0.6)',
} as const;

/** Map marker / severity color mapping (section 19) — always paired with a
 * label or icon elsewhere, never color alone. */
export const severityColors = {
  LOW: colors.secondaryBlue,
  MEDIUM: colors.amber,
  HIGH: colors.critical,
  CRITICAL: colors.critical,
} as const;

export const markerColors = {
  CRITICAL: colors.critical,
  HIGH: '#F97316',
  MEDIUM: colors.amber,
  MUNICIPAL: colors.secondaryBlue,
  RESOLVED: colors.green,
} as const;

export const statusColors = {
  REPORTED: colors.textSecondary,
  UNDER_REVIEW: colors.purple,
  VERIFIED: colors.secondaryBlue,
  ACTIVE: colors.critical,
  UNDER_REPAIR: colors.amber,
  RESOLVED: colors.green,
  REOPENED: colors.critical,
  REJECTED: colors.textSecondary,
  DUPLICATE: colors.textSecondary,
} as const;

export const repairStatusColors = {
  ASSIGNED: colors.secondaryBlue,
  IN_PROGRESS: colors.amber,
  READY_FOR_INSPECTION: colors.purple,
  REWORK_REQUIRED: colors.critical,
  RESOLVED: colors.green,
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const typography = {
  headlineLg: { fontSize: 32, lineHeight: 40, fontWeight: '700' as const, letterSpacing: -0.4 },
  headlineLgMobile: { fontSize: 24, lineHeight: 32, fontWeight: '700' as const, letterSpacing: -0.2 },
  headlineMd: { fontSize: 20, lineHeight: 28, fontWeight: '600' as const },
  bodyLg: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyMd: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  labelMd: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.4 },
  labelSm: { fontSize: 11, lineHeight: 14, fontWeight: '500' as const },
} as const;

export const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

export const shadow = {
  sm: {
    shadowColor: '#0B1F33',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#0B1F33',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
} as const;

export const MIN_TOUCH_TARGET = 44;
