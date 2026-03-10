import { NextResponse } from "next/server";
import {
  isPrincipalPortalAccessDenied,
  requirePrincipalPortalAccess,
} from "@/lib/principal-portal/auth";
import { listPrincipalCrewOptions } from "@/lib/principal-portal/queries";

export async function GET(
  _request: Request,
  context: { params: Promise<{ vesselId: string }> }
) {
  const access = await requirePrincipalPortalAccess();
  if (isPrincipalPortalAccessDenied(access)) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const { vesselId } = await context.params;
  const crew = await listPrincipalCrewOptions({
    principalId: access.principalId,
    vesselId,
  });

  return NextResponse.json({
    data: crew,
    total: crew.length,
  });
}
