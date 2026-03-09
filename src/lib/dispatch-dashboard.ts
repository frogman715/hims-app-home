import { prisma } from "@/lib/prisma";

export const DISPATCH_DASHBOARD_STATUSES = [
  "DISPATCHED",
  "PICKUP_IN_PROGRESS",
  "AT_AIRPORT",
  "CHECKIN_ASSISTED",
  "COMPLETED",
] as const;

export type DispatchDashboardStatus = (typeof DISPATCH_DASHBOARD_STATUSES)[number];

type DispatchRecord = {
  id: string;
  crewId: string;
  vesselId: string | null;
  dispatchDate: string;
  port: string;
  flightNumber: string | null;
  status: string;
  statusBucket: DispatchDashboardStatus | "UNKNOWN";
  remarks: string | null;
  crewName: string;
  crewRank: string;
  createdAt: string;
  updatedAt: string;
};

type DispatchStatusDistribution = Record<DispatchDashboardStatus, number>;

export type DispatchDashboardData = {
  generatedAt: string;
  period: {
    todayStart: string;
    todayEnd: string;
    weekStart: string;
    weekEnd: string;
  };
  summary: {
    todayTotal: number;
    weekTotal: number;
    delayedTotal: number;
    overduePickupTotal: number;
  };
  distribution: {
    today: DispatchStatusDistribution;
    week: DispatchStatusDistribution;
  };
  todayDispatches: DispatchRecord[];
  weekDispatches: DispatchRecord[];
  delayedDispatches: DispatchRecord[];
  overduePickupDispatches: DispatchRecord[];
  warnings: string[];
  unknownStatusCounts: Record<string, number>;
};

function toDistributionSeed(): DispatchStatusDistribution {
  return {
    DISPATCHED: 0,
    PICKUP_IN_PROGRESS: 0,
    AT_AIRPORT: 0,
    CHECKIN_ASSISTED: 0,
    COMPLETED: 0,
  };
}

function normalizeStatus(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

function toStatusBucket(status: string): DispatchDashboardStatus | "UNKNOWN" {
  if (status === "PICKUP_COMPLETED") {
    return "PICKUP_IN_PROGRESS";
  }

  if ((DISPATCH_DASHBOARD_STATUSES as readonly string[]).includes(status)) {
    return status as DispatchDashboardStatus;
  }

  return "UNKNOWN";
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isBetween(value: Date, start: Date, end: Date): boolean {
  return value >= start && value <= end;
}

export async function buildDispatchDashboard(): Promise<DispatchDashboardData> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = todayStart;
  const weekEnd = endOfDay(addDays(todayStart, 6));

  const dispatches = await prisma.dispatch.findMany({
    where: {
      dispatchDate: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    include: {
      crew: {
        select: {
          fullName: true,
          rank: true,
        },
      },
    },
    orderBy: {
      dispatchDate: "asc",
    },
  });

  const overdueCandidates = await prisma.dispatch.findMany({
    where: {
      dispatchDate: {
        lt: todayStart,
      },
      status: {
        not: "COMPLETED",
      },
    },
    include: {
      crew: {
        select: {
          fullName: true,
          rank: true,
        },
      },
    },
    orderBy: {
      dispatchDate: "asc",
    },
  });

  const unknownStatusCounts: Record<string, number> = {};
  const distributionToday = toDistributionSeed();
  const distributionWeek = toDistributionSeed();

  const mapRecord = (
    item: (typeof dispatches)[number] | (typeof overdueCandidates)[number]
  ): DispatchRecord => {
    const normalized = normalizeStatus(item.status);
    const statusBucket = toStatusBucket(normalized);

    if (statusBucket === "UNKNOWN") {
      unknownStatusCounts[normalized || "EMPTY"] =
        (unknownStatusCounts[normalized || "EMPTY"] ?? 0) + 1;
    }

    return {
      id: item.id,
      crewId: item.crewId,
      vesselId: item.vesselId,
      dispatchDate: item.dispatchDate.toISOString(),
      port: item.port,
      flightNumber: item.flightNumber,
      status: normalized || "UNKNOWN",
      statusBucket,
      remarks: item.remarks,
      crewName: item.crew.fullName,
      crewRank: item.crew.rank,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  };

  const weekDispatches = dispatches.map(mapRecord);
  const todayDispatches = weekDispatches.filter((item) =>
    isBetween(new Date(item.dispatchDate), todayStart, todayEnd)
  );

  const delayedDispatches = overdueCandidates.map(mapRecord);
  const overduePickupDispatches = delayedDispatches.filter((item) =>
    item.statusBucket === "DISPATCHED" || item.statusBucket === "PICKUP_IN_PROGRESS"
  );

  for (const item of todayDispatches) {
    if (item.statusBucket !== "UNKNOWN") {
      distributionToday[item.statusBucket] += 1;
    }
  }

  for (const item of weekDispatches) {
    if (item.statusBucket !== "UNKNOWN") {
      distributionWeek[item.statusBucket] += 1;
    }
  }

  const warnings: string[] = [];
  const unknownStatuses = Object.keys(unknownStatusCounts);
  if (unknownStatuses.length > 0) {
    warnings.push(
      `Unknown dispatch statuses detected and excluded from distribution: ${unknownStatuses.join(", ")}.`
    );
  }

  return {
    generatedAt: now.toISOString(),
    period: {
      todayStart: todayStart.toISOString(),
      todayEnd: todayEnd.toISOString(),
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
    },
    summary: {
      todayTotal: todayDispatches.length,
      weekTotal: weekDispatches.length,
      delayedTotal: delayedDispatches.length,
      overduePickupTotal: overduePickupDispatches.length,
    },
    distribution: {
      today: distributionToday,
      week: distributionWeek,
    },
    todayDispatches,
    weekDispatches,
    delayedDispatches,
    overduePickupDispatches,
    warnings,
    unknownStatusCounts,
  };
}

