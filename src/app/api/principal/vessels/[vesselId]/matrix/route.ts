import { NextResponse } from "next/server";
import {
  isPrincipalPortalAccessDenied,
  requirePrincipalPortalAccess,
} from "@/lib/principal-portal/auth";
import { getPrincipalVesselMatrix } from "@/lib/principal-portal/queries";
import { serializePrincipalVesselMatrix } from "@/lib/principal-portal/serializers";

export async function GET(
  _request: Request,
  context: { params: Promise<{ vesselId: string }> }
) {
  const access = await requirePrincipalPortalAccess();
  if (isPrincipalPortalAccessDenied(access)) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const { vesselId } = await context.params;
  const vessel = await getPrincipalVesselMatrix({
    principalId: access.principalId,
    vesselId,
  });

  if (!vessel) {
    return NextResponse.json({ error: "Vessel not found" }, { status: 404 });
  }

  if (!vessel.requirementsConfigured) {
    return NextResponse.json(
      {
        error: "Vessel requirements are not configured.",
        code: "REQUIREMENTS_NOT_CONFIGURED",
        vessel: serializePrincipalVesselMatrix(vessel),
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    data: serializePrincipalVesselMatrix(vessel),
  });
}
