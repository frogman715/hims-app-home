import { NextRequest, NextResponse } from "next/server";
import {
  isPrincipalPortalAccessDenied,
  requirePrincipalPortalAccess,
} from "@/lib/principal-portal/auth";
import { listPrincipalDispatches } from "@/lib/principal-portal/queries";
import { serializePrincipalDispatch } from "@/lib/principal-portal/serializers";

export async function GET(request: NextRequest) {
  const access = await requirePrincipalPortalAccess();
  if (isPrincipalPortalAccessDenied(access)) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const vesselId = searchParams.get("vesselId");
  const status = searchParams.get("status");

  const rows = await listPrincipalDispatches({
    principalId: access.principalId,
    vesselId,
    status,
  });

  return NextResponse.json({
    data: rows.map(serializePrincipalDispatch),
    total: rows.length,
  });
}
