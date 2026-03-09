import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/authz";
import { buildRotationBoard } from "@/lib/rotation-planning";

export async function GET() {
  const auth = await requireUserApi(["DIRECTOR", "OPERATIONAL"]);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const data = await buildRotationBoard();
    const withDemand = data.filter((item) => item.summary.totalNeedCount > 0).length;

    return NextResponse.json({
      data,
      meta: {
        totalVessels: data.length,
        vesselsWithDemand: withDemand,
      },
    });
  } catch (error) {
    console.error("Error building rotation board:", error);
    return NextResponse.json({ error: "Failed to build rotation board" }, { status: 500 });
  }
}

