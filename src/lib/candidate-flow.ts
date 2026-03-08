/**
 * Phase 2 (minimal): HGI candidate flow policy on top of existing status model.
 *
 * Business mapping in this phase:
 * - RECEIVED -> REVIEWING : DOCUMENT submits to DIRECTOR
 * - REVIEWING -> PASSED   : DIRECTOR approves
 * - REVIEWING -> REJECTED : DIRECTOR rejects
 * - PASSED -> OFFERED     : DIRECTOR sends approved candidate to PRINCIPAL (principalId required)
 */

export const HGI_DOCUMENT_ROLES = ["DOCUMENT"] as const;
export const HGI_DIRECTOR_ROLES = ["DIRECTOR"] as const;

export const HGI_FLOW_TRANSITIONS = {
  submit_to_director: { from: "RECEIVED", to: "REVIEWING" },
  director_approve: { from: "REVIEWING", to: "PASSED" },
  director_reject: { from: "REVIEWING", to: "REJECTED" },
  send_to_principal: { from: "PASSED", to: "OFFERED" },
} as const;

export function hasAnyRole(userRoles: string[] | undefined, requiredRoles: readonly string[]): boolean {
  if (!Array.isArray(userRoles) || userRoles.length === 0) return false;
  const roleSet = new Set(userRoles.map((role) => role.toUpperCase()));
  return requiredRoles.some((role) => roleSet.has(role));
}

export function isHgiFlowTransition(fromStatus: string, toStatus: string): boolean {
  const from = fromStatus.toUpperCase();
  const to = toStatus.toUpperCase();

  return Object.values(HGI_FLOW_TRANSITIONS).some(
    (transition) => transition.from === from && transition.to === to
  );
}

export function validateHgiFlowTransition(input: {
  userRoles: string[];
  fromStatus: string;
  toStatus: string;
  principalId?: string | null;
}): { allowed: boolean; reason?: string } {
  const from = input.fromStatus.toUpperCase();
  const to = input.toStatus.toUpperCase();

  if (from === HGI_FLOW_TRANSITIONS.submit_to_director.from && to === HGI_FLOW_TRANSITIONS.submit_to_director.to) {
    if (!hasAnyRole(input.userRoles, HGI_DOCUMENT_ROLES)) {
      return { allowed: false, reason: "Only DOCUMENT can submit candidate to DIRECTOR." };
    }
    return { allowed: true };
  }

  if (from === HGI_FLOW_TRANSITIONS.director_approve.from && to === HGI_FLOW_TRANSITIONS.director_approve.to) {
    if (!hasAnyRole(input.userRoles, HGI_DIRECTOR_ROLES)) {
      return { allowed: false, reason: "Only DIRECTOR can approve candidates." };
    }
    return { allowed: true };
  }

  if (from === HGI_FLOW_TRANSITIONS.director_reject.from && to === HGI_FLOW_TRANSITIONS.director_reject.to) {
    if (!hasAnyRole(input.userRoles, HGI_DIRECTOR_ROLES)) {
      return { allowed: false, reason: "Only DIRECTOR can reject candidates." };
    }
    return { allowed: true };
  }

  if (from === HGI_FLOW_TRANSITIONS.send_to_principal.from && to === HGI_FLOW_TRANSITIONS.send_to_principal.to) {
    if (!hasAnyRole(input.userRoles, HGI_DIRECTOR_ROLES)) {
      return { allowed: false, reason: "Only DIRECTOR can send approved candidates to PRINCIPAL." };
    }

    if (!input.principalId || input.principalId.trim().length === 0) {
      return { allowed: false, reason: "principalId is required before sending candidate to PRINCIPAL." };
    }

    return { allowed: true };
  }

  return { allowed: false, reason: "Transition is not part of the HGI candidate flow." };
}
