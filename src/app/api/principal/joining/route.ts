import { NextRequest, NextResponse } from "next/server";
import {
  isPrincipalPortalAccessDenied,
  requirePrincipalPortalAccess,
} from "@/lib/principal-portal/auth";
import { listPrincipalJoining } from "@/lib/principal-portal/queries";
import { serializePrincipalJoining } from "@/lib/principal-portal/serializers";
import type { PrepareJoiningStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  const access = await requirePrincipalPortalAccess();
  if (isPrincipalPortalAccessDenied(access)) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const vesselId = searchParams.get("vesselId");
  const status: PrepareJoiningStatus | null =
    statusParam && statusParam !== "ALL"
      ? (statusParam as PrepareJoiningStatus)
      : null;

  const rows = await listPrincipalJoining({
    principalId: access.principalId,
    status,
    vesselId,
  });

  return NextResponse.json({
    data: rows.map((item) =>
      serializePrincipalJoining(item as Parameters<typeof serializePrincipalJoining>[0])
    ),
    total: rows.length,
  });
}
