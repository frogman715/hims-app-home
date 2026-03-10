import { requireUserApi } from "@/lib/authz";
import { resolvePrincipalScopeId } from "@/lib/principal-scope";

type PrincipalPortalAccessDenied = {
  ok: false;
  status: number;
  message: string;
};

type PrincipalPortalAccessGranted = {
  ok: true;
  principalId: string;
  userId: string;
};

export type PrincipalPortalAccessResult =
  | PrincipalPortalAccessDenied
  | PrincipalPortalAccessGranted;

export function isPrincipalPortalAccessDenied(
  value: PrincipalPortalAccessResult
): value is PrincipalPortalAccessDenied {
  return value.ok === false;
}

export async function requirePrincipalPortalAccess(): Promise<PrincipalPortalAccessResult> {
  const auth = await requireUserApi(["PRINCIPAL"]);
  if (!auth.ok) {
    const denied = auth as PrincipalPortalAccessDenied;
    return {
      ok: false,
      status: denied.status,
      message: denied.message,
    };
  }

  const principalId = resolvePrincipalScopeId({
    userId: auth.user.id,
    email: auth.session.user.email,
  });

  if (!principalId) {
    return { ok: false as const, status: 403, message: "Principal scope is not configured" };
  }

  return {
    ok: true as const,
    principalId,
    userId: auth.user.id,
  };
}
