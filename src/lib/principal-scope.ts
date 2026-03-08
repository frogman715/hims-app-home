/**
 * Principal row-scope resolution.
 *
 * Server-side only: principalId must never come from client input.
 *
 * Env format:
 * HGI_PRINCIPAL_SCOPE_MAP="userIdOrEmail:principalId,userIdOrEmail2:principalId2"
 */

export type PrincipalScopeContext = {
  userId?: string | null;
  email?: string | null;
};

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function parseScopeMap(raw: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!raw) return map;

  for (const pair of raw.split(",")) {
    const [rawKey, rawPrincipalId] = pair.split(":");
    const key = normalize(rawKey);
    const principalId = (rawPrincipalId ?? "").trim();

    if (!key || !principalId) continue;
    map.set(key, principalId);
  }

  return map;
}

export function resolvePrincipalScopeId(context: PrincipalScopeContext): string | null {
  const scopeMap = parseScopeMap(process.env.HGI_PRINCIPAL_SCOPE_MAP);
  if (scopeMap.size === 0) return null;

  const byUserId = normalize(context.userId);
  if (byUserId && scopeMap.has(byUserId)) {
    return scopeMap.get(byUserId) ?? null;
  }

  const byEmail = normalize(context.email);
  if (byEmail && scopeMap.has(byEmail)) {
    return scopeMap.get(byEmail) ?? null;
  }

  return null;
}
