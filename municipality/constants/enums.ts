/**
 * Mirrors `citizen app/backend/api/app/models/enums.py` exactly — the
 * backend is the source of truth (it's the same shared database/API this
 * app is a client of); nothing here should ever drift from those string
 * values, only the display labels are this app's own.
 */

export const HazardStatus = {
  REPORTED: 'REPORTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  VERIFIED: 'VERIFIED',
  ACTIVE: 'ACTIVE',
  UNDER_REPAIR: 'UNDER_REPAIR',
  RESOLVED: 'RESOLVED',
  REOPENED: 'REOPENED',
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
  HazardStatus.REOPENED,
];

export const HAZARD_STATUS_LABELS: Record<HazardStatusType, string> = {
  REPORTED: 'Reported',
  UNDER_REVIEW: 'Under Review',
  VERIFIED: 'Verified',
  ACTIVE: 'Active',
  UNDER_REPAIR: 'Under Repair',
  RESOLVED: 'Resolved',
  REOPENED: 'Reopened',
  REJECTED: 'Rejected',
  DUPLICATE: 'Duplicate',
};

export const HazardType = {
  POTHOLE: 'POTHOLE',
  ROAD_DAMAGE: 'ROAD_DAMAGE',
  FLOODING: 'FLOODING',
  DEBRIS: 'DEBRIS',
  BROKEN_PAVEMENT: 'BROKEN_PAVEMENT',
  OTHER: 'OTHER',
} as const;
export type HazardTypeType = (typeof HazardType)[keyof typeof HazardType];

export const HAZARD_TYPE_LABELS: Record<HazardTypeType, string> = {
  POTHOLE: 'Pothole',
  ROAD_DAMAGE: 'Road Damage',
  FLOODING: 'Flooding',
  DEBRIS: 'Debris',
  BROKEN_PAVEMENT: 'Broken Pavement',
  OTHER: 'Other',
};

export const Severity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type SeverityType = (typeof Severity)[keyof typeof Severity];

export const SOURCE_SUMMARY_LABELS: Record<string, string> = {
  CITIZEN: 'Citizen',
  FLEET: 'Fleet',
  CITIZEN_AND_FLEET: 'Citizen + Fleet',
  MUNICIPALITY: 'Municipality',
};

export const RepairStatus = {
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  READY_FOR_INSPECTION: 'READY_FOR_INSPECTION',
  REWORK_REQUIRED: 'REWORK_REQUIRED',
  RESOLVED: 'RESOLVED',
} as const;
export type RepairStatusType = (typeof RepairStatus)[keyof typeof RepairStatus];

export const REPAIR_STATUS_LABELS: Record<RepairStatusType, string> = {
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  READY_FOR_INSPECTION: 'Ready for Inspection',
  REWORK_REQUIRED: 'Rework Required',
  RESOLVED: 'Resolved',
};

export const RepairPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type RepairPriorityType = (typeof RepairPriority)[keyof typeof RepairPriority];

export const VerificationState = {
  STILL_ACTIVE: 'STILL_ACTIVE',
  PROBABLY_CLEAR: 'PROBABLY_CLEAR',
  UNDER_VERIFICATION: 'UNDER_VERIFICATION',
  CONFIRMED_CLEAR: 'CONFIRMED_CLEAR',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
} as const;
export type VerificationStateType = (typeof VerificationState)[keyof typeof VerificationState];

export const VERIFICATION_STATE_LABELS: Record<VerificationStateType, string> = {
  STILL_ACTIVE: 'Still Active',
  PROBABLY_CLEAR: 'Probably Clear',
  UNDER_VERIFICATION: 'Under Verification',
  CONFIRMED_CLEAR: 'Confirmed Clear',
  INSUFFICIENT_EVIDENCE: 'Insufficient Evidence',
};

export const VerificationMethod = {
  MUNICIPAL_INSPECTION: 'MUNICIPAL_INSPECTION',
  FLEET_REVALIDATION: 'FLEET_REVALIDATION',
  COMBINED: 'COMBINED',
} as const;
export type VerificationMethodType = (typeof VerificationMethod)[keyof typeof VerificationMethod];

export const InspectionDecision = {
  APPROVED: 'APPROVED',
  REWORK_REQUESTED: 'REWORK_REQUESTED',
} as const;
export type InspectionDecisionType = (typeof InspectionDecision)[keyof typeof InspectionDecision];

/** Section 09 — mirrors `MunicipalityPermission` on the backend. Never used
 * to *grant* access client-side, only to decide what to render; the server
 * re-checks every mutating call. */
export const MunicipalityPermission = {
  VIEW_HAZARDS: 'VIEW_HAZARDS',
  ASSIGN_REPAIR: 'ASSIGN_REPAIR',
  UPDATE_REPAIR: 'UPDATE_REPAIR',
  INSPECT_HAZARD: 'INSPECT_HAZARD',
  RESOLVE_HAZARD: 'RESOLVE_HAZARD',
  VIEW_ANALYTICS: 'VIEW_ANALYTICS',
  MANAGE_OFFICERS: 'MANAGE_OFFICERS',
} as const;
export type MunicipalityPermissionType = (typeof MunicipalityPermission)[keyof typeof MunicipalityPermission];
