import { NextRequest, NextResponse } from "next/server";
import { requireUserApi } from "@/lib/authz";
import { buildVesselMatrix } from "@/lib/vessel-matrix";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ vesselId: string }> }
) {
  const auth = await requireUserApi(["DIRECTOR", "OPERATIONAL"]);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { vesselId } = await context.params;
    const data = await buildVesselMatrix({ vesselId });

    if (data.length === 0) {
      return NextResponse.json({ error: "Vessel not found" }, { status: 404 });
    }

    const vessel = data[0];

    if (!vessel.requirementsConfigured) {
      return NextResponse.json(
        {
          error: "Vessel requirements are not configured.",
          code: "REQUIREMENTS_NOT_CONFIGURED",
          vessel,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ data: vessel });
  } catch (error) {
    console.error("Error building vessel matrix detail:", error);
    return NextResponse.json({ error: "Failed to build vessel matrix detail" }, { status: 500 });
  }
}
