import { NextRequest, NextResponse } from "next/server";
import {
  isPrincipalPortalAccessDenied,
  requirePrincipalPortalAccess,
} from "@/lib/principal-portal/auth";
import {
  createPrincipalReplacement,
  listPrincipalReplacements,
} from "@/lib/principal-portal/queries";
import { serializePrincipalReplacement } from "@/lib/principal-portal/serializers";

type CreateReplacementPayload = {
  crewId?: string;
  replacementCrewId?: string | null;
  reason?: string;
};

export async function GET() {
  const access = await requirePrincipalPortalAccess();
  if (isPrincipalPortalAccessDenied(access)) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const rows = await listPrincipalReplacements(access.principalId);

  return NextResponse.json({
    data: rows.map(serializePrincipalReplacement),
    total: rows.length,
  });
}

export async function POST(request: NextRequest) {
  const access = await requirePrincipalPortalAccess();
  if (isPrincipalPortalAccessDenied(access)) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const body = (await request.json()) as CreateReplacementPayload;
  if (!body.crewId || !body.reason) {
    return NextResponse.json({ error: "crewId and reason are required" }, { status: 400 });
  }

  try {
    const created = await createPrincipalReplacement({
      principalId: access.principalId,
      requestedBy: access.userId,
      crewId: body.crewId,
      replacementCrewId: body.replacementCrewId ?? null,
      reason: body.reason,
    });

    return NextResponse.json(
      {
        data: serializePrincipalReplacement(created),
        message: "Replacement request submitted",
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit replacement request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
