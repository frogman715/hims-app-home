import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/authz";
import { resolvePrincipalScopeId } from "@/lib/principal-scope";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

  const { id } = await context.params;

  const application = await prisma.application.findFirst({
    where: {
      id,
      principalId,
    },
    include: {
      crew: true,
      principal: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  return NextResponse.json(application);
}
