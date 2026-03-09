import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { resolveDriverDispatchIds } from "@/lib/driver-dispatch-scope";

export async function GET() {
  const auth = await requireUserApi(["DRIVER"]);
  if (!auth.ok) {
    const statusCode = "status" in auth ? auth.status : 401;
    return NextResponse.json({ error: "Unauthorized" }, { status: statusCode });
  }

  const assignedDispatchIds = resolveDriverDispatchIds({
    userId: auth.user.id,
    email: auth.session.user.email,
  });

  if (assignedDispatchIds.length === 0) {
    return NextResponse.json(
      { error: "Driver dispatch scope is not configured for this user." },
      { status: 403 }
    );
  }

  const dispatches = await prisma.dispatch.findMany({
    where: {
      id: {
        in: assignedDispatchIds,
      },
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
    orderBy: {
      dispatchDate: "desc",
    },
  });

  return NextResponse.json({
    data: dispatches,
    total: dispatches.length,
  });
}
