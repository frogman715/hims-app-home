import { NextRequest, NextResponse } from "next/server";
import { requireUserApi } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { resolveDriverDispatchIds } from "@/lib/driver-dispatch-scope";

const DRIVER_STATUS_FLOW: Record<string, string[]> = {
  DISPATCHED: ["PICKUP_IN_PROGRESS", "AT_AIRPORT"],
  PICKUP_IN_PROGRESS: ["PICKUP_COMPLETED", "AT_AIRPORT"],
  PICKUP_COMPLETED: ["AT_AIRPORT"],
  AT_AIRPORT: ["CHECKIN_ASSISTED", "COMPLETED"],
  CHECKIN_ASSISTED: ["COMPLETED"],
  COMPLETED: [],
};

function normalizeStatus(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

function mergeStatusRemark(existing: string | null, status: string, note: string | null): string {
  const base = existing?.trim() ? `${existing.trim()}\n` : "";
  const notePart = note?.trim() ? ` (${note.trim()})` : "";
  return `${base}${new Date().toISOString()} DRIVER_STATUS: ${status}${notePart}`;
}

async function requireAssignedDriverDispatch(input: {
  dispatchId: string;
  userId: string;
  email?: string | null;
}) {
  const assignedDispatchIds = resolveDriverDispatchIds({
    userId: input.userId,
    email: input.email,
  });

  if (assignedDispatchIds.length === 0) {
    return { allowed: false as const, reason: "Driver dispatch scope is not configured for this user." };
  }

  if (!assignedDispatchIds.includes(input.dispatchId)) {
    return { allowed: false as const, reason: "Dispatch is not assigned to this driver." };
  }

  return { allowed: true as const };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUserApi(["DRIVER"]);
  if (!auth.ok) {
    const statusCode = "status" in auth ? auth.status : 401;
    return NextResponse.json({ error: "Unauthorized" }, { status: statusCode });
  }

  const { id } = await context.params;
  const scope = await requireAssignedDriverDispatch({
    dispatchId: id,
    userId: auth.user.id,
    email: auth.session.user.email,
  });

  if (!scope.allowed) {
    return NextResponse.json({ error: scope.reason }, { status: 403 });
  }

  const dispatch = await prisma.dispatch.findUnique({
    where: { id },
    include: {
      crew: {
        select: {
          id: true,
          fullName: true,
          rank: true,
          phone: true,
        },
      },
    },
  });

  if (!dispatch) {
    return NextResponse.json({ error: "Dispatch not found" }, { status: 404 });
  }

  return NextResponse.json({ data: dispatch });
}

type UpdateDispatchStatusPayload = {
  status?: string;
  note?: string | null;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireUserApi(["DRIVER"]);
  if (!auth.ok) {
    const statusCode = "status" in auth ? auth.status : 401;
    return NextResponse.json({ error: "Unauthorized" }, { status: statusCode });
  }

  const { id } = await context.params;
  const scope = await requireAssignedDriverDispatch({
    dispatchId: id,
    userId: auth.user.id,
    email: auth.session.user.email,
  });

  if (!scope.allowed) {
    return NextResponse.json({ error: scope.reason }, { status: 403 });
  }

  const body = (await request.json()) as UpdateDispatchStatusPayload;
  const nextStatus = normalizeStatus(body.status);
  if (!nextStatus) {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  const current = await prisma.dispatch.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      remarks: true,
    },
  });

  if (!current) {
    return NextResponse.json({ error: "Dispatch not found" }, { status: 404 });
  }

  const currentStatus = normalizeStatus(current.status);
  const allowedTransitions = DRIVER_STATUS_FLOW[currentStatus] ?? [];

  if (!allowedTransitions.includes(nextStatus)) {
    return NextResponse.json(
      {
        error: `Invalid driver transition from ${currentStatus || "UNKNOWN"} to ${nextStatus}`,
      },
      { status: 400 }
    );
  }

  const updated = await prisma.dispatch.update({
    where: { id },
    data: {
      status: nextStatus,
      remarks: mergeStatusRemark(current.remarks, nextStatus, body.note ?? null),
    },
    include: {
      crew: {
        select: {
          id: true,
          fullName: true,
          rank: true,
        },
      },
    },
  });

  return NextResponse.json({ data: updated });
}
