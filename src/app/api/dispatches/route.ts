import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkPermission, PermissionLevel } from "@/lib/permission-middleware";
import { normalizeToUserRoles } from "@/lib/type-guards";
import { UserRole } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check dispatches permission
    if (!checkPermission(session, 'dispatches', PermissionLevel.VIEW_ACCESS)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const userRoles = normalizeToUserRoles(session.user.roles);
    if (userRoles.includes(UserRole.DRIVER)) {
      // TODO(Phase 2/3): Replace this deny-by-default with assignment-scoped filtering
      // once dispatch assignment linkage is finalized (e.g., driverId/assignedToId).
      // Driver must only see tasks explicitly assigned to them.
      return NextResponse.json(
        { error: "Driver dispatch list requires assignment-scoped filtering (pending Phase 2)." },
        { status: 403 }
      );
    }

    const dispatches = await prisma.dispatch.findMany({
      include: {
        crew: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(dispatches);
  } catch (error) {
    console.error("Error fetching dispatches:", error);
    return NextResponse.json(
      { error: "Failed to fetch dispatches" },
      { status: 500 }
    );
  }
}
