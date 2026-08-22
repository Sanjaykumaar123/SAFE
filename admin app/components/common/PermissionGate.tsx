/** §07 — "Do not hardcode role checks throughout screens. Use
 * PermissionService." Wrap any action/button that mutates data in this
 * instead of checking `admin.role` directly. Rendering nothing (rather
 * than a disabled control) matches the spec's read-only ANALYST screens
 * (§86), which shouldn't even see actions they can't take. */
import type { ReactNode } from 'react';

import type { PermissionType } from '@/constants/permissions';
import { useAuthStore } from '@/store/authStore';

export function PermissionGate({ permission, fallback = null, children }: { permission: PermissionType; fallback?: ReactNode; children: ReactNode }) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
}
