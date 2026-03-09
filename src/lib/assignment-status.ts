export const ACTIVE_ASSIGNMENT_STATUSES = [
  "ACTIVE",
  "ONBOARD",
  "ASSIGNED",
] as const;

const ACTIVE_ASSIGNMENT_STATUS_SET = new Set<string>(ACTIVE_ASSIGNMENT_STATUSES);

export function isActiveAssignmentStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return ACTIVE_ASSIGNMENT_STATUS_SET.has(status.trim().toUpperCase());
}
