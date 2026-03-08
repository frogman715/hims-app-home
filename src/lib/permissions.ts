import { getCompatibleOverrideRoles } from "@/lib/role-compat";

export enum UserRole {
  DIRECTOR = "DIRECTOR",
  DOCUMENT = "DOCUMENT",
  OPERATIONAL = "OPERATIONAL",
  ACCOUNTING = "ACCOUNTING",
  DRIVER = "DRIVER",
  PRINCIPAL = "PRINCIPAL",

  // Transitional legacy roles (Phase 1 compatibility)
  CDMO = "CDMO",
  HR = "HR",
  HR_ADMIN = "HR_ADMIN",
  QMR = "QMR",
  SECTION_HEAD = "SECTION_HEAD",
  STAFF = "STAFF",
  CREW = "CREW",
  CREW_PORTAL = "CREW_PORTAL",
}

export enum PermissionLevel {
  NO_ACCESS = "NO_ACCESS",
  VIEW_ACCESS = "VIEW_ACCESS",
  EDIT_ACCESS = "EDIT_ACCESS",
  FULL_ACCESS = "FULL_ACCESS",
}

export enum ModuleName {
  dashboard = "dashboard",
  crew = "crew",
  principals = "principals",
  contracts = "contracts",
  applications = "applications",
  assignments = "assignments",
  vessels = "vessels",
  documents = "documents",
  medical = "medical",
  visas = "visas",
  agencyFees = "agencyFees",
  accounting = "accounting",
  wageScales = "wageScales",
  agencyAgreements = "agencyAgreements",
  disciplinary = "disciplinary",
  quality = "quality",
  nationalHolidays = "nationalHolidays",
  compliance = "compliance",
  crewing = "crewing",
  insurance = "insurance",
  dispatches = "dispatches",
  pkl = "pkl",

  // Additional module keys already used by APIs/pages.
  hr = "hr",
  admin = "admin",

  // Phase-1 sidebar/business capability keys.
  candidates = "candidates",
  ownerSubmissions = "ownerSubmissions",
  cvGenerator = "cvGenerator",
  expiry = "expiry",
  approvedCandidates = "approvedCandidates",
  preJoining = "preJoining",
  dispatch = "dispatch",
  visaClearance = "visaClearance",
  invoices = "invoices",
  expenses = "expenses",
  myDispatch = "myDispatch",
  letterGuarantee = "letterGuarantee",
  history = "history",
}

export enum DataSensitivity {
  RED = "RED",
  AMBER = "AMBER",
  GREEN = "GREEN",
}

export interface RolePermissionOverride {
  role: string;
  moduleKey: string;
  level: PermissionLevel | `${PermissionLevel}`;
}

const PERMISSION_ORDER: PermissionLevel[] = [
  PermissionLevel.NO_ACCESS,
  PermissionLevel.VIEW_ACCESS,
  PermissionLevel.EDIT_ACCESS,
  PermissionLevel.FULL_ACCESS,
];

const ALL_MODULES = Object.values(ModuleName) as ModuleName[];

function buildPermissions(
  defaultLevel: PermissionLevel,
  overrides: Partial<Record<ModuleName, PermissionLevel>> = {}
): Record<ModuleName, PermissionLevel> {
  const base = Object.fromEntries(
    ALL_MODULES.map((moduleName) => [moduleName, defaultLevel])
  ) as Record<ModuleName, PermissionLevel>;

  return {
    ...base,
    ...overrides,
  };
}

function normalizeModuleKey(moduleKey: string): ModuleName | null {
  const normalized = moduleKey as ModuleName;
  if ((Object.values(ModuleName) as string[]).includes(normalized)) {
    return normalized;
  }

  const lowerKey = moduleKey.toLowerCase();
  const matched = (Object.values(ModuleName) as string[]).find(
    (value) => value.toLowerCase() === lowerKey
  );

  return (matched as ModuleName | undefined) ?? null;
}

function normalizePermissionLevel(value: unknown): PermissionLevel | null {
  if (typeof value !== "string") return null;
  const upper = value.toUpperCase() as PermissionLevel;
  return PERMISSION_ORDER.includes(upper) ? upper : null;
}

function comparePermissionLevels(a: PermissionLevel, b: PermissionLevel): number {
  return PERMISSION_ORDER.indexOf(a) - PERMISSION_ORDER.indexOf(b);
}

function resolveRolePermission(
  role: UserRole,
  module: string,
  overrides?: RolePermissionOverride[] | null
): PermissionLevel {
  const normalizedModule = normalizeModuleKey(module) ?? (module as ModuleName);
  const fallbackLevel =
    PERMISSION_MATRIX[role]?.[normalizedModule as ModuleName] ?? PermissionLevel.NO_ACCESS;

  if (!overrides || overrides.length === 0) {
    return fallbackLevel;
  }

  const lowerModuleKey = module.toLowerCase();
  const compatibleRoles = new Set(getCompatibleOverrideRoles(role));

  const overrideEntry = overrides.find((entry) => {
    const entryRole = entry.role.toUpperCase();
    return compatibleRoles.has(entryRole) && entry.moduleKey.toLowerCase() === lowerModuleKey;
  });

  const overrideLevel = normalizePermissionLevel(overrideEntry?.level);
  return overrideLevel ?? fallbackLevel;
}

export function getEffectivePermissionLevel(
  userRoles: UserRole | UserRole[],
  module: string,
  overrides?: RolePermissionOverride[] | null
): PermissionLevel {
  const roles = Array.isArray(userRoles) ? userRoles : [userRoles];
  let highest = PermissionLevel.NO_ACCESS;

  for (const role of roles) {
    const candidate = resolveRolePermission(role, module, overrides);
    if (comparePermissionLevels(candidate, highest) > 0) {
      highest = candidate;
    }
  }

  return highest;
}

export const PERMISSION_MATRIX: Record<UserRole, Record<ModuleName, PermissionLevel>> = {
  [UserRole.DIRECTOR]: buildPermissions(PermissionLevel.FULL_ACCESS),

  [UserRole.DOCUMENT]: buildPermissions(PermissionLevel.NO_ACCESS, {
    candidates: PermissionLevel.FULL_ACCESS,
    crew: PermissionLevel.EDIT_ACCESS,
    applications: PermissionLevel.EDIT_ACCESS,
    ownerSubmissions: PermissionLevel.EDIT_ACCESS,
    documents: PermissionLevel.FULL_ACCESS,
    cvGenerator: PermissionLevel.FULL_ACCESS,
    expiry: PermissionLevel.FULL_ACCESS,
    contracts: PermissionLevel.EDIT_ACCESS,
    assignments: PermissionLevel.EDIT_ACCESS,
    crewing: PermissionLevel.EDIT_ACCESS,
    quality: PermissionLevel.EDIT_ACCESS,
    compliance: PermissionLevel.VIEW_ACCESS,
  }),

  [UserRole.OPERATIONAL]: buildPermissions(PermissionLevel.NO_ACCESS, {
    approvedCandidates: PermissionLevel.VIEW_ACCESS,
    candidates: PermissionLevel.VIEW_ACCESS,
    preJoining: PermissionLevel.FULL_ACCESS,
    dispatch: PermissionLevel.FULL_ACCESS,
    dispatches: PermissionLevel.FULL_ACCESS,
    visaClearance: PermissionLevel.FULL_ACCESS,
    visas: PermissionLevel.FULL_ACCESS,
    medical: PermissionLevel.EDIT_ACCESS,
    contracts: PermissionLevel.EDIT_ACCESS,
    assignments: PermissionLevel.FULL_ACCESS,
    crewing: PermissionLevel.FULL_ACCESS,
    documents: PermissionLevel.VIEW_ACCESS,
  }),

  [UserRole.ACCOUNTING]: buildPermissions(PermissionLevel.NO_ACCESS, {
    accounting: PermissionLevel.FULL_ACCESS,
    invoices: PermissionLevel.FULL_ACCESS,
    expenses: PermissionLevel.FULL_ACCESS,
    agencyFees: PermissionLevel.FULL_ACCESS,
    contracts: PermissionLevel.VIEW_ACCESS,
    documents: PermissionLevel.VIEW_ACCESS,
  }),

  [UserRole.DRIVER]: buildPermissions(PermissionLevel.NO_ACCESS, {
    myDispatch: PermissionLevel.FULL_ACCESS,
    dispatch: PermissionLevel.EDIT_ACCESS,
    dispatches: PermissionLevel.EDIT_ACCESS,
    letterGuarantee: PermissionLevel.FULL_ACCESS,
  }),

  [UserRole.PRINCIPAL]: buildPermissions(PermissionLevel.NO_ACCESS, {
    principals: PermissionLevel.FULL_ACCESS,
    candidates: PermissionLevel.VIEW_ACCESS,
    ownerSubmissions: PermissionLevel.EDIT_ACCESS,
    history: PermissionLevel.VIEW_ACCESS,
    documents: PermissionLevel.VIEW_ACCESS,
    contracts: PermissionLevel.VIEW_ACCESS,
  }),

  // Transitional legacy role compatibility for Phase 1.
  [UserRole.CDMO]: buildPermissions(PermissionLevel.NO_ACCESS, {
    ...buildPermissions(PermissionLevel.NO_ACCESS, {
      candidates: PermissionLevel.FULL_ACCESS,
      crew: PermissionLevel.EDIT_ACCESS,
      applications: PermissionLevel.EDIT_ACCESS,
      ownerSubmissions: PermissionLevel.EDIT_ACCESS,
      documents: PermissionLevel.FULL_ACCESS,
      cvGenerator: PermissionLevel.FULL_ACCESS,
      expiry: PermissionLevel.FULL_ACCESS,
      contracts: PermissionLevel.EDIT_ACCESS,
      assignments: PermissionLevel.EDIT_ACCESS,
      crewing: PermissionLevel.EDIT_ACCESS,
      quality: PermissionLevel.EDIT_ACCESS,
      compliance: PermissionLevel.VIEW_ACCESS,
    }),
  }),
  [UserRole.HR]: buildPermissions(PermissionLevel.NO_ACCESS, {
    candidates: PermissionLevel.FULL_ACCESS,
    crew: PermissionLevel.EDIT_ACCESS,
    applications: PermissionLevel.EDIT_ACCESS,
    ownerSubmissions: PermissionLevel.EDIT_ACCESS,
    documents: PermissionLevel.FULL_ACCESS,
    cvGenerator: PermissionLevel.FULL_ACCESS,
    expiry: PermissionLevel.FULL_ACCESS,
    contracts: PermissionLevel.EDIT_ACCESS,
    assignments: PermissionLevel.EDIT_ACCESS,
    crewing: PermissionLevel.EDIT_ACCESS,
    quality: PermissionLevel.EDIT_ACCESS,
    compliance: PermissionLevel.VIEW_ACCESS,
  }),
  [UserRole.HR_ADMIN]: buildPermissions(PermissionLevel.NO_ACCESS, {
    candidates: PermissionLevel.FULL_ACCESS,
    crew: PermissionLevel.EDIT_ACCESS,
    applications: PermissionLevel.EDIT_ACCESS,
    ownerSubmissions: PermissionLevel.EDIT_ACCESS,
    documents: PermissionLevel.FULL_ACCESS,
    cvGenerator: PermissionLevel.FULL_ACCESS,
    expiry: PermissionLevel.FULL_ACCESS,
    contracts: PermissionLevel.EDIT_ACCESS,
    assignments: PermissionLevel.EDIT_ACCESS,
    crewing: PermissionLevel.EDIT_ACCESS,
    quality: PermissionLevel.EDIT_ACCESS,
    compliance: PermissionLevel.VIEW_ACCESS,
  }),
  [UserRole.QMR]: buildPermissions(PermissionLevel.NO_ACCESS, {
    candidates: PermissionLevel.FULL_ACCESS,
    crew: PermissionLevel.EDIT_ACCESS,
    applications: PermissionLevel.EDIT_ACCESS,
    ownerSubmissions: PermissionLevel.EDIT_ACCESS,
    documents: PermissionLevel.FULL_ACCESS,
    cvGenerator: PermissionLevel.FULL_ACCESS,
    expiry: PermissionLevel.FULL_ACCESS,
    contracts: PermissionLevel.EDIT_ACCESS,
    assignments: PermissionLevel.EDIT_ACCESS,
    crewing: PermissionLevel.EDIT_ACCESS,
    quality: PermissionLevel.EDIT_ACCESS,
    compliance: PermissionLevel.VIEW_ACCESS,
  }),
  [UserRole.SECTION_HEAD]: buildPermissions(PermissionLevel.NO_ACCESS, {
    candidates: PermissionLevel.FULL_ACCESS,
    crew: PermissionLevel.EDIT_ACCESS,
    applications: PermissionLevel.EDIT_ACCESS,
    ownerSubmissions: PermissionLevel.EDIT_ACCESS,
    documents: PermissionLevel.FULL_ACCESS,
    cvGenerator: PermissionLevel.FULL_ACCESS,
    expiry: PermissionLevel.FULL_ACCESS,
    contracts: PermissionLevel.EDIT_ACCESS,
    assignments: PermissionLevel.EDIT_ACCESS,
    crewing: PermissionLevel.EDIT_ACCESS,
    quality: PermissionLevel.EDIT_ACCESS,
    compliance: PermissionLevel.VIEW_ACCESS,
  }),
  [UserRole.STAFF]: buildPermissions(PermissionLevel.NO_ACCESS, {
    candidates: PermissionLevel.FULL_ACCESS,
    crew: PermissionLevel.EDIT_ACCESS,
    applications: PermissionLevel.EDIT_ACCESS,
    ownerSubmissions: PermissionLevel.EDIT_ACCESS,
    documents: PermissionLevel.FULL_ACCESS,
    cvGenerator: PermissionLevel.FULL_ACCESS,
    expiry: PermissionLevel.FULL_ACCESS,
    contracts: PermissionLevel.EDIT_ACCESS,
    assignments: PermissionLevel.EDIT_ACCESS,
    crewing: PermissionLevel.EDIT_ACCESS,
    quality: PermissionLevel.EDIT_ACCESS,
    compliance: PermissionLevel.VIEW_ACCESS,
  }),

  // Preserve current crew/mobile behavior when no explicit DRIVER signal exists.
  [UserRole.CREW]: buildPermissions(PermissionLevel.NO_ACCESS, {
    documents: PermissionLevel.VIEW_ACCESS,
    crew: PermissionLevel.VIEW_ACCESS,
    pkl: PermissionLevel.VIEW_ACCESS,
  }),
  [UserRole.CREW_PORTAL]: buildPermissions(PermissionLevel.NO_ACCESS, {
    documents: PermissionLevel.VIEW_ACCESS,
    crew: PermissionLevel.VIEW_ACCESS,
    pkl: PermissionLevel.VIEW_ACCESS,
  }),
};

export const SENSITIVITY_ACCESS_MATRIX: Record<UserRole, Record<DataSensitivity, boolean>> = {
  [UserRole.DIRECTOR]: { RED: true, AMBER: true, GREEN: true },
  [UserRole.DOCUMENT]: { RED: true, AMBER: true, GREEN: true },
  [UserRole.OPERATIONAL]: { RED: false, AMBER: true, GREEN: true },
  [UserRole.ACCOUNTING]: { RED: false, AMBER: true, GREEN: true },
  [UserRole.DRIVER]: { RED: false, AMBER: true, GREEN: true },
  [UserRole.PRINCIPAL]: { RED: false, AMBER: true, GREEN: true },
  [UserRole.CDMO]: { RED: true, AMBER: true, GREEN: true },
  [UserRole.HR]: { RED: true, AMBER: true, GREEN: true },
  [UserRole.HR_ADMIN]: { RED: true, AMBER: true, GREEN: true },
  [UserRole.QMR]: { RED: true, AMBER: true, GREEN: true },
  [UserRole.SECTION_HEAD]: { RED: false, AMBER: true, GREEN: true },
  [UserRole.STAFF]: { RED: false, AMBER: true, GREEN: true },
  [UserRole.CREW]: { RED: true, AMBER: true, GREEN: true },
  [UserRole.CREW_PORTAL]: { RED: true, AMBER: true, GREEN: true },
};

export function hasPermission(
  userRoles: UserRole | UserRole[],
  module: string,
  requiredLevel: PermissionLevel,
  overrides?: RolePermissionOverride[] | null
): boolean {
  const effectiveLevel = getEffectivePermissionLevel(userRoles, module, overrides);
  return comparePermissionLevels(effectiveLevel, requiredLevel) >= 0;
}

export function hasSensitivityAccess(
  userRoles: UserRole | UserRole[],
  sensitivity: DataSensitivity
): boolean {
  const roles = Array.isArray(userRoles) ? userRoles : [userRoles];
  return roles.some((role) => SENSITIVITY_ACCESS_MATRIX[role]?.[sensitivity] ?? false);
}

export function canAccessData(
  userRole: UserRole,
  module: ModuleName,
  sensitivity: DataSensitivity,
  requiredLevel: PermissionLevel = PermissionLevel.VIEW_ACCESS,
  overrides?: RolePermissionOverride[] | null
): boolean {
  if (!hasPermission(userRole, module, requiredLevel, overrides)) {
    return false;
  }

  if (!hasSensitivityAccess(userRole, sensitivity)) {
    return false;
  }

  return true;
}

export function validateCrewPortalAccess(
  userRole: UserRole,
  requestedUserId?: string,
  sessionUserId?: string
): boolean {
  if (userRole === UserRole.CREW_PORTAL || userRole === UserRole.CREW) {
    return requestedUserId === sessionUserId;
  }
  return true;
}

export function getAccessibleModules(
  userRole: UserRole,
  overrides?: RolePermissionOverride[] | null
): ModuleName[] {
  const modules: ModuleName[] = [];
  const permissions = PERMISSION_MATRIX[userRole];

  for (const moduleKey of Object.keys(permissions) as ModuleName[]) {
    const effective = getEffectivePermissionLevel(userRole, moduleKey, overrides);
    if (effective !== PermissionLevel.NO_ACCESS) {
      modules.push(moduleKey);
    }
  }

  return modules;
}

export function getModulePermission(
  userRole: UserRole,
  module: ModuleName,
  overrides?: RolePermissionOverride[] | null
): PermissionLevel {
  return getEffectivePermissionLevel(userRole, module, overrides);
}
