/**
 * SafePath Admin design tokens — sourced from the Stitch "SafePath AI
 * Admin / Location Intelligence Control" design reference (DESIGN.md):
 * a Navy + Action Blue "corporate/modern, high-density" system built for
 * split-view map + data-drawer screens. Same token *shape* as the Citizen/
 * Municipality/Fleet apps (colors, spacing, radius, typography, shadow) so
 * the codebases stay easy to move between, duplicated on purpose — this is
 * a separate repo with no shared package (see README.md). Nothing outside
 * this file should hardcode a hex color or a magic spacing number.
 */
import { Platform } from 'react-native';

export const colors = {
  deepNavy: '#0D1C32',
  primaryBlue: '#0058BC',
  secondaryBlue: '#0070EB',
  green: '#00993B',
  warning: '#D97706',
  critical: '#BA1A1A',
  amber: '#D97706',
  purple: '#6E4CC0',

  background: '#F7F9FB',
  white: '#FFFFFF',
  text: '#191C1E',
  textSecondary: '#44474D',
  border: '#E0E3E5',
  borderStrong: '#C5C6CD',

  surface: '#FFFFFF',
  surfaceMuted: '#F2F4F6',
  surfaceContainer: '#ECEEF0',
  overlay: 'rgba(13, 28, 50, 0.6)',
} as const;

/** Severity color mapping (§14/§17) — always paired with a label or icon
 * elsewhere, never color alone. */
export const severityColors = {
  LOW: colors.secondaryBlue,
  MEDIUM: colors.amber,
  HIGH: '#F97316',
  CRITICAL: colors.critical,
} as const;

export const markerColors = {
  CRITICAL: colors.critical,
  HIGH: '#F97316',
  MEDIUM: colors.amber,
  LOW: colors.secondaryBlue,
  RESOLVED: colors.green,
  FLEET: colors.primaryBlue,
} as const;

/** Hazard admin-state colors (§14) — the Admin app's superset of the
 * municipality lifecycle: adds NEW/UNDER_REVIEW/DUPLICATE at the front of
 * the funnel and REOPENED/HIGH_PRIORITY as explicit tabs. */
export const hazardStatusColors = {
  NEW: colors.textSecondary,
  UNDER_REVIEW: colors.purple,
  VERIFIED: colors.secondaryBlue,
  ACTIVE: colors.critical,
  UNDER_REPAIR: colors.amber,
  RESOLVED: colors.green,
  REOPENED: colors.critical,
  REJECTED: colors.textSecondary,
  DUPLICATE: colors.textSecondary,
} as const;

export const systemStatusColors = {
  HEALTHY: colors.green,
  WARNING: colors.amber,
  DOWN: colors.critical,
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
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

export const typography = {
  headlineLg: { fontSize: 30, lineHeight: 38, fontWeight: '700' as const, letterSpacing: -0.4 },
  headlineLgMobile: { fontSize: 24, lineHeight: 32, fontWeight: '700' as const, letterSpacing: -0.2 },
  headlineMd: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  bodyLg: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyMd: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  labelMd: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.3 },
  labelSm: { fontSize: 11, lineHeight: 14, fontWeight: '500' as const },
  /** Numeric/coordinate/ID emphasis — mono for tabular alignment (DESIGN.md
   * "label-numeric"). Falls back to the system monospace face; no custom
   * font file is bundled in this pass. */
  numeric: { fontSize: 13, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.2, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
  caps: { fontSize: 10, lineHeight: 12, fontWeight: '700' as const, letterSpacing: 0.6 },
} as const;

export const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

export const shadow = {
  sm: {
    shadowColor: '#0D1C32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#0D1C32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
} as const;

export const MIN_TOUCH_TARGET = 44;

/** §12/§64 — radius chip steps used everywhere an admin scopes data to a
 * searched place (Dashboard, Hazards, Fleet). 20km is the product default
 * ("nearby" for a city-scale search across all of India, §concept). */
export const RADIUS_STEPS_KM = [5, 10, 20, 30, 50] as const;
export const DEFAULT_RADIUS_KM = 20;
