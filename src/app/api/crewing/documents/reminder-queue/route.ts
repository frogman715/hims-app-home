import { NextResponse } from "next/server";
import { withPermission } from "@/lib/api-middleware";
import { PermissionLevel } from "@/lib/permission-middleware";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/error-handler";

export const GET = withPermission(
  "crew",
  PermissionLevel.VIEW_ACCESS,
  async () => {
    try {
      const queue = await prisma.emailNotificationLog.findMany({
        where: {
          emailType: {
            in: [
              "DOCUMENT_EXPIRY_EXPIRED_QUEUE",
              "DOCUMENT_EXPIRY_30_DAYS_QUEUE",
              "DOCUMENT_EXPIRY_90_DAYS_QUEUE",
            ],
          },
          status: "QUEUED",
        },
        orderBy: { sentAt: "desc" },
        take: 100,
      });

      return NextResponse.json({
        total: queue.length,
        data: queue,
      });
    } catch (error) {
      return handleApiError(error);
    }
  }
);
