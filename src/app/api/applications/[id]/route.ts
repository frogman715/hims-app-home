import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkPermission, PermissionLevel } from "@/lib/permission-middleware";
import {
  hasAnyRole,
  isHgiFlowTransition,
  validateHgiFlowTransition,
  HGI_DIRECTOR_ROLES,
  HGI_DOCUMENT_ROLES,
} from "@/lib/candidate-flow";
import { isValidStateTransition } from "@/types/crewing";

// Define ApplicationStatus enum locally since it's not in Prisma schema
enum ApplicationStatus {
  RECEIVED = "RECEIVED",
  REVIEWING = "REVIEWING",
  INTERVIEW = "INTERVIEW",
  PASSED = "PASSED",
  OFFERED = "OFFERED",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

// Define PrepareJoiningStatus enum locally since it's not in Prisma schema
enum PrepareJoiningStatus {
  PENDING = "PENDING",
  DOCUMENTS = "DOCUMENTS",
  MEDICAL = "MEDICAL",
  TRAINING = "TRAINING",
  TRAVEL = "TRAVEL",
  READY = "READY",
}

interface UpdateApplicationPayload {
  position?: string;
  status?: ApplicationStatus;
  vesselType?: string | null;
  principalId?: string | null;
  remarks?: string | null;
}

const APPLICATION_STATUS_VALUES = new Set<ApplicationStatus>([
  ApplicationStatus.RECEIVED,
  ApplicationStatus.REVIEWING,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.PASSED,
  ApplicationStatus.OFFERED,
  ApplicationStatus.ACCEPTED,
  ApplicationStatus.REJECTED,
  ApplicationStatus.CANCELLED,
]);

const ACTIVE_PREPARE_JOINING_STATUSES: PrepareJoiningStatus[] = [
  PrepareJoiningStatus.PENDING,
  PrepareJoiningStatus.DOCUMENTS,
  PrepareJoiningStatus.MEDICAL,
  PrepareJoiningStatus.TRAINING,
  PrepareJoiningStatus.TRAVEL,
  PrepareJoiningStatus.READY,
];

function normalizeOptionalString(value?: string | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function isUpdateApplicationPayload(value: unknown): value is UpdateApplicationPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Partial<UpdateApplicationPayload>;

  if (
    payload.status !== undefined &&
    !APPLICATION_STATUS_VALUES.has(payload.status as ApplicationStatus)
  ) {
    return false;
  }

  if (
    payload.position !== undefined &&
    typeof payload.position !== "string"
  ) {
    return false;
  }

  if (
    payload.vesselType !== undefined &&
    payload.vesselType !== null &&
    typeof payload.vesselType !== "string"
  ) {
    return false;
  }

  if (
    payload.principalId !== undefined &&
    payload.principalId !== null &&
    typeof payload.principalId !== "string"
  ) {
    return false;
  }

  if (
    payload.remarks !== undefined &&
    payload.remarks !== null &&
    typeof payload.remarks !== "string"
  ) {
    return false;
  }

  return true;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!checkPermission(session, "applications", PermissionLevel.VIEW_ACCESS)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { id } = await context.params;
    const applicationId = id; // Keep as string since id is cuid

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        crew: {
          select: {
            fullName: true,
            nationality: true,
          }
        }
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Transform response to match frontend expectations
    return NextResponse.json({
      id: application.id,
      seafarerId: application.crewId,
      appliedRank: application.position,
      status: application.status,
      seafarer: {
        fullName: application.crew.fullName,
        nationality: application.crew.nationality,
      },
      ...application, // Include all other fields
    });
  } catch (error) {
    console.error("Error fetching application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!checkPermission(session, "applications", PermissionLevel.EDIT_ACCESS)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { id } = await context.params;
    const applicationId = id;

    const body = (await request.json()) as unknown;
    if (!isUpdateApplicationPayload(body)) {
      return NextResponse.json({ error: "Invalid application update payload" }, { status: 400 });
    }

    const existingApplication = await prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        status: true,
        principalId: true,
      },
    });

    if (!existingApplication) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const userRoles = (Array.isArray(session.user?.roles) ? session.user.roles : []).map((role) =>
      role.toUpperCase()
    );
    const isDirector = hasAnyRole(userRoles, HGI_DIRECTOR_ROLES);
    const isDocument = hasAnyRole(userRoles, HGI_DOCUMENT_ROLES);

    if (!isDirector && !isDocument) {
      return NextResponse.json(
        { error: "Only DOCUMENT or DIRECTOR can modify candidate flow in this endpoint." },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {};
    
    if (body.status !== undefined) {
      const nextStatus = body.status.toUpperCase();
      const currentStatus = existingApplication.status.toUpperCase();

      if (isHgiFlowTransition(currentStatus, nextStatus)) {
        const requestedPrincipalId =
          body.principalId !== undefined ? normalizeOptionalString(body.principalId) : existingApplication.principalId;

        const validation = validateHgiFlowTransition({
          userRoles,
          fromStatus: currentStatus,
          toStatus: nextStatus,
          principalId: requestedPrincipalId,
        });

        if (!validation.allowed) {
          return NextResponse.json({ error: validation.reason ?? "Forbidden transition" }, { status: 403 });
        }
      } else {
        // Keep legacy statuses intact but restrict non-HGI transition execution to DIRECTOR.
        if (!isDirector) {
          return NextResponse.json(
            { error: "Only DIRECTOR can execute legacy/non-HGI transitions." },
            { status: 403 }
          );
        }
        if (!isValidStateTransition(currentStatus, nextStatus)) {
          return NextResponse.json(
            { error: `Invalid transition from ${currentStatus} to ${nextStatus}` },
            { status: 400 }
          );
        }
      }

      updateData.status = body.status;
      if (body.status !== ApplicationStatus.RECEIVED && session.user?.id) {
        updateData.reviewedBy = session.user.id;
        updateData.reviewedAt = new Date();
      }
    }
    if (body.position !== undefined) {
      updateData.position = body.position.trim();
    }
    if (body.vesselType !== undefined) {
      updateData.vesselType = normalizeOptionalString(body.vesselType);
    }
    if (body.principalId !== undefined) {
      const normalizedPrincipalId = normalizeOptionalString(body.principalId);
      updateData.principal = normalizedPrincipalId
        ? { connect: { id: normalizedPrincipalId } }
        : { disconnect: true };
    }

    const application = await prisma.application.update({
      where: { id: applicationId },
      data: updateData,
      include: {
        crew: {
          select: {
            id: true,
            fullName: true,
            nationality: true,
            rank: true,
            phone: true,
            email: true,
          }
        },
        principal: {
          select: {
            id: true,
            name: true,
          }
        }
      },
    });

    // Auto-create PrepareJoining record when application is ACCEPTED
    if (body.status === ApplicationStatus.ACCEPTED) {
      const existingPrepare = await prisma.prepareJoining.findFirst({
        where: {
          crewId: application.crewId,
          status: { in: ACTIVE_PREPARE_JOINING_STATUSES },
        }
      });

      if (!existingPrepare) {
        await prisma.prepareJoining.create({
          data: {
            crewId: application.crewId,
            vesselId: null,
            principalId: application.principalId,
            status: PrepareJoiningStatus.PENDING,
            passportValid: false,
            seamanBookValid: false,
            certificatesValid: false,
            medicalValid: false,
            visaValid: false,
            orientationCompleted: false,
            ticketBooked: false,
            hotelBooked: false,
            transportArranged: false,
            remarks: `Auto-created from application ${application.id}`,
          }
        });
      }
    }

    return NextResponse.json(application);
  } catch (error) {
    console.error("Error updating application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
