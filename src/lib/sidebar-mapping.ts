import { ModuleName, PermissionLevel } from "@/lib/permissions";
import { resolveAuthRoles } from "@/lib/role-compat";

export type SidebarRole = "DIRECTOR" | "DOCUMENT" | "OPERATIONAL" | "ACCOUNTING" | "DRIVER" | "PRINCIPAL";
export type SidebarItemKey =
  | "dashboard"
  | "candidates"
  | "documents"
  | "ownerSubmissions"
  | "operational"
  | "accounting"
  | "admin"
  | "cvGenerator"
  | "expiry"
  | "approvedCandidates"
  | "preJoining"
  | "dispatch"
  | "visaClearance"
  | "invoices"
  | "expenses"
  | "myDispatch"
  | "letterGuarantee"
  | "dispatchCheckinStatus"
  | "myCandidates"
  | "history";

export type SidebarItemConfig = {
  href: string;
  label: string;
  icon: string;
  group: string;
  module?: ModuleName;
  requiredLevel?: PermissionLevel;
};

export const SIDEBAR_ITEMS: Record<SidebarItemKey, SidebarItemConfig> = {
  dashboard: {
    href: "/dashboard",
    label: "Dashboard",
    icon: "📊",
    group: "MAIN",
    module: ModuleName.dashboard,
    requiredLevel: PermissionLevel.VIEW_ACCESS,
  },
  candidates: {
    href: "/crewing/seafarers",
    label: "Candidates",
    icon: "👤",
    group: "CANDIDATES",
    module: ModuleName.candidates,
    requiredLevel: PermissionLevel.VIEW_ACCESS,
  },
  documents: {
    href: "/crewing/documents",
    label: "Documents",
    icon: "📁",
    group: "CANDIDATES",
    module: ModuleName.documents,
    requiredLevel: PermissionLevel.VIEW_ACCESS,
  },
  ownerSubmissions: {
    href: "/crewing/principals",
    label: "Owner Submissions",
    icon: "📤",
    group: "CANDIDATES",
    module: ModuleName.ownerSubmissions,
    requiredLevel: PermissionLevel.VIEW_ACCESS,
  },
  operational: {
    href: "/crewing/workflow",
    label: "Operational",
    icon: "⚙️",
    group: "OPERATIONS",
    module: ModuleName.crewing,
    requiredLevel: PermissionLevel.VIEW_ACCESS,
  },
  accounting: {
    href: "/accounting",
    label: "Accounting",
    icon: "💵",
    group: "FINANCE",
    module: ModuleName.accounting,
    requiredLevel: PermissionLevel.VIEW_ACCESS,
  },
  admin: {
    href: "/admin/users",
    label: "Admin",
    icon: "🔐",
    group: "SYSTEM",
    module: ModuleName.admin,
    requiredLevel: PermissionLevel.FULL_ACCESS,
  },
  cvGenerator: {
    href: "/crewing/form-reference",
    label: "CV Generator",
    icon: "🧾",
    group: "DOCUMENT",
    module: ModuleName.cvGenerator,
    requiredLevel: PermissionLevel.VIEW_ACCESS,
  },
  expiry: {
    href: "/crewing/documents",
    label: "Expiry",
    icon: "⏳",
    group: "DOCUMENT",
    module: ModuleName.expiry,
    requiredLevel: PermissionLevel.VIEW_ACCESS,
  },
  approvedCandidates: {
    href: "/crewing/applications",
    label: "Approved Candidates",
    icon: "✅",
    group: "OPERATIONS",
    module: ModuleName.approvedCandidates,
    requiredLevel: PermissionLevel.VIEW_ACCESS,
  },
  preJoining: {
    href: "/crewing/prepare-joining",
    label: "Pre-Joining",
    icon: "🧭",
    group: "OPERATIONS",
    module: ModuleName.preJoining,
    requiredLevel: PermissionLevel.VIEW_ACCESS,
  },
  dispatch: {
    href: "/crewing/sign-off",
    label: "Dispatch",
    icon: "🚚",
    group: "OPERATIONS",
    module: ModuleName.dispatch,
    requiredLevel: PermissionLevel.VIEW_ACCESS,
  },
  visaClearance: {
    href: "/compliance/external",
    label: "Visa/Clearance",
    icon: "🛂",
    group: "OPERATIONS",
    module: ModuleName.visaClearance,
    requiredLevel: PermissionLevel.VIEW_ACCESS,
  },
  invoices: {
    href: "/accounting/billing",
    label: "Invoices",
    icon: "🧾",
    group: "FINANCE",
    module: ModuleName.invoices,
    requiredLevel: PermissionLevel.VIEW_ACCESS,
  },
  expenses: {
    href: "/accounting/office-expense",
    label: "Expenses",
    icon: "💳",
    group: "FINANCE",
    module: ModuleName.expenses,
    requiredLevel: PermissionLevel.VIEW_ACCESS,
  },
  myDispatch: {
    href: "/m/crew",
    label: "My Dispatch",
    icon: "🛻",
    group: "DRIVER",
    module: ModuleName.myDispatch,
    requiredLevel: PermissionLevel.VIEW_ACCESS,
  },
  letterGuarantee: {
    href: "/m/crew/upload",
    label: "Letter Guarantee",
    icon: "📄",
    group: "DRIVER",
    module: ModuleName.letterGuarantee,
    requiredLevel: PermissionLevel.VIEW_ACCESS,
  },
  dispatchCheckinStatus: {
    href: "/crewing/sign-off",
    label: "Dispatch / Check-in Status",
    icon: "🛫",
    group: "DRIVER",
    module: ModuleName.dispatch,
    requiredLevel: PermissionLevel.VIEW_ACCESS,
  },
  myCandidates: {
    href: "/principal/my-candidates",
    label: "My Candidates",
    icon: "👥",
    group: "PRINCIPAL",
    module: ModuleName.candidates,
    requiredLevel: PermissionLevel.VIEW_ACCESS,
  },
  history: {
    href: "/principal/history",
    label: "History",
    icon: "🕘",
    group: "PRINCIPAL",
    module: ModuleName.history,
    requiredLevel: PermissionLevel.VIEW_ACCESS,
  },
};

export const SIDEBAR_BY_ROLE: Record<SidebarRole, SidebarItemKey[]> = {
  DIRECTOR: ["dashboard", "candidates", "documents", "ownerSubmissions", "operational", "accounting", "admin"],
  DOCUMENT: ["candidates", "documents", "cvGenerator", "expiry"],
  OPERATIONAL: ["approvedCandidates", "preJoining", "dispatch", "visaClearance"],
  ACCOUNTING: ["accounting", "invoices", "expenses"],
  DRIVER: ["myDispatch", "letterGuarantee", "dispatchCheckinStatus"],
  PRINCIPAL: ["myCandidates", "history"],
};

const ROLE_ORDER: SidebarRole[] = ["DIRECTOR", "DOCUMENT", "OPERATIONAL", "ACCOUNTING", "DRIVER", "PRINCIPAL"];

export function getSidebarItemsForRoles(inputRoles: string[] | undefined): SidebarItemConfig[] {
  const roles = resolveAuthRoles({ rawRoles: inputRoles ?? [] }).filter((role): role is SidebarRole =>
    ROLE_ORDER.includes(role as SidebarRole)
  );

  if (roles.length === 0) {
    return [SIDEBAR_ITEMS.dashboard];
  }

  const keys = new Set<SidebarItemKey>();
  for (const role of ROLE_ORDER) {
    if (!roles.includes(role)) continue;
    for (const key of SIDEBAR_BY_ROLE[role]) {
      keys.add(key);
    }
  }

  return Array.from(keys).map((key) => SIDEBAR_ITEMS[key]);
}
