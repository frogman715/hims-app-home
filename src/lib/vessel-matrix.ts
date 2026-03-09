import { prisma } from "@/lib/prisma";
import { ACTIVE_ASSIGNMENT_STATUSES, isActiveAssignmentStatus } from "@/lib/assignment-status";
import {
  resolveVesselRequirements,
  type VesselMatrixRequirement,
} from "@/lib/vessel-matrix-config";

export type VesselMatrixRow = {
  rank: string;
  requiredCount: number;
  filledCount: number;
  openCount: number;
  dueOffSoonCount: number;
  replacementRequestCount: number;
  replacementNeedCount: number;
  requiredCertificates: string[];
  filledCrew: Array<{
    assignmentId: string;
    crewId: string;
    crewName: string;
    assignmentStatus: string;
    startDate: string;
    endDate: string | null;
  }>;
};

export type VesselMatrixVessel = {
  vesselId: string;
  vesselName: string;
  vesselType: string;
  vesselStatus: string;
  principalId: string | null;
  principalName: string | null;
  requirementsConfigured: boolean;
  configSource: "vesselId" | "vesselType" | null;
  rows: VesselMatrixRow[];
  summary: {
    requiredTotal: number;
    filledTotal: number;
    openTotal: number;
    replacementNeedTotal: number;
  } | null;
};

function normalizeRank(value: string | null | undefined): string {
  if (!value) return "";
  return value.trim().toUpperCase();
}

function getDueOffDaysThreshold(): number {
  const parsed = Number.parseInt(process.env.HGI_VESSEL_MATRIX_DUE_OFF_DAYS ?? "30", 10);
  if (!Number.isFinite(parsed)) return 30;
  return Math.max(1, parsed);
}

function isDueOffSoon(endDate: Date | null, now: Date, thresholdDays: number): boolean {
  if (!endDate) return false;
  const diffMs = endDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= thresholdDays;
}

function buildRows(input: {
  requirements: VesselMatrixRequirement[];
  vesselAssignments: Array<{
    id: string;
    rank: string;
    status: string;
    startDate: Date;
    endDate: Date | null;
    crew: { id: string; fullName: string };
  }>;
  replacementNeedsByRank: Map<string, number>;
  dueOffByRank: Map<string, number>;
}): VesselMatrixRow[] {
  return input.requirements.map((req) => {
    const rank = normalizeRank(req.rank);
    const filled = input.vesselAssignments.filter((assignment) => normalizeRank(assignment.rank) === rank);

    const filledCrew = filled.map((assignment) => ({
      assignmentId: assignment.id,
      crewId: assignment.crew.id,
      crewName: assignment.crew.fullName,
      assignmentStatus: assignment.status,
      startDate: assignment.startDate.toISOString(),
      endDate: assignment.endDate ? assignment.endDate.toISOString() : null,
    }));

    const filledCount = filledCrew.length;
    const openCount = Math.max(0, req.requiredCount - filledCount);
    const dueOffSoonCount = input.dueOffByRank.get(rank) ?? 0;
    const replacementRequestCount = input.replacementNeedsByRank.get(rank) ?? 0;
    const replacementNeedCount = Math.max(openCount, replacementRequestCount + dueOffSoonCount);

    return {
      rank,
      requiredCount: req.requiredCount,
      filledCount,
      openCount,
      dueOffSoonCount,
      replacementRequestCount,
      replacementNeedCount,
      requiredCertificates: req.requiredCertificates,
      filledCrew,
    };
  });
}

export async function buildVesselMatrix(input?: { vesselId?: string }): Promise<VesselMatrixVessel[]> {
  const now = new Date();
  const dueOffThresholdDays = getDueOffDaysThreshold();

  const vessels = await prisma.vessel.findMany({
    where: {
      status: "ACTIVE",
      ...(input?.vesselId ? { id: input.vesselId } : {}),
    },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      principalId: true,
      principal: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  if (vessels.length === 0) {
    return [];
  }

  const vesselIds = vessels.map((vessel) => vessel.id);

  const assignments = await prisma.assignment.findMany({
    where: {
      vesselId: { in: vesselIds },
      status: { in: [...ACTIVE_ASSIGNMENT_STATUSES] },
    },
    select: {
      id: true,
      vesselId: true,
      rank: true,
      status: true,
      startDate: true,
      endDate: true,
      crew: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
  });

  const replacements = await prisma.crewReplacement.findMany({
    where: {
      status: { in: ["PENDING", "APPROVED"] },
    },
    select: {
      id: true,
      status: true,
      crew: {
        select: {
          id: true,
          rank: true,
          assignments: {
            where: {
              status: { in: [...ACTIVE_ASSIGNMENT_STATUSES] },
            },
            orderBy: {
              startDate: "desc",
            },
            take: 1,
            select: {
              vesselId: true,
              rank: true,
              status: true,
            },
          },
        },
      },
    },
  });

  const assignmentsByVessel = new Map<string, typeof assignments>();
  for (const assignment of assignments) {
    if (!isActiveAssignmentStatus(assignment.status)) continue;
    const current = assignmentsByVessel.get(assignment.vesselId) ?? [];
    current.push(assignment);
    assignmentsByVessel.set(assignment.vesselId, current);
  }

  const replacementNeedsByVesselRank = new Map<string, Map<string, number>>();
  for (const replacement of replacements) {
    const activeAssignment = replacement.crew.assignments[0];
    if (!activeAssignment?.vesselId) continue;

    const vesselId = activeAssignment.vesselId;
    const rank = normalizeRank(activeAssignment.rank ?? replacement.crew.rank);
    if (!rank) continue;

    const byRank = replacementNeedsByVesselRank.get(vesselId) ?? new Map<string, number>();
    byRank.set(rank, (byRank.get(rank) ?? 0) + 1);
    replacementNeedsByVesselRank.set(vesselId, byRank);
  }

  const dueOffSoonByVesselRank = new Map<string, Map<string, number>>();
  for (const assignment of assignments) {
    if (!isDueOffSoon(assignment.endDate, now, dueOffThresholdDays)) continue;

    const rank = normalizeRank(assignment.rank);
    if (!rank) continue;

    const byRank = dueOffSoonByVesselRank.get(assignment.vesselId) ?? new Map<string, number>();
    byRank.set(rank, (byRank.get(rank) ?? 0) + 1);
    dueOffSoonByVesselRank.set(assignment.vesselId, byRank);
  }

  const matrix: VesselMatrixVessel[] = [];

  for (const vessel of vessels) {
    const resolvedConfig = resolveVesselRequirements({
      vesselId: vessel.id,
      vesselType: vessel.type,
    });

    if (!resolvedConfig) {
      matrix.push({
        vesselId: vessel.id,
        vesselName: vessel.name,
        vesselType: vessel.type,
        vesselStatus: vessel.status,
        principalId: vessel.principalId,
        principalName: vessel.principal?.name ?? null,
        requirementsConfigured: false,
        configSource: null,
        rows: [],
        summary: null,
      });
      continue;
    }

    const vesselAssignments = assignmentsByVessel.get(vessel.id) ?? [];
    const replacementNeedsByRank = replacementNeedsByVesselRank.get(vessel.id) ?? new Map<string, number>();
    const dueOffByRank = dueOffSoonByVesselRank.get(vessel.id) ?? new Map<string, number>();

    const rows = buildRows({
      requirements: resolvedConfig.requirements,
      vesselAssignments,
      replacementNeedsByRank,
      dueOffByRank,
    });

    const summary = rows.reduce(
      (acc, row) => {
        acc.requiredTotal += row.requiredCount;
        acc.filledTotal += row.filledCount;
        acc.openTotal += row.openCount;
        acc.replacementNeedTotal += row.replacementNeedCount;
        return acc;
      },
      { requiredTotal: 0, filledTotal: 0, openTotal: 0, replacementNeedTotal: 0 }
    );

    matrix.push({
      vesselId: vessel.id,
      vesselName: vessel.name,
      vesselType: vessel.type,
      vesselStatus: vessel.status,
      principalId: vessel.principalId,
      principalName: vessel.principal?.name ?? null,
      requirementsConfigured: true,
      configSource: resolvedConfig.source,
      rows,
      summary,
    });
  }

  return matrix;
}
