import { NextResponse } from "next/server";
import { withPermission } from "@/lib/api-middleware";
import { PermissionLevel } from "@/lib/permission-middleware";
import { prisma } from "@/lib/prisma";
import { assessCrewReadiness } from "@/lib/crew-readiness";
import { handleApiError } from "@/lib/error-handler";

export const GET = withPermission(
  "preJoining",
  PermissionLevel.VIEW_ACCESS,
  async () => {
    try {
      const prepareJoinings = await prisma.prepareJoining.findMany({
        where: {
          status: {
            notIn: ["DISPATCHED", "CANCELLED"],
          },
        },
        include: {
          crew: {
            select: {
              id: true,
              crewCode: true,
              crewStatus: true,
              fullName: true,
              rank: true,
              nationality: true,
              documents: {
                where: { isActive: true },
                select: {
                  id: true,
                  docType: true,
                  docNumber: true,
                  expiryDate: true,
                },
              },
            },
          },
          vessel: {
            select: {
              id: true,
              name: true,
            },
          },
          principal: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [
          { departureDate: "asc" },
          { createdAt: "desc" },
        ],
      });

      const assessments = prepareJoinings.map((prepareJoining) =>
        assessCrewReadiness(prepareJoining, prepareJoining.crew.documents)
      );

      const summary = assessments.reduce(
        (accumulator, item) => {
          accumulator.total += 1;
          if (item.readinessBand === "READY") accumulator.ready += 1;
          if (item.readinessBand === "WATCH") accumulator.watch += 1;
          if (item.readinessBand === "BLOCKED") accumulator.blocked += 1;
          return accumulator;
        },
        { total: 0, ready: 0, watch: 0, blocked: 0 }
      );

      return NextResponse.json({
        advisory: true,
        message: "Advisory readiness only. Manual Prepare Joining remains the operational source of truth.",
        summary,
        data: assessments,
      });
    } catch (error) {
      return handleApiError(error);
    }
  }
);
