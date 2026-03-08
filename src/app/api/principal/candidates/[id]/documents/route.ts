import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/authz";
import { resolvePrincipalScopeId } from "@/lib/principal-scope";
import { isPrincipalVisibleDocumentType } from "@/lib/principal-document-policy";

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
    select: {
      id: true,
      crewId: true,
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const documents = await prisma.crewDocument.findMany({
    where: {
      crewId: application.crewId,
    },
    select: {
      id: true,
      docType: true,
      docNumber: true,
      issueDate: true,
      expiryDate: true,
      fileUrl: true,
      remarks: true,
    },
    orderBy: {
      expiryDate: "asc",
    },
  });

  const filtered = documents
    .filter((document) => isPrincipalVisibleDocumentType(document.docType))
    .map((document) => ({
      ...document,
      downloadUrl: `/api/principal/candidates/${application.id}/documents/${document.id}`,
    }));

  return NextResponse.json({
    data: filtered,
    total: filtered.length,
  });
}
