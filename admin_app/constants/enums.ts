/**
 * Mirrors the shared SafePath backend's enums (same source of truth the
 * Citizen/Municipality/Fleet apps mirror in their own `constants/enums.ts`)
 * plus the Admin-only superset described in the product spec §14/§30/§39.
 * Nothing here should ever drift from the backend's string values — only
 * the display labels below are this app's own.
 */

export const HazardStatus = {
  REPORTED: 'REPORTED',
  NEW: 'NEW',
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

export const HAZARD_STATUS_LABELS: Record<HazardStatusType, string> = {
  REPORTED: 'New',
  NEW: 'New',
  UNDER_REVIEW: 'Under Review',
  VERIFIED: 'Verified',
  ACTIVE: 'Active',
  UNDER_REPAIR: 'Under Repair',
  RESOLVED: 'Resolved',
  REOPENED: 'Reopened',
  REJECTED: 'Rejected',
  DUPLICATE: 'Duplicate',
};

/** §14 — hazard tabs, "ALL" is handled separately by the screen. */
export const HAZARD_TABS = ['NEW', 'UNDER_REVIEW', 'ACTIVE', 'HIGH_PRIORITY', 'DUPLICATE', 'RESOLVED', 'REOPENED'] as const;
export type HazardTab = 'ALL' | (typeof HAZARD_TABS)[number];

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

export const SOURCE_LABELS: Record<string, string> = {
  CITIZEN: 'Citizen',
  FLEET: 'Fleet',
  AI: 'AI',
  CITIZEN_AND_FLEET: 'Citizen + Fleet',
  MUNICIPALITY: 'Municipality',
};

export const CitizenReportStatus = {
  NEW: 'NEW',
  UNDER_REVIEW: 'UNDER_REVIEW',
  VERIFIED: 'VERIFIED',
  DUPLICATE: 'DUPLICATE',
  REJECTED: 'REJECTED',
  RESOLVED: 'RESOLVED',
} as const;
export type CitizenReportStatusType = (typeof CitizenReportStatus)[keyof typeof CitizenReportStatus];

export const UserRole = {
  CITIZEN: 'CITIZEN',
  MUNICIPALITY_OFFICER: 'MUNICIPALITY_OFFICER',
  FLEET_OPERATOR: 'FLEET_OPERATOR',
  ADMIN: 'ADMIN',
} as const;
export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

export const UserAccountStatus = {
  ACTIVE: 'ACTIVE',
  DEACTIVATED: 'DEACTIVATED',
  LOCKED: 'LOCKED',
  PENDING: 'PENDING',
} as const;
export type UserAccountStatusType = (typeof UserAccountStatus)[keyof typeof UserAccountStatus];

/** §06 — the eight administrative roles the spec calls out. */
export const AdminRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  DATA_ADMIN: 'DATA_ADMIN',
  CITY_ADMIN: 'CITY_ADMIN',
  FLEET_ADMIN: 'FLEET_ADMIN',
  AI_ADMIN: 'AI_ADMIN',
  SUPPORT_ADMIN: 'SUPPORT_ADMIN',
  ANALYST: 'ANALYST',
} as const;
export type AdminRoleType = (typeof AdminRole)[keyof typeof AdminRole];

export const ADMIN_ROLE_LABELS: Record<AdminRoleType, string> = {
  SUPER_ADMIN: 'Super Admin',
  PLATFORM_ADMIN: 'Platform Admin',
  DATA_ADMIN: 'Data Admin',
  CITY_ADMIN: 'City Admin',
  FLEET_ADMIN: 'Fleet Admin',
  AI_ADMIN: 'AI Admin',
  SUPPORT_ADMIN: 'Support Admin',
  ANALYST: 'Analyst',
};

export const VehicleStatus = {
  LIVE: 'LIVE',
  IDLE: 'IDLE',
  OFFLINE: 'OFFLINE',
  DISABLED: 'DISABLED',
} as const;
export type VehicleStatusType = (typeof VehicleStatus)[keyof typeof VehicleStatus];

export const OperatorStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  PENDING: 'PENDING',
  DEACTIVATED: 'DEACTIVATED',
} as const;
export type OperatorStatusType = (typeof OperatorStatus)[keyof typeof OperatorStatus];

export const PaymentStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  PAID: 'PAID',
  HELD: 'HELD',
  FAILED: 'FAILED',
  REJECTED: 'REJECTED',
} as const;
export type PaymentStatusType = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const ModelStatus = {
  TRAINING: 'TRAINING',
  STAGING: 'STAGING',
  PRODUCTION: 'PRODUCTION',
  DEPRECATED: 'DEPRECATED',
} as const;
export type ModelStatusType = (typeof ModelStatus)[keyof typeof ModelStatus];

export const ServiceHealth = {
  HEALTHY: 'HEALTHY',
  WARNING: 'WARNING',
  DOWN: 'DOWN',
} as const;
export type ServiceHealthType = (typeof ServiceHealth)[keyof typeof ServiceHealth];

export const NotificationPriority = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  INFO: 'INFO',
} as const;
export type NotificationPriorityType = (typeof NotificationPriority)[keyof typeof NotificationPriority];

export const AnomalySeverity = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;
export type AnomalySeverityType = (typeof AnomalySeverity)[keyof typeof AnomalySeverity];

export const CityStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ONBOARDING: 'ONBOARDING',
} as const;
export type CityStatusType = (typeof CityStatus)[keyof typeof CityStatus];
