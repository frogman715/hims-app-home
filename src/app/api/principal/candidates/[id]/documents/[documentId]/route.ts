import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/authz";
import { resolvePrincipalScopeId } from "@/lib/principal-scope";
import { isPrincipalVisibleDocumentType } from "@/lib/principal-document-policy";
import { getAbsolutePath, isPathSafe } from "@/lib/upload-path";
import fs from "fs";
import path from "path";

const FALLBACK_MIME = "application/octet-stream";

function resolveMimeType(fileUrl: string | null): string {
  const lower = (fileUrl ?? "").toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".doc")) return "application/msword";
  return FALLBACK_MIME;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; documentId: string }> }
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

  const { id, documentId } = await context.params;

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

  const document = await prisma.crewDocument.findFirst({
    where: {
      id: documentId,
      crewId: application.crewId,
    },
    select: {
      id: true,
      docType: true,
      fileUrl: true,
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (!isPrincipalVisibleDocumentType(document.docType)) {
    return NextResponse.json({ error: "Document is not visible to principal" }, { status: 403 });
  }

  if (!document.fileUrl) {
    return NextResponse.json({ error: "Document file is unavailable" }, { status: 404 });
  }

  const pathname = new URL(document.fileUrl, "http://localhost").pathname;
  if (!pathname.startsWith("/api/files/")) {
    return NextResponse.json({ error: "Unsupported document path" }, { status: 400 });
  }

  const relativePath = pathname.replace("/api/files/", "");
  const absolutePath = getAbsolutePath(relativePath);
  if (!isPathSafe(absolutePath)) {
    return NextResponse.json({ error: "Invalid document path" }, { status: 403 });
  }

  if (!fs.existsSync(absolutePath)) {
    return NextResponse.json({ error: "Document file not found" }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(absolutePath);
  const mimeType = resolveMimeType(document.fileUrl);
  const fileName = path.basename(absolutePath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(fileBuffer.length),
      "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
