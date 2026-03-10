import { NextRequest, NextResponse } from "next/server";
import {
  isPrincipalPortalAccessDenied,
  requirePrincipalPortalAccess,
} from "@/lib/principal-portal/auth";
import { listPrincipalJoining } from "@/lib/principal-portal/queries";
import { serializePrincipalJoining } from "@/lib/principal-portal/serializers";

export async function GET(request: NextRequest) {
  const access = await requirePrincipalPortalAccess();
  if (isPrincipalPortalAccessDenied(access)) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const vesselId = searchParams.get("vesselId");

  const rows = await listPrincipalJoining({
    principalId: access.principalId,
    status,
    vesselId,
  });

  return NextResponse.json({
    data: rows.map(serializePrincipalJoining),
    total: rows.length,
  });
}
