/**
 * Phase 5 temporary driver-dispatch assignment scope.
 *
 * Source of truth is explicit config only (fail-closed):
 * HGI_DRIVER_DISPATCH_SCOPE_MAP="userIdOrEmail:dispatchId1|dispatchId2,userIdOrEmail2:dispatchId3"
 */

export type DriverDispatchScopeContext = {
  userId?: string | null;
  email?: string | null;
};

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function parseDispatchIds(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseScopeMap(raw: string | undefined): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (!raw) return map;

  for (const pair of raw.split(",")) {
    const [rawKey, rawDispatchIds] = pair.split(":");
    const key = normalize(rawKey);
    const dispatchIds = parseDispatchIds(rawDispatchIds);

    if (!key || dispatchIds.length === 0) continue;
    map.set(key, dispatchIds);
  }

  return map;
}

export function resolveDriverDispatchIds(context: DriverDispatchScopeContext): string[] {
  const scopeMap = parseScopeMap(process.env.HGI_DRIVER_DISPATCH_SCOPE_MAP);
  if (scopeMap.size === 0) return [];

  const byUserId = normalize(context.userId);
  if (byUserId && scopeMap.has(byUserId)) {
    return scopeMap.get(byUserId) ?? [];
  }

  const byEmail = normalize(context.email);
  if (byEmail && scopeMap.has(byEmail)) {
    return scopeMap.get(byEmail) ?? [];
  }

  return [];
}

export function hasDriverDispatchScope(context: DriverDispatchScopeContext): boolean {
  return resolveDriverDispatchIds(context).length > 0;
}
