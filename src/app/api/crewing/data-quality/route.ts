import { NextResponse } from "next/server";
import { withPermission } from "@/lib/api-middleware";
import { PermissionLevel } from "@/lib/permission-middleware";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/error-handler";

type CrewQualityIssue = {
  crewId: string;
  crewName: string;
  detectedIssues: string[];
};

function isIncompleteBiodata(record: {
  dateOfBirth: Date | null;
  placeOfBirth: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}): boolean {
  const fields = [record.dateOfBirth, record.placeOfBirth, record.phone, record.email, record.address];
  return fields.filter(Boolean).length < 4;
}

export const GET = withPermission(
  "crew",
  PermissionLevel.VIEW_ACCESS,
  async () => {
    try {
      const crews = await prisma.crew.findMany({
        select: {
          id: true,
          fullName: true,
          nationality: true,
          passportNumber: true,
          dateOfBirth: true,
          placeOfBirth: true,
          phone: true,
          email: true,
          address: true,
          documents: {
            where: { isActive: true },
            select: {
              docType: true,
              expiryDate: true,
            },
          },
        },
        orderBy: { fullName: "asc" },
      });

      const issues: CrewQualityIssue[] = crews
        .map((crew) => {
          const detectedIssues: string[] = [];

          if (!crew.passportNumber) {
            detectedIssues.push("Missing passport number");
          }

          if (!crew.nationality) {
            detectedIssues.push("Missing nationality");
          }

          if (isIncompleteBiodata(crew)) {
            detectedIssues.push("Incomplete biodata");
          }

          const missingExpiryDocs = crew.documents.filter((document) => !document.expiryDate);
          if (missingExpiryDocs.length > 0) {
            detectedIssues.push("Active document without expiry date");
          }

          const seenDocTypes = new Set<string>();
          const duplicateActiveDocTypes = new Set<string>();
          for (const document of crew.documents) {
            if (seenDocTypes.has(document.docType)) {
              duplicateActiveDocTypes.add(document.docType);
            }
            seenDocTypes.add(document.docType);
          }

          if (duplicateActiveDocTypes.size > 0) {
            detectedIssues.push("Duplicate active documents");
          }

          return {
            crewId: crew.id,
            crewName: crew.fullName,
            detectedIssues,
          };
        })
        .filter((entry) => entry.detectedIssues.length > 0);

      return NextResponse.json({
        advisory: true,
        total: issues.length,
        data: issues,
      });
    } catch (error) {
      return handleApiError(error);
    }
  }
);
