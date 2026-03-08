/**
 * HANMARINE INTEGRATED MANAGEMENT SYSTEM (HIMS) v2
 * TYPE GUARDS AND TYPE UTILITIES
 */

import { UserRole } from "./permissions";
import type { Session } from "next-auth";
import { resolveAuthRoles } from "@/lib/role-compat";

export interface HIMSSession extends Session {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    roles: string[];
    isSystemAdmin?: boolean;
  };
}

export function isValidUserRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

export function areValidUserRoles(roles: string[]): roles is UserRole[] {
  return roles.every((role) => isValidUserRole(role));
}

export function normalizeToUserRole(
  role: string | null | undefined,
  defaultRole: UserRole = UserRole.CREW_PORTAL
): UserRole {
  const resolved = resolveAuthRoles({ rawRoles: [role] })
    .map((value) => value.toUpperCase())
    .find((value): value is UserRole => isValidUserRole(value));

  return resolved ?? defaultRole;
}

export function normalizeToUserRoles(roles: string | string[] | null | undefined): UserRole[] {
  const roleArray = Array.isArray(roles) ? roles : roles ? [roles] : [];

  const normalized = resolveAuthRoles({ rawRoles: roleArray })
    .map((value) => value.toUpperCase())
    .filter((value): value is UserRole => isValidUserRole(value));

  return normalized.length > 0 ? normalized : [UserRole.CREW_PORTAL];
}

export function hasValidSession(session: Session | null): session is HIMSSession {
  return !!(
    session?.user &&
    "id" in session.user &&
    "email" in session.user &&
    "roles" in session.user &&
    Array.isArray((session.user as HIMSSession["user"]).roles) &&
    (session.user as HIMSSession["user"]).roles.length > 0
  );
}

export function getSessionRoles(session: Session | null): UserRole[] {
  if (!hasValidSession(session)) {
    return [UserRole.CREW_PORTAL];
  }

  return normalizeToUserRoles(session.user.roles);
}

export function getSessionPrimaryRole(session: Session | null): UserRole {
  const roles = getSessionRoles(session);
  return roles[0] || UserRole.CREW_PORTAL;
}

export function isSystemAdmin(session: unknown): boolean {
  if (!session || typeof session !== "object") return false;
  const s = session as { user?: { isSystemAdmin?: boolean } };
  return !!(s.user && "isSystemAdmin" in s.user && s.user.isSystemAdmin === true);
}

export interface PermissionCheckContext {
  session: Session | null;
  requiredModule: string;
  requiredLevel: string;
}

export function isValidPermissionContext(ctx: unknown): ctx is PermissionCheckContext {
  return !!(
    ctx &&
    typeof ctx === "object" &&
    "session" in ctx &&
    "requiredModule" in ctx &&
    "requiredLevel" in ctx &&
    typeof (ctx as PermissionCheckContext).requiredModule === "string" &&
    typeof (ctx as PermissionCheckContext).requiredLevel === "string"
  );
}
