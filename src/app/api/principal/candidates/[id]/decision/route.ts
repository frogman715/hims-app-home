import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/authz";
import { resolvePrincipalScopeId } from "@/lib/principal-scope";

type Decision = "APPROVE" | "REJECT";

function mergeOwnerNote(existing: string | null, note: string | null): string | null {
  if (!note || note.trim().length === 0) return existing;
  const entry = `OWNER_NOTE: ${note.trim()}`;
  if (!existing || existing.trim().length === 0) return entry;
  return `${existing}\n${entry}`;
}

export async function POST(
  request: Request,
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

  const body = (await request.json()) as { decision?: string; note?: string | null };
  const decision = (body.decision ?? "").toUpperCase() as Decision;

  if (decision !== "APPROVE" && decision !== "REJECT") {
    return NextResponse.json({ error: "decision must be APPROVE or REJECT" }, { status: 400 });
  }

  const { id } = await context.params;

  const application = await prisma.application.findFirst({
    where: {
      id,
      principalId,
    },
    select: {
      id: true,
      status: true,
      remarks: true,
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  if (application.status !== "OFFERED") {
    return NextResponse.json(
      { error: "Only OFFERED candidates can be decided by principal" },
      { status: 400 }
    );
  }

  const nextStatus = decision === "APPROVE" ? "ACCEPTED" : "REJECTED";

  const updated = await prisma.application.update({
    where: { id: application.id },
    data: {
      status: nextStatus,
      reviewedBy: auth.user.id,
      reviewedAt: new Date(),
      remarks: mergeOwnerNote(application.remarks, body.note ?? null),
    },
    include: {
      crew: {
        select: {
          id: true,
          fullName: true,
          rank: true,
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

  return NextResponse.json({
    data: updated,
    message: decision === "APPROVE" ? "Candidate approved by principal" : "Candidate rejected by principal",
  });
}
