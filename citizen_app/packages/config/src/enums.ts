/**
 * Canonical status/type/severity constants for the SafePath ecosystem.
 *
 * This is the reference copy — the values here MUST stay identical to:
 *   - apps/citizen-mobile/constants/{hazardStatus,hazardType,severity,alertType}.ts
 *   - backend/api/app/models/enums.py
 * When the Admin/Municipality/Fleet apps are scaffolded, they should import
 * from a package built off this file rather than re-declaring these unions.
 */

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

export const AlertType = {
  NEARBY_HAZARD: 'NEARBY_HAZARD',
  REPORT_UPDATE: 'REPORT_UPDATE',
  ROAD_RESOLVED: 'ROAD_RESOLVED',
  CRITICAL_HAZARD: 'CRITICAL_HAZARD',
  SYSTEM: 'SYSTEM',
} as const;
export type AlertTypeType = (typeof AlertType)[keyof typeof AlertType];

export const HazardSource = {
  CITIZEN_REPORT: 'CITIZEN_REPORT',
  FLEET_OBSERVATION: 'FLEET_OBSERVATION',
  MUNICIPALITY: 'MUNICIPALITY',
  ADMIN: 'ADMIN',
} as const;
export type HazardSourceType = (typeof HazardSource)[keyof typeof HazardSource];

export const SavedLocationLabel = {
  HOME: 'HOME',
  WORK: 'WORK',
  COLLEGE: 'COLLEGE',
  CUSTOM: 'CUSTOM',
} as const;
export type SavedLocationLabelType = (typeof SavedLocationLabel)[keyof typeof SavedLocationLabel];
