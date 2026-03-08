export type CanonicalAppRole =
  | "DIRECTOR"
  | "DOCUMENT"
  | "OPERATIONAL"
  | "ACCOUNTING"
  | "DRIVER"
  | "PRINCIPAL";

export type TransitionalLegacyRole =
  | "CDMO"
  | "HR"
  | "HR_ADMIN"
  | "QMR"
  | "SECTION_HEAD"
  | "STAFF"
  | "CREW"
  | "CREW_PORTAL";

export type AppRole = CanonicalAppRole | TransitionalLegacyRole;

export const APP_ROLES = {
  DIRECTOR: "DIRECTOR",
  DOCUMENT: "DOCUMENT",
  OPERATIONAL: "OPERATIONAL",
  ACCOUNTING: "ACCOUNTING",
  DRIVER: "DRIVER",
  PRINCIPAL: "PRINCIPAL",

  // Transitional legacy aliases kept for Phase 1 compatibility.
  CDMO: "CDMO",
  HR: "HR",
  HR_ADMIN: "HR_ADMIN",
  QMR: "QMR",
  SECTION_HEAD: "SECTION_HEAD",
  STAFF: "STAFF",
  CREW: "CREW",
  CREW_PORTAL: "CREW_PORTAL",
} as const;

export const CANONICAL_ROLES = [
  APP_ROLES.DIRECTOR,
  APP_ROLES.DOCUMENT,
  APP_ROLES.OPERATIONAL,
  APP_ROLES.ACCOUNTING,
  APP_ROLES.DRIVER,
  APP_ROLES.PRINCIPAL,
] as const satisfies readonly AppRole[];

export const OFFICE_ROLES = [
  APP_ROLES.DIRECTOR,
  APP_ROLES.DOCUMENT,
  APP_ROLES.OPERATIONAL,
  APP_ROLES.ACCOUNTING,
  APP_ROLES.PRINCIPAL,
] as const satisfies readonly AppRole[];

export const CREW_ROLES = [
  APP_ROLES.DRIVER,
  APP_ROLES.CREW,
  APP_ROLES.CREW_PORTAL,
] as const satisfies readonly AppRole[];

export const LEGACY_TRANSITIONAL_ROLES = [
  APP_ROLES.CDMO,
  APP_ROLES.HR,
  APP_ROLES.HR_ADMIN,
  APP_ROLES.QMR,
  APP_ROLES.SECTION_HEAD,
  APP_ROLES.STAFF,
] as const satisfies readonly AppRole[];

export const ALL_APP_ROLES = [
  ...CANONICAL_ROLES,
  ...LEGACY_TRANSITIONAL_ROLES,
  ...CREW_ROLES,
] as const satisfies readonly AppRole[];

export const CREW_ROLE_SET = new Set<AppRole>(CREW_ROLES);
export const OFFICE_ROLE_SET = new Set<AppRole>(OFFICE_ROLES);
