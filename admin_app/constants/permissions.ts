/**
 * §06/§07 — the Admin app's granular permission model. Screens/components
 * call `hasPermission()` (via `usePermission` in store/authStore.ts) and
 * never hardcode a role check directly (§07: "Do not hardcode role checks
 * throughout screens. Use PermissionService."). This client-side map is
 * ONLY used to decide what to render — the backend re-checks every
 * mutating call server-side (§05: "The mobile app is never trusted to
 * authorize itself.").
 */
import type { AdminRoleType } from './enums';

export const Permission = {
  VIEW_DASHBOARD: 'VIEW_DASHBOARD',
  VIEW_HAZARDS: 'VIEW_HAZARDS',
  VALIDATE_HAZARD: 'VALIDATE_HAZARD',
  MERGE_HAZARD: 'MERGE_HAZARD',
  REJECT_HAZARD: 'REJECT_HAZARD',
  REOPEN_HAZARD: 'REOPEN_HAZARD',
  MANAGE_CITIES: 'MANAGE_CITIES',
  MANAGE_MUNICIPALITIES: 'MANAGE_MUNICIPALITIES',
  MANAGE_FLEET: 'MANAGE_FLEET',
  MANAGE_OPERATORS: 'MANAGE_OPERATORS',
  MANAGE_VEHICLES: 'MANAGE_VEHICLES',
  MANAGE_PAYMENTS: 'MANAGE_PAYMENTS',
  MANAGE_USERS: 'MANAGE_USERS',
  MANAGE_AI: 'MANAGE_AI',
  VIEW_ANALYTICS: 'VIEW_ANALYTICS',
  MANAGE_FEATURE_FLAGS: 'MANAGE_FEATURE_FLAGS',
  MANAGE_NOTIFICATIONS: 'MANAGE_NOTIFICATIONS',
  VIEW_AUDIT_LOG: 'VIEW_AUDIT_LOG',
  MANAGE_SYSTEM: 'MANAGE_SYSTEM',
} as const;
export type PermissionType = (typeof Permission)[keyof typeof Permission];

const ALL_PERMISSIONS = Object.values(Permission) as PermissionType[];

/** §06/§86 — example role grants from the spec. Analysts are read-only;
 * every other role gets full access plus its named specialty so the demo
 * (§87) can be driven end-to-end by a SUPER_ADMIN while still letting the
 * access-control tests (§86) exercise a narrower role. */
export const ROLE_PERMISSIONS: Record<AdminRoleType, PermissionType[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  PLATFORM_ADMIN: ALL_PERMISSIONS.filter((p) => p !== Permission.MANAGE_AI),
  DATA_ADMIN: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_HAZARDS,
    Permission.VALIDATE_HAZARD,
    Permission.MERGE_HAZARD,
    Permission.REJECT_HAZARD,
    Permission.REOPEN_HAZARD,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_AUDIT_LOG,
  ],
  CITY_ADMIN: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_HAZARDS,
    Permission.MANAGE_CITIES,
    Permission.MANAGE_MUNICIPALITIES,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_AUDIT_LOG,
  ],
  FLEET_ADMIN: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_HAZARDS,
    Permission.MANAGE_FLEET,
    Permission.MANAGE_OPERATORS,
    Permission.MANAGE_VEHICLES,
    Permission.MANAGE_PAYMENTS,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_AUDIT_LOG,
  ],
  AI_ADMIN: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_HAZARDS,
    Permission.MANAGE_AI,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_AUDIT_LOG,
  ],
  SUPPORT_ADMIN: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_HAZARDS,
    Permission.MANAGE_USERS,
    Permission.MANAGE_NOTIFICATIONS,
    Permission.VIEW_AUDIT_LOG,
  ],
  ANALYST: [Permission.VIEW_DASHBOARD, Permission.VIEW_HAZARDS, Permission.VIEW_ANALYTICS],
};
