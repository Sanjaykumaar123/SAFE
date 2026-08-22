export const Severity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type SeverityType = (typeof Severity)[keyof typeof Severity];

export const SEVERITY_LABELS: Record<SeverityType, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const SEVERITY_OPTIONS: { value: SeverityType; label: string }[] = Object.entries(SEVERITY_LABELS).map(
  ([value, label]) => ({ value: value as SeverityType, label })
);
