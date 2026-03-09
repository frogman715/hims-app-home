import { NextRequest, NextResponse } from "next/server";
import { requireUserApi } from "@/lib/authz";
import { buildRotationBoard } from "@/lib/rotation-planning";

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
    const data = await buildRotationBoard({ vesselId });

    if (data.length === 0) {
      return NextResponse.json({ error: "Vessel not found" }, { status: 404 });
    }

    return NextResponse.json({ data: data[0] });
  } catch (error) {
    console.error("Error building rotation board detail:", error);
    return NextResponse.json({ error: "Failed to build rotation board detail" }, { status: 500 });
  }
}

