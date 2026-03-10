import { NextResponse } from "next/server";
import {
  isPrincipalPortalAccessDenied,
  requirePrincipalPortalAccess,
} from "@/lib/principal-portal/auth";
import { listPrincipalVessels } from "@/lib/principal-portal/queries";
import { serializePrincipalVessel } from "@/lib/principal-portal/serializers";

export async function GET() {
  const access = await requirePrincipalPortalAccess();
  if (isPrincipalPortalAccessDenied(access)) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const vessels = await listPrincipalVessels(access.principalId);

  return NextResponse.json({
    data: vessels.map(serializePrincipalVessel),
    total: vessels.length,
  });
}
