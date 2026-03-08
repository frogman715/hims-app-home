/**
 * Phase-1 role compatibility layer.
 *
 * This file intentionally centralizes temporary legacy-to-canonical role
 * mappings so they can be tightened or removed in Phase 2.
 */

export const CANONICAL_HGI_ROLES = [
  "DIRECTOR",
  "DOCUMENT",
  "OPERATIONAL",
  "ACCOUNTING",
  "DRIVER",
  "PRINCIPAL",
] as const;

export type CanonicalHgiRole = (typeof CANONICAL_HGI_ROLES)[number];

export const LEGACY_TRANSITIONAL_ROLE_MAP: Record<string, CanonicalHgiRole | null> = {
  DIRECTOR: "DIRECTOR",
  CDMO: "DOCUMENT",
  OPERATIONAL: "OPERATIONAL",
  ACCOUNTING: "ACCOUNTING",

  // Phase-1 transitional mappings for internal documentation domain.
  // Keep these in one place so Phase 2 can narrow them safely.
  HR: "DOCUMENT",
  HR_ADMIN: "DOCUMENT",
  QMR: "DOCUMENT",
  SECTION_HEAD: "DOCUMENT",
  STAFF: "DOCUMENT",

  // IMPORTANT (Phase 1): do not auto-map crew/mobile roles to DRIVER.
  // Driver is resolved only from explicit allowlist/config signals.
  CREW: null,
  CREW_PORTAL: null,
};

export type ResolvedAuthRole = CanonicalHgiRole | "CREW" | "CREW_PORTAL";

function parseCsvSet(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

function hasExplicitRoleSignal(
  kind: "driver" | "principal",
  context?: { userId?: string | null; email?: string | null }
): boolean {
  if (!context) return false;

  const idKey = kind === "driver" ? "HGI_DRIVER_USER_IDS" : "HGI_PRINCIPAL_USER_IDS";
  const emailKey = kind === "driver" ? "HGI_DRIVER_EMAILS" : "HGI_PRINCIPAL_EMAILS";

  const idAllowlist = parseCsvSet(process.env[idKey]);
  const emailAllowlist = parseCsvSet(process.env[emailKey]);

  const userId = context.userId?.trim().toLowerCase();
  const email = context.email?.trim().toLowerCase();

  return Boolean((userId && idAllowlist.has(userId)) || (email && emailAllowlist.has(email)));
}

function normalizeRoleToken(role: string): string {
  return role.trim().toUpperCase();
}

export function resolveAuthRoles(input: {
  rawRoles?: Array<string | null | undefined>;
  userId?: string | null;
  email?: string | null;
}): ResolvedAuthRole[] {
  const collected: ResolvedAuthRole[] = [];

  for (const rawRole of input.rawRoles ?? []) {
    if (!rawRole || typeof rawRole !== "string") continue;

    const normalized = normalizeRoleToken(rawRole);

    if ((CANONICAL_HGI_ROLES as readonly string[]).includes(normalized)) {
      collected.push(normalized as CanonicalHgiRole);
      continue;
    }

    const mapped = LEGACY_TRANSITIONAL_ROLE_MAP[normalized];
    if (mapped) {
      collected.push(mapped);
      continue;
    }

    if (normalized === "CREW" || normalized === "CREW_PORTAL") {
      collected.push("CREW_PORTAL");
    }
  }

  if (hasExplicitRoleSignal("principal", input)) {
    collected.push("PRINCIPAL");
  }

  if (hasExplicitRoleSignal("driver", input)) {
    collected.push("DRIVER");
  }

  const deduped = Array.from(new Set(collected));
  return deduped.length > 0 ? deduped : ["CREW_PORTAL"];
}

export function getCompatibleOverrideRoles(role: string): string[] {
  const normalized = normalizeRoleToken(role);

  switch (normalized) {
    case "DOCUMENT":
      return ["DOCUMENT", "CDMO", "HR", "HR_ADMIN", "QMR", "SECTION_HEAD", "STAFF"];
    case "DRIVER":
      return ["DRIVER", "CREW_PORTAL", "CREW"];
    case "PRINCIPAL":
      return ["PRINCIPAL"];
    default:
      return [normalized];
  }
}

/**
 * Converts canonical/normalized auth roles into legacy DB enum roles used
 * by RoleModulePermission in Phase 1.
 */
export function getLegacyRolesForOverrideQuery(roles: string[]): string[] {
  const expanded = new Set<string>();

  for (const role of roles) {
    for (const compatible of getCompatibleOverrideRoles(role)) {
      expanded.add(compatible);
    }
  }

  return Array.from(expanded);
}
