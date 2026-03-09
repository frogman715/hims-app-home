import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, PermissionLevel } from "@/lib/permission-middleware";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!checkPermission(session, "contracts", PermissionLevel.VIEW_ACCESS)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const crewId = searchParams.get("crewId");

    if (!crewId) {
      return NextResponse.json({ error: "crewId is required" }, { status: 400 });
    }

    const contracts = await prisma.employmentContract.findMany({
      where: { crewId },
      orderBy: { contractStart: "desc" },
      include: {
        crew: {
          select: {
            id: true,
            fullName: true,
            rank: true,
          },
        },
        vessel: {
          select: {
            id: true,
            name: true,
          },
        },
        principal: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const now = new Date();

    const activeContracts = contracts.filter(
      (contract) => contract.status === "ACTIVE" && new Date(contract.contractEnd) >= now
    );

    const pastContracts = contracts.filter(
      (contract) => !(contract.status === "ACTIVE" && new Date(contract.contractEnd) >= now)
    );

    return NextResponse.json({
      crewId,
      activeContracts,
      pastContracts,
      timeline: contracts,
    });
  } catch (error) {
    console.error("Error fetching contract timeline:", error);
    return NextResponse.json({ error: "Failed to fetch contract timeline" }, { status: 500 });
  }
}
