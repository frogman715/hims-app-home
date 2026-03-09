import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, PermissionLevel } from "@/lib/permission-middleware";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!checkPermission(session, "contracts", PermissionLevel.VIEW_ACCESS)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { id } = await params;

    const contract = await prisma.employmentContract.findUnique({
      where: { id },
      select: {
        id: true,
        contractNumber: true,
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const history = await prisma.auditLog.findMany({
      where: {
        entityType: "EMPLOYMENT_CONTRACT",
        entityId: id,
      },
      orderBy: { createdAt: "desc" },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      contract: {
        id: contract.id,
        contractNumber: contract.contractNumber,
      },
      history,
    });
  } catch (error) {
    console.error("Error fetching contract history:", error);
    return NextResponse.json({ error: "Failed to fetch contract history" }, { status: 500 });
  }
}
