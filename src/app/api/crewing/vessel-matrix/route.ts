import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/authz";
import { buildVesselMatrix } from "@/lib/vessel-matrix";

export async function GET() {
  const auth = await requireUserApi(["DIRECTOR", "OPERATIONAL"]);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const data = await buildVesselMatrix();

    return NextResponse.json({
      data,
      meta: {
        totalVessels: data.length,
        configuredVessels: data.filter((item) => item.requirementsConfigured).length,
        unconfiguredVessels: data.filter((item) => !item.requirementsConfigured).length,
      },
    });
  } catch (error) {
    console.error("Error building vessel matrix:", error);
    return NextResponse.json({ error: "Failed to build vessel matrix" }, { status: 500 });
  }
}
