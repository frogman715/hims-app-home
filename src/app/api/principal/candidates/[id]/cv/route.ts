import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/authz";
import { resolvePrincipalScopeId } from "@/lib/principal-scope";
import { canAccessRedData, decrypt } from "@/lib/crypto";
import { maskPassport } from "@/lib/masking";
import { buildCrewCvPayload, renderCrewCvText } from "@/lib/cv-template";

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
          emergencyContactName: true,
          emergencyContact: true,
          documents: {
            where: { isActive: true },
            select: {
              docType: true,
              docNumber: true,
              expiryDate: true,
            },
            orderBy: { expiryDate: "asc" },
          },
          contracts: {
            orderBy: { contractStart: "desc" },
            take: 1,
            select: {
              rank: true,
              contractStart: true,
              contractEnd: true,
              status: true,
              vessel: { select: { name: true } },
              principal: { select: { name: true } },
            },
          },
        },
      },
      principal: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  let passportNumber = application.crew.passportNumber;
  if (passportNumber) {
    const hasRedAccess = canAccessRedData(auth.session.user.roles ?? [], "identity");
    if (hasRedAccess) {
      try {
        passportNumber = decrypt(passportNumber);
      } catch {
        passportNumber = maskPassport(passportNumber);
      }
    } else {
      passportNumber = maskPassport(passportNumber);
    }
  }

  const latestContract = application.crew.contracts[0];
  const cvPayload = buildCrewCvPayload({
    candidateName: application.crew.fullName,
    rank: application.crew.rank,
    nationality: application.crew.nationality,
    dateOfBirth: application.crew.dateOfBirth,
    passportNumber,
    seamanBookNumber: application.crew.seamanBookNumber,
    email: application.crew.email,
    phone: application.crew.phone,
    address: application.crew.address,
    emergencyContact: application.crew.emergencyContactName ?? application.crew.emergencyContact,
    applicationPosition: application.position,
    sourceLabel: application.principal?.name ?? "Principal candidate",
    documents: application.crew.documents,
    latestContract: latestContract
      ? {
          rank: latestContract.rank,
          contractStart: latestContract.contractStart,
          contractEnd: latestContract.contractEnd,
          status: latestContract.status,
          vesselName: latestContract.vessel?.name ?? null,
          principalName: latestContract.principal?.name ?? null,
        }
      : null,
  });

  const shouldDownload = new URL(request.url).searchParams.get("download") === "1";
  if (!shouldDownload) {
    return NextResponse.json({ data: cvPayload });
  }

  const cvText = renderCrewCvText(cvPayload);
  const fileName = `${application.crew.fullName.replace(/\s+/g, "_").toLowerCase()}_cv.txt`;

  return new NextResponse(cvText, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
