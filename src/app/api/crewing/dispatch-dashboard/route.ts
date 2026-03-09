import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/authz";
import { buildDispatchDashboard } from "@/lib/dispatch-dashboard";

export async function GET() {
  const auth = await requireUserApi(["DIRECTOR", "OPERATIONAL"]);
  if (!auth.ok) {
    const statusCode = "status" in auth ? auth.status : 401;
    return NextResponse.json({ error: "Unauthorized" }, { status: statusCode });
  }

  try {
    const data = await buildDispatchDashboard();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error building dispatch dashboard:", error);
    return NextResponse.json(
      { error: "Failed to build dispatch dashboard" },
      { status: 500 }
    );
  }
}

