/** Hazard/report status constants — import these everywhere instead of
 * writing the raw string (section 12). Mirrors backend `app/models/enums.py`
 * and `packages/config`. */
export const HazardStatus = {
  REPORTED: 'REPORTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  VERIFIED: 'VERIFIED',
  ACTIVE: 'ACTIVE',
  UNDER_REPAIR: 'UNDER_REPAIR',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
  DUPLICATE: 'DUPLICATE',
} as const;

export type HazardStatusType = (typeof HazardStatus)[keyof typeof HazardStatus];

export const ACTIVE_HAZARD_STATUSES: HazardStatusType[] = [
  HazardStatus.REPORTED,
  HazardStatus.UNDER_REVIEW,
  HazardStatus.VERIFIED,
  HazardStatus.ACTIVE,
  HazardStatus.UNDER_REPAIR,
];

export const HAZARD_STATUS_LABELS: Record<HazardStatusType, string> = {
  REPORTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  VERIFIED: 'Verified',
  ACTIVE: 'Active',
  UNDER_REPAIR: 'Under Repair',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
  DUPLICATE: 'Duplicate',
};

/** Ordered timeline stages shown on the report success/detail screens
 * (section 24/26) — resolved is the terminal happy-path state. */
export const REPORT_TIMELINE_STAGES: HazardStatusType[] = [
  HazardStatus.REPORTED,
  HazardStatus.UNDER_REVIEW,
  HazardStatus.VERIFIED,
  HazardStatus.RESOLVED,
];
