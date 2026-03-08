import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/authz";
import { resolvePrincipalScopeId } from "@/lib/principal-scope";

function buildCvText(data: {
  candidateName: string;
  rank: string | null;
  nationality: string | null;
  dateOfBirth: Date | null;
  passportNumber: string | null;
  seamanBookNumber: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}): string {
  return [
    "HGI Candidate CV",
    "================",
    `Name: ${data.candidateName}`,
    `Rank: ${data.rank ?? "-"}`,
    `Nationality: ${data.nationality ?? "-"}`,
    `Date of Birth: ${data.dateOfBirth ? data.dateOfBirth.toISOString().split("T")[0] : "-"}`,
    `Passport Number: ${data.passportNumber ?? "-"}`,
    `Seaman Book Number: ${data.seamanBookNumber ?? "-"}`,
    `Email: ${data.email ?? "-"}`,
    `Phone: ${data.phone ?? "-"}`,
    `Address: ${data.address ?? "-"}`,
  ].join("\n");
}

export async function GET(
  request: NextRequest,
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
      crew: {
        select: {
          fullName: true,
          rank: true,
          nationality: true,
          dateOfBirth: true,
          passportNumber: true,
          seamanBookNumber: true,
          email: true,
          phone: true,
          address: true,
        },
      },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const cvPayload = {
    candidateName: application.crew.fullName,
    rank: application.crew.rank,
    nationality: application.crew.nationality,
    dateOfBirth: application.crew.dateOfBirth,
    passportNumber: application.crew.passportNumber,
    seamanBookNumber: application.crew.seamanBookNumber,
    email: application.crew.email,
    phone: application.crew.phone,
    address: application.crew.address,
  };

  const shouldDownload = new URL(request.url).searchParams.get("download") === "1";
  if (!shouldDownload) {
    return NextResponse.json({ data: cvPayload });
  }

  const cvText = buildCvText(cvPayload);
  const fileName = `${application.crew.fullName.replace(/\s+/g, "_").toLowerCase()}_cv.txt`;

  return new NextResponse(cvText, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
