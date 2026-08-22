/**
 * Mirrors `citizen app/backend/api/app/models/enums.py` field-for-field
 * for the values the Fleet app cares about — same convention
 * `municipality/constants/enums.ts` follows. Every enum object is `as
 * const` with a derived `XxxType`.
 */

export const HazardType = {
  POTHOLE: 'POTHOLE',
  ROAD_DAMAGE: 'ROAD_DAMAGE',
  FLOODING: 'FLOODING',
  DEBRIS: 'DEBRIS',
  BROKEN_PAVEMENT: 'BROKEN_PAVEMENT',
  OTHER: 'OTHER',
} as const;
export type HazardTypeType = (typeof HazardType)[keyof typeof HazardType];

export const Severity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type SeverityType = (typeof Severity)[keyof typeof Severity];

export const CollectionSessionStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  VALIDATED: 'VALIDATED',
  PARTIALLY_VALIDATED: 'PARTIALLY_VALIDATED',
} as const;
export type CollectionSessionStatusType = (typeof CollectionSessionStatus)[keyof typeof CollectionSessionStatus];

export const CollectionSessionStatusLabels: Record<CollectionSessionStatusType, string> = {
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  VALIDATED: 'Validated',
  PARTIALLY_VALIDATED: 'Under Review',
};

export const EarningStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  PAID: 'PAID',
} as const;
export type EarningStatusType = (typeof EarningStatus)[keyof typeof EarningStatus];

/**
 * Client-only concept (§28) — the backend has no column for this; it's the
 * state of a `QueuedObservation` sitting in `services/offline/observationQueue.ts`
 * before/while it's being sent.
 */
export const SyncStatus = {
  QUEUED: 'QUEUED',
  UPLOADING: 'UPLOADING',
  SYNCED: 'SYNCED',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING',
} as const;
export type SyncStatusType = (typeof SyncStatus)[keyof typeof SyncStatus];

/** §17/46 — device health probe results, one per subsystem. */
export const HealthState = {
  READY: 'READY',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
} as const;
export type HealthStateType = (typeof HealthState)[keyof typeof HealthState];
