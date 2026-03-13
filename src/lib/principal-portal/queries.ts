import { prisma } from "@/lib/prisma";
import type { PrepareJoiningStatus } from "@prisma/client";
import { ACTIVE_ASSIGNMENT_STATUSES } from "@/lib/assignment-status";
import { buildVesselMatrix } from "@/lib/vessel-matrix";

type PrincipalReplacementInput = {
  principalId: string;
  requestedBy: string;
  crewId: string;
  replacementCrewId?: string | null;
  reason: string;
};

function assignmentScopeWhere(principalId: string) {
  return {
    status: { in: [...ACTIVE_ASSIGNMENT_STATUSES] },
    OR: [
      { principalId },
      {
        vessel: {
          is: {
            principalId,
          },
        },
      },
    ],
  };
}

export async function listPrincipalVessels(principalId: string) {
  return prisma.vessel.findMany({
    where: {
      principalId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      imoNumber: true,
      type: true,
      flag: true,
      status: true,
      assignments: {
        where: {
          status: { in: [...ACTIVE_ASSIGNMENT_STATUSES] },
        },
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function getPrincipalVesselMatrix(input: {
  principalId: string;
  vesselId: string;
}) {
  const data = await buildVesselMatrix({
    principalId: input.principalId,
    vesselId: input.vesselId,
  });

  return data[0] ?? null;
}

export async function listPrincipalCrewOptions(input: {
  principalId: string;
  vesselId: string;
}) {
  const assignments = await prisma.assignment.findMany({
    where: {
      vesselId: input.vesselId,
      ...assignmentScopeWhere(input.principalId),
    },
    select: {
      crew: {
        select: {
          id: true,
          fullName: true,
          rank: true,
        },
      },
    },
    orderBy: {
      crew: {
        fullName: "asc",
      },
    },
  });

  const seen = new Set<string>();
  return assignments.flatMap((item) => {
    if (seen.has(item.crew.id)) {
      return [];
    }
    seen.add(item.crew.id);
    return [item.crew];
  });
}

export async function listPrincipalJoining(input: {
  principalId: string;
  status?: PrepareJoiningStatus | null;
  vesselId?: string | null;
}) {
  return prisma.prepareJoining.findMany({
    where: {
      principalId: input.principalId,
      ...(input.status ? { status: input.status } : {}),
      ...(input.vesselId ? { vesselId: input.vesselId } : {}),
    },
    select: {
      id: true,
      status: true,
      updatedAt: true,
      departureDate: true,
      departurePort: true,
      arrivalPort: true,
      flightNumber: true,
      ticketBooked: true,
      hotelBooked: true,
      transportArranged: true,
      orientationCompleted: true,
      visaValid: true,
      vesselContractSigned: true,
      preDepartureFinalCheck: true,
      crew: {
        select: {
          id: true,
          fullName: true,
          rank: true,
          nationality: true,
        },
      },
      vessel: {
        select: {
          id: true,
          name: true,
          type: true,
          flag: true,
        },
      },
    },
    orderBy: [
      { departureDate: "asc" },
      { updatedAt: "desc" },
    ],
  });
}

export async function listPrincipalDispatches(input: {
  principalId: string;
  vesselId?: string | null;
  status?: string | null;
}) {
  const vessels = await prisma.vessel.findMany({
    where: {
      principalId: input.principalId,
      status: "ACTIVE",
      ...(input.vesselId ? { id: input.vesselId } : {}),
    },
    select: {
      id: true,
    },
  });

  const vesselIds = vessels.map((item) => item.id);
  if (vesselIds.length === 0) {
    return [];
  }

  const vesselMap = new Map(
    (
      await prisma.vessel.findMany({
        where: {
          id: { in: vesselIds },
        },
        select: {
          id: true,
          name: true,
          type: true,
          flag: true,
        },
      })
    ).map((item) => [item.id, item])
  );

  const dispatches = await prisma.dispatch.findMany({
    where: {
      vesselId: { in: vesselIds },
      ...(input.status && input.status !== "ALL" ? { status: input.status } : {}),
    },
    select: {
      id: true,
      vesselId: true,
      dispatchDate: true,
      port: true,
      flightNumber: true,
      status: true,
      remarks: true,
      updatedAt: true,
      crew: {
        select: {
          id: true,
          fullName: true,
          rank: true,
        },
      },
    },
    orderBy: [
      { dispatchDate: "desc" },
      { updatedAt: "desc" },
    ],
  });

  return dispatches.flatMap((item) => {
    if (!item.vesselId) {
      return [];
    }

    const vessel = vesselMap.get(item.vesselId);
    if (!vessel) {
      return [];
    }

    return [{ ...item, vessel }];
  });
}

export async function listPrincipalReplacements(principalId: string) {
  return prisma.crewReplacement.findMany({
    where: {
      crew: {
        assignments: {
          some: assignmentScopeWhere(principalId),
        },
      },
    },
    select: {
      id: true,
      reason: true,
      status: true,
      remarks: true,
      createdAt: true,
      crew: {
        select: {
          id: true,
          fullName: true,
          rank: true,
          assignments: {
            where: assignmentScopeWhere(principalId),
            orderBy: {
              startDate: "desc",
            },
            take: 1,
            select: {
              id: true,
              rank: true,
              startDate: true,
              endDate: true,
              vessel: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
      },
      replacementCrew: {
        select: {
          id: true,
          fullName: true,
          rank: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function createPrincipalReplacement(input: PrincipalReplacementInput) {
  const reason = input.reason.trim();
  if (!reason) {
    throw new Error("reason is required");
  }

  const activeAssignment = await prisma.assignment.findFirst({
    where: {
      crewId: input.crewId,
      ...assignmentScopeWhere(input.principalId),
    },
    select: {
      id: true,
      crewId: true,
    },
    orderBy: {
      startDate: "desc",
    },
  });

  if (!activeAssignment) {
    throw new Error("Crew is not actively assigned to your principal.");
  }

  if (input.replacementCrewId) {
    if (input.replacementCrewId === input.crewId) {
      throw new Error("replacementCrewId must be different from crewId");
    }

    const replacementCrew = await prisma.crew.findUnique({
      where: {
        id: input.replacementCrewId,
      },
      select: {
        id: true,
      },
    });

    if (!replacementCrew) {
      throw new Error("Replacement crew not found.");
    }
  }

  return prisma.crewReplacement.create({
    data: {
      crewId: input.crewId,
      replacementCrewId: input.replacementCrewId ?? null,
      reason,
      requestedBy: input.requestedBy,
      status: "PENDING",
    },
    select: {
      id: true,
      reason: true,
      status: true,
      remarks: true,
      createdAt: true,
      crew: {
        select: {
          id: true,
          fullName: true,
          rank: true,
          assignments: {
            where: assignmentScopeWhere(input.principalId),
            orderBy: {
              startDate: "desc",
            },
            take: 1,
            select: {
              id: true,
              rank: true,
              startDate: true,
              endDate: true,
              vessel: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
      },
      replacementCrew: {
        select: {
          id: true,
          fullName: true,
          rank: true,
        },
      },
    },
  });
}
