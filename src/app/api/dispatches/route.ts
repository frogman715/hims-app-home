import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkPermission, PermissionLevel } from "@/lib/permission-middleware";
import { normalizeToUserRoles } from "@/lib/type-guards";
import { UserRole } from "@/lib/permissions";
import {
  canCreateDispatchFromPrepareJoining,
  canMutateOperationalWorkflow,
} from "@/lib/operational-flow";

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

type CreateDispatchPayload = {
  crewId?: string;
  vesselId?: string | null;
  dispatchDate?: string;
  port?: string;
  flightNumber?: string | null;
  remarks?: string | null;
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!checkPermission(session, "dispatches", PermissionLevel.EDIT_ACCESS)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    if (!canMutateOperationalWorkflow(session.user?.roles)) {
      return NextResponse.json(
        { error: "Only OPERATIONAL or DIRECTOR can mutate operational workflow." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as CreateDispatchPayload;
    if (!body.crewId || !body.dispatchDate || !body.port) {
      return NextResponse.json(
        { error: "crewId, dispatchDate, and port are required." },
        { status: 400 }
      );
    }

    const dispatchDate = new Date(body.dispatchDate);
    if (Number.isNaN(dispatchDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid dispatchDate." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const prepareJoining = await tx.prepareJoining.findFirst({
        where: {
          crewId: body.crewId,
          status: "READY",
        },
        select: {
          id: true,
          status: true,
          passportValid: true,
          seamanBookValid: true,
          certificatesValid: true,
          medicalValid: true,
          mcuCompleted: true,
          orientationCompleted: true,
          orientationDate: true,
          visaValid: true,
          ticketBooked: true,
          transportArranged: true,
          vesselContractSigned: true,
          preDepartureFinalCheck: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      if (!prepareJoining) {
        throw new Error("READY prepare joining record not found for this crew.");
      }

      const dispatchGate = canCreateDispatchFromPrepareJoining(prepareJoining);
      if (!dispatchGate.allowed) {
        throw new Error(dispatchGate.reason ?? "Prepare joining record is not eligible for dispatch.");
      }

      const dispatch = await tx.dispatch.create({
        data: {
          crewId: body.crewId,
          vesselId: body.vesselId ?? null,
          dispatchDate,
          port: body.port,
          flightNumber: body.flightNumber ?? null,
          status: "DISPATCHED",
          remarks: body.remarks ?? null,
        },
        include: {
          crew: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      await tx.prepareJoining.update({
        where: { id: prepareJoining.id },
        data: {
          status: "DISPATCHED",
        },
      });

      return dispatch;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create dispatch";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
