import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/authz";
import { resolvePrincipalScopeId } from "@/lib/principal-scope";
import type { ApplicationStatus } from "@prisma/client";

const VIEW_FILTERS = {
  my: ["OFFERED"] as ApplicationStatus[],
  history: ["ACCEPTED", "REJECTED"] as ApplicationStatus[],
} as const;

export async function GET(request: NextRequest) {
  const auth = await requireUserApi(["PRINCIPAL"]);
  if (!auth.ok) {
    const statusCode = "status" in auth ? auth.status : 401;
    return NextResponse.json({ error: "Unauthorized" }, { status: statusCode });
  }

  const principalId = resolvePrincipalScopeId({
    userId: auth.user.id,
    email: auth.session.user.email,
  });

  if (!principalId) {
    return NextResponse.json({ error: "Principal scope is not configured" }, { status: 403 });
  }

  const viewParam = (new URL(request.url).searchParams.get("view") ?? "my").toLowerCase();
  const view = viewParam === "history" ? "history" : "my";
  const statuses = VIEW_FILTERS[view];

  const candidates = await prisma.application.findMany({
    where: {
      principalId,
      status: { in: statuses },
    },
    include: {
      crew: {
        select: {
          id: true,
          fullName: true,
          rank: true,
          nationality: true,
        },
      },
      principal: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return NextResponse.json({
    data: candidates,
    total: candidates.length,
    view,
  });
}
