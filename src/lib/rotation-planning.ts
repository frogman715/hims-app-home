import { prisma } from "@/lib/prisma";
import { ACTIVE_ASSIGNMENT_STATUSES, isActiveAssignmentStatus } from "@/lib/assignment-status";
import { ACTIVE_PREPARE_JOINING_STATUSES } from "@/lib/operational-flow";

type ReplacementStatus = "PENDING" | "APPROVED";

type RotationSuggestion = {
  crewId: string;
  crewName: string;
  rank: string;
  crewStatus: string;
};

type RotationDueOffItem = {
  assignmentId: string;
  crewId: string;
  crewName: string;
  rank: string;
  assignmentStatus: string;
  endDate: string;
  daysUntilEnd: number;
  contractEnd: string | null;
};

export type RotationBoardRankRow = {
  rank: string;
  activeCount: number;
  dueOffSoonCount: number;
  overdueCount: number;
  replacementDemandCount: number;
  pipelineCount: number;
  totalNeedCount: number;
  dueOffSoon: RotationDueOffItem[];
  overdue: RotationDueOffItem[];
  suggestions: RotationSuggestion[];
  warnings: string[];
};

export type RotationBoardVessel = {
  vesselId: string;
  vesselName: string;
  vesselType: string;
  principalId: string | null;
  principalName: string | null;
  rows: RotationBoardRankRow[];
  summary: {
    activeCount: number;
    dueOffSoonCount: number;
    overdueCount: number;
    replacementDemandCount: number;
    pipelineCount: number;
    totalNeedCount: number;
  };
  warnings: string[];
};

function normalizeRank(value: string | null | undefined): string {
  if (!value) return "";
  return value.trim().toUpperCase();
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, parsed);
}

function getDueOffDaysThreshold(): number {
  return parsePositiveInt(process.env.HGI_ROTATION_DUE_OFF_DAYS, 30);
}

function getOverdueGraceDays(): number {
  return parsePositiveInt(process.env.HGI_ROTATION_OVERDUE_GRACE_DAYS, 0);
}

function diffDays(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function isDueOffSoon(endDate: Date | null, now: Date, threshold: number): boolean {
  if (!endDate) return false;
  const days = diffDays(now, endDate);
  return days >= 0 && days <= threshold;
}

function isOverdue(endDate: Date | null, now: Date, graceDays: number): boolean {
  if (!endDate) return false;
  const overdueFrom = new Date(endDate.getTime() + graceDays * 24 * 60 * 60 * 1000);
  return overdueFrom.getTime() < now.getTime();
}

function buildRankMap(rows: string[]): Map<string, RotationBoardRankRow> {
  const map = new Map<string, RotationBoardRankRow>();
  for (const rank of rows) {
    if (!map.has(rank)) {
      map.set(rank, {
        rank,
        activeCount: 0,
        dueOffSoonCount: 0,
        overdueCount: 0,
        replacementDemandCount: 0,
        pipelineCount: 0,
        totalNeedCount: 0,
        dueOffSoon: [],
        overdue: [],
        suggestions: [],
        warnings: [],
      });
    }
  }
  return map;
}

export async function buildRotationBoard(input?: { vesselId?: string }): Promise<RotationBoardVessel[]> {
  const now = new Date();
  const dueOffDays = getDueOffDaysThreshold();
  const overdueGraceDays = getOverdueGraceDays();

  const vessels = await prisma.vessel.findMany({
    where: {
      status: "ACTIVE",
      ...(input?.vesselId ? { id: input.vesselId } : {}),
    },
    select: {
      id: true,
      name: true,
      type: true,
      principalId: true,
      principal: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  if (vessels.length === 0) return [];

  const vesselIds = vessels.map((v) => v.id);

  const assignments = await prisma.assignment.findMany({
    where: {
      vesselId: { in: vesselIds },
      status: { in: [...ACTIVE_ASSIGNMENT_STATUSES] },
    },
    select: {
      id: true,
      vesselId: true,
      crewId: true,
      rank: true,
      status: true,
      startDate: true,
      endDate: true,
      crew: { select: { id: true, fullName: true, rank: true, status: true } },
    },
  });

  const activeAssignments = assignments.filter((assignment) => isActiveAssignmentStatus(assignment.status));
  const assignmentCrewIds = Array.from(new Set(activeAssignments.map((assignment) => assignment.crewId)));

  const contracts = await prisma.employmentContract.findMany({
    where: {
      crewId: { in: assignmentCrewIds },
      status: "ACTIVE",
    },
    select: {
      crewId: true,
      vesselId: true,
      contractEnd: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const replacements = await prisma.crewReplacement.findMany({
    where: {
      status: { in: ["PENDING", "APPROVED"] satisfies ReplacementStatus[] },
    },
    select: {
      id: true,
      status: true,
      crew: {
        select: {
          id: true,
          fullName: true,
          rank: true,
          assignments: {
            where: { status: { in: [...ACTIVE_ASSIGNMENT_STATUSES] } },
            select: { id: true, vesselId: true, rank: true, status: true },
            orderBy: { startDate: "desc" },
            take: 2,
          },
        },
      },
    },
  });

  const prepareJoinings = await prisma.prepareJoining.findMany({
    where: {
      vesselId: { in: vesselIds },
      status: { in: [...ACTIVE_PREPARE_JOINING_STATUSES] },
    },
    select: {
      vesselId: true,
      status: true,
      crew: { select: { rank: true } },
    },
  });

  const contractsByCrewVessel = new Map<string, string>();
  for (const contract of contracts) {
    if (!contract.vesselId) continue;
    const key = `${contract.crewId}:${contract.vesselId}`;
    if (!contractsByCrewVessel.has(key)) {
      contractsByCrewVessel.set(key, contract.contractEnd.toISOString());
    }
  }

  const assignmentByVessel = new Map<string, typeof activeAssignments>();
  const ranksNeeded = new Set<string>();
  for (const assignment of activeAssignments) {
    const current = assignmentByVessel.get(assignment.vesselId) ?? [];
    current.push(assignment);
    assignmentByVessel.set(assignment.vesselId, current);
    const normalized = normalizeRank(assignment.rank || assignment.crew.rank);
    if (normalized) ranksNeeded.add(normalized);
  }

  const replacementDemandByVesselRank = new Map<string, Map<string, number>>();
  const replacementWarningsByVessel = new Map<string, string[]>();
  const unresolvedReplacementWarnings: string[] = [];

  for (const replacement of replacements) {
    const activeLinks = replacement.crew.assignments;
    if (activeLinks.length !== 1) {
      const reason =
        activeLinks.length === 0
          ? "no active assignment"
          : "multiple active assignments";
      unresolvedReplacementWarnings.push(
        `Replacement ${replacement.id} (${replacement.crew.fullName}) is ambiguous: ${reason}.`
      );
      continue;
    }

    const linked = activeLinks[0];
    if (!isActiveAssignmentStatus(linked.status)) {
      unresolvedReplacementWarnings.push(
        `Replacement ${replacement.id} (${replacement.crew.fullName}) is ambiguous: linked assignment is not active.`
      );
      continue;
    }

    const rank = normalizeRank(linked.rank || replacement.crew.rank);
    if (!rank) {
      unresolvedReplacementWarnings.push(
        `Replacement ${replacement.id} (${replacement.crew.fullName}) is ambiguous: missing rank.`
      );
      continue;
    }

    ranksNeeded.add(rank);
    const byRank = replacementDemandByVesselRank.get(linked.vesselId) ?? new Map<string, number>();
    byRank.set(rank, (byRank.get(rank) ?? 0) + 1);
    replacementDemandByVesselRank.set(linked.vesselId, byRank);
  }

  const prepareJoiningByVesselRank = new Map<string, Map<string, number>>();
  for (const record of prepareJoinings) {
    if (!record.vesselId) continue;
    const rank = normalizeRank(record.crew.rank);
    if (!rank) continue;
    ranksNeeded.add(rank);
    const byRank = prepareJoiningByVesselRank.get(record.vesselId) ?? new Map<string, number>();
    byRank.set(rank, (byRank.get(rank) ?? 0) + 1);
    prepareJoiningByVesselRank.set(record.vesselId, byRank);
  }

  const rankList = Array.from(ranksNeeded);
  const potentialCandidates =
    rankList.length === 0
      ? []
      : await prisma.crew.findMany({
          where: {
            rank: { in: rankList },
            status: "STANDBY",
          },
          select: {
            id: true,
            fullName: true,
            rank: true,
            status: true,
          },
          orderBy: { fullName: "asc" },
        });

  const candidateIds = potentialCandidates.map((candidate) => candidate.id);
  const candidateActiveAssignments =
    candidateIds.length === 0
      ? []
      : await prisma.assignment.findMany({
          where: {
            crewId: { in: candidateIds },
            status: { in: [...ACTIVE_ASSIGNMENT_STATUSES] },
          },
          select: {
            crewId: true,
            status: true,
          },
        });

  const busyCandidateIds = new Set<string>();
  for (const assignment of candidateActiveAssignments) {
    if (isActiveAssignmentStatus(assignment.status)) {
      busyCandidateIds.add(assignment.crewId);
    }
  }

  const availableCandidates = potentialCandidates.filter((candidate) => !busyCandidateIds.has(candidate.id));
  const suggestionsByRank = new Map<string, RotationSuggestion[]>();
  for (const candidate of availableCandidates) {
    const rank = normalizeRank(candidate.rank);
    if (!rank) continue;
    const current = suggestionsByRank.get(rank) ?? [];
    current.push({
      crewId: candidate.id,
      crewName: candidate.fullName,
      rank,
      crewStatus: candidate.status,
    });
    suggestionsByRank.set(rank, current);
  }

  const result: RotationBoardVessel[] = [];

  for (const vessel of vessels) {
    const vesselAssignments = assignmentByVessel.get(vessel.id) ?? [];
    const rankSet = new Set<string>();
    for (const assignment of vesselAssignments) {
      const rank = normalizeRank(assignment.rank || assignment.crew.rank);
      if (rank) rankSet.add(rank);
    }

    const replacementByRank = replacementDemandByVesselRank.get(vessel.id) ?? new Map<string, number>();
    for (const rank of replacementByRank.keys()) {
      rankSet.add(rank);
    }

    const pipelineByRank = prepareJoiningByVesselRank.get(vessel.id) ?? new Map<string, number>();
    for (const rank of pipelineByRank.keys()) {
      rankSet.add(rank);
    }

    const rows = buildRankMap(Array.from(rankSet));

    for (const assignment of vesselAssignments) {
      const rank = normalizeRank(assignment.rank || assignment.crew.rank);
      if (!rank) continue;
      const row = rows.get(rank);
      if (!row) continue;

      row.activeCount += 1;

      if (!assignment.endDate) continue;

      const item: RotationDueOffItem = {
        assignmentId: assignment.id,
        crewId: assignment.crew.id,
        crewName: assignment.crew.fullName,
        rank,
        assignmentStatus: assignment.status,
        endDate: assignment.endDate.toISOString(),
        daysUntilEnd: diffDays(now, assignment.endDate),
        contractEnd: contractsByCrewVessel.get(`${assignment.crewId}:${assignment.vesselId}`) ?? null,
      };

      if (isDueOffSoon(assignment.endDate, now, dueOffDays)) {
        row.dueOffSoonCount += 1;
        row.dueOffSoon.push(item);
      }

      if (isOverdue(assignment.endDate, now, overdueGraceDays)) {
        row.overdueCount += 1;
        row.overdue.push(item);
      }
    }

    for (const [rank, count] of replacementByRank.entries()) {
      const row = rows.get(rank);
      if (!row) continue;
      row.replacementDemandCount = count;
    }

    for (const [rank, count] of pipelineByRank.entries()) {
      const row = rows.get(rank);
      if (!row) continue;
      row.pipelineCount = count;
    }

    for (const [rank, row] of rows.entries()) {
      const demandFromAssignments = row.dueOffSoonCount + row.overdueCount;
      row.totalNeedCount = Math.max(demandFromAssignments, row.replacementDemandCount);
      row.suggestions = (suggestionsByRank.get(rank) ?? []).slice(0, 5);
      if (row.totalNeedCount > 0 && row.suggestions.length === 0) {
        row.warnings.push(`No standby same-rank candidates currently available for ${rank}.`);
      }
    }

    const vesselWarnings = [...unresolvedReplacementWarnings];
    replacementWarningsByVessel.set(vessel.id, vesselWarnings);

    const orderedRows = Array.from(rows.values()).sort((a, b) => a.rank.localeCompare(b.rank));
    const summary = orderedRows.reduce(
      (acc, row) => {
        acc.activeCount += row.activeCount;
        acc.dueOffSoonCount += row.dueOffSoonCount;
        acc.overdueCount += row.overdueCount;
        acc.replacementDemandCount += row.replacementDemandCount;
        acc.pipelineCount += row.pipelineCount;
        acc.totalNeedCount += row.totalNeedCount;
        return acc;
      },
      {
        activeCount: 0,
        dueOffSoonCount: 0,
        overdueCount: 0,
        replacementDemandCount: 0,
        pipelineCount: 0,
        totalNeedCount: 0,
      }
    );

    result.push({
      vesselId: vessel.id,
      vesselName: vessel.name,
      vesselType: vessel.type,
      principalId: vessel.principalId,
      principalName: vessel.principal?.name ?? null,
      rows: orderedRows,
      summary,
      warnings: replacementWarningsByVessel.get(vessel.id) ?? [],
    });
  }

  return result;
}
