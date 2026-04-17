import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { checkPermission, PermissionLevel } from "@/lib/permission-middleware";
import {
  buildDocumentAlert,
  calculateDaysUntil,
  getSuggestedTaskType,
} from "@/lib/crew-readiness";

function parseOptions(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days") ?? "90");
  const limit = Number(searchParams.get("limit") ?? "0");
  const dryRun = searchParams.get("dryRun") === "1";

  return {
    days: Number.isFinite(days) && days > 0 ? days : 90,
    limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    dryRun,
  };
}

async function resolveActorUserId(): Promise<string> {
  const systemAdmin = await prisma.user.findFirst({
    where: { isSystemAdmin: true },
    select: { id: true },
  });

  if (!systemAdmin) {
    throw new Error("No system admin user available for expiry monitoring.");
  }

  return systemAdmin.id;
}

async function executeMonitor(options: { days: number; limit?: number; dryRun: boolean }) {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + options.days * 24 * 60 * 60 * 1000);
  const actorUserId = options.dryRun ? null : await resolveActorUserId();

  const documents = await prisma.crewDocument.findMany({
    where: {
      isActive: true,
      expiryDate: {
        not: null,
        lte: windowEnd,
      },
    },
    include: {
      crew: {
        select: {
          id: true,
          fullName: true,
          rank: true,
          email: true,
        },
      },
    },
    orderBy: {
      expiryDate: "asc",
    },
    take: options.limit,
  });

  let createdTasks = 0;
  let createdAuditLogs = 0;
  let queuedReminders = 0;

  for (const document of documents) {
    if (!document.expiryDate) {
      continue;
    }

    const alert = buildDocumentAlert(document, now);
    const daysUntilExpiry = calculateDaysUntil(document.expiryDate, now);
    const title = `Document Expiry Alert - ${alert.docLabel}`;
    const description =
      daysUntilExpiry < 0
        ? `${alert.docLabel} expired ${Math.abs(daysUntilExpiry)} days ago and requires review.`
        : `${alert.docLabel} expires in ${daysUntilExpiry} days and requires review.`;

    const existingTask = await prisma.crewTask.findFirst({
      where: {
        crewId: document.crewId,
        taskType: getSuggestedTaskType(document.docType),
        status: {
          in: ["TODO", "IN_PROGRESS", "BLOCKED"],
        },
        title,
      },
      select: { id: true },
    });

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const existingAudit = await prisma.auditTrail.findFirst({
      where: {
        category: "DOCUMENT_VERIFICATION",
        entityType: "CREW_DOCUMENT",
        entityId: document.id,
        event: "EXPIRY_MONITOR",
        createdAt: { gte: startOfDay, lt: endOfDay },
      },
      select: { id: true },
    });

    if (options.dryRun) {
      continue;
    }

    if (!existingTask) {
      await prisma.crewTask.create({
        data: {
          crewId: document.crewId,
          taskType: getSuggestedTaskType(document.docType),
          title,
          description,
          priority: alert.severity === "expired" || alert.severity === "critical" ? "HIGH" : "MEDIUM",
          dueDate: document.expiryDate,
        },
      });
      createdTasks += 1;
    }

    if (!existingAudit && actorUserId) {
      await prisma.auditTrail.create({
        data: {
          category: "DOCUMENT_VERIFICATION",
          entityType: "CREW_DOCUMENT",
          entityId: document.id,
          event: "EXPIRY_MONITOR",
          description,
          userId: actorUserId,
          severity:
            alert.severity === "expired"
              ? "CRITICAL"
              : alert.severity === "critical"
                ? "WARNING"
                : "INFO",
        },
      });
      createdAuditLogs += 1;
    }

    if (alert.severity === "expired" || alert.severity === "critical" || alert.severity === "warning") {
      const reminderType =
        alert.severity === "expired"
          ? "DOCUMENT_EXPIRY_EXPIRED_QUEUE"
          : alert.severity === "critical"
            ? "DOCUMENT_EXPIRY_30_DAYS_QUEUE"
            : "DOCUMENT_EXPIRY_90_DAYS_QUEUE";

      const existingReminder = await prisma.emailNotificationLog.findFirst({
        where: {
          emailType: reminderType,
          relatedEntityType: "CrewDocument",
          relatedEntityId: document.id,
          status: "QUEUED",
        },
        select: { id: true },
      });

      if (!existingReminder) {
        await prisma.emailNotificationLog.create({
          data: {
            recipientEmail: document.crew.email ?? "queue@local.invalid",
            recipientName: document.crew.fullName,
            subject: `Queued reminder: ${alert.docLabel}`,
            emailType: reminderType,
            relatedEntityType: "CrewDocument",
            relatedEntityId: document.id,
            status: "QUEUED",
          },
        });
        queuedReminders += 1;
      }
    }
  }

  return {
    scanned: documents.length,
    createdTasks,
    createdAuditLogs,
    queuedReminders,
    dryRun: options.dryRun,
    days: options.days,
    items: documents.slice(0, 20).map((document) => ({
      id: document.id,
      crewId: document.crewId,
      crewName: document.crew.fullName,
      rank: document.crew.rank,
      docType: document.docType,
      expiryDate: document.expiryDate,
    })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.SCHEDULER_SECRET_TOKEN;

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await executeMonitor(parseOptions(request));
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Crew document monitor failed:", error);
    return NextResponse.json({ error: "Monitoring failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasCrewEdit = checkPermission(session, "crew", PermissionLevel.EDIT_ACCESS);
    const hasPreJoiningEdit = checkPermission(session, "preJoining", PermissionLevel.EDIT_ACCESS);

    if (!hasCrewEdit && !hasPreJoiningEdit) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const result = await executeMonitor(parseOptions(request));
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Crew document monitor failed:", error);
    return NextResponse.json({ error: "Monitoring failed" }, { status: 500 });
  }
}
