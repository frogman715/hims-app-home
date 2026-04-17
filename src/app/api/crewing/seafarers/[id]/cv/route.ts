import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withPermission } from "@/lib/api-middleware";
import { PermissionLevel } from "@/lib/permission-middleware";
import { buildCrewCvPayload, renderCrewCvHtml, renderCrewCvText } from "@/lib/cv-template";
import { handleApiError, ApiError } from "@/lib/error-handler";
import { canAccessRedData, decrypt } from "@/lib/crypto";
import { maskPassport } from "@/lib/masking";
import puppeteer from "puppeteer";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const GET = withPermission<RouteContext>(
  "crew",
  PermissionLevel.VIEW_ACCESS,
  async (request: NextRequest, session, { params }) => {
    try {
      const format = new URL(request.url).searchParams.get("format");
      const { id } = await params;
      const crew = await prisma.crew.findUnique({
        where: { id },
        include: {
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
      });

      if (!crew) {
        throw new ApiError(404, "Seafarer not found", "NOT_FOUND");
      }

      let passportNumber = crew.passportNumber;
      if (passportNumber) {
        const hasRedAccess = canAccessRedData(session.user.roles ?? [], "identity");
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

      const latestContract = crew.contracts[0];
      const payload = buildCrewCvPayload({
        candidateName: crew.fullName,
        rank: crew.rank,
        nationality: crew.nationality,
        dateOfBirth: crew.dateOfBirth,
        passportNumber,
        seamanBookNumber: crew.seamanBookNumber,
        email: crew.email,
        phone: crew.phone,
        address: crew.address,
        emergencyContact: crew.emergencyContactName ?? crew.emergencyContact,
        sourceLabel: "Crew record",
        documents: crew.documents,
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

      if (format === "pdf") {
        const browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        });

        try {
          const page = await browser.newPage();
          await page.setContent(renderCrewCvHtml(payload), { waitUntil: "networkidle0" });
          const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
              top: "12mm",
              right: "10mm",
              bottom: "12mm",
              left: "10mm",
            },
          });

          const fileName = `${crew.fullName.replace(/\s+/g, "_").toLowerCase()}_cv.pdf`;
          return new NextResponse(Buffer.from(pdfBuffer), {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${fileName}"`,
            },
          });
        } finally {
          await browser.close();
        }
      }

      const shouldDownload = new URL(request.url).searchParams.get("download") === "1";
      if (!shouldDownload) {
        return NextResponse.json({ data: payload });
      }

      const fileName = `${crew.fullName.replace(/\s+/g, "_").toLowerCase()}_cv.txt`;
      return new NextResponse(renderCrewCvText(payload), {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    } catch (error) {
      return handleApiError(error);
    }
  }
);
