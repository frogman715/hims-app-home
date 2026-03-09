import type { Prisma } from "@prisma/client";
import { normalizeToUserRoles } from "@/lib/type-guards";
import { UserRole } from "@/lib/permissions";

export const ACTIVE_PREPARE_JOINING_STATUSES = [
  "PENDING",
  "DOCUMENTS",
  "MEDICAL",
  "TRAINING",
  "TRAVEL",
  "READY",
] as const;

export type ActivePrepareJoiningStatus = (typeof ACTIVE_PREPARE_JOINING_STATUSES)[number];

export type PrepareJoiningGateSnapshot = {
  status: string;
  passportValid: boolean;
  seamanBookValid: boolean;
  certificatesValid: boolean;
  medicalValid: boolean;
  mcuCompleted: boolean;
  orientationCompleted: boolean;
  orientationDate: Date | null;
  visaValid: boolean;
  ticketBooked: boolean;
  transportArranged: boolean;
  vesselContractSigned: boolean;
  preDepartureFinalCheck: boolean;
};

type PrepareJoiningClient = Pick<Prisma.TransactionClient, "prepareJoining">;

export async function ensurePrepareJoiningForAcceptedCandidate(input: {
  db: PrepareJoiningClient;
  crewId: string;
  principalId?: string | null;
  applicationId: string;
}): Promise<{ created: boolean; prepareJoiningId: string }> {
  const existing = await input.db.prepareJoining.findFirst({
    where: {
      crewId: input.crewId,
      status: {
        in: [...ACTIVE_PREPARE_JOINING_STATUSES],
      },
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (existing) {
    return { created: false, prepareJoiningId: existing.id };
  }

  const created = await input.db.prepareJoining.create({
    data: {
      crewId: input.crewId,
      principalId: input.principalId ?? null,
      status: "PENDING",
      passportValid: false,
      seamanBookValid: false,
      certificatesValid: false,
      medicalValid: false,
      visaValid: false,
      orientationCompleted: false,
      ticketBooked: false,
      hotelBooked: false,
      transportArranged: false,
      remarks: `Auto-created from accepted application ${input.applicationId}`,
    },
    select: {
      id: true,
    },
  });

  return { created: true, prepareJoiningId: created.id };
}

export function canMutateOperationalWorkflow(rawRoles: string[] | null | undefined): boolean {
  const roles = normalizeToUserRoles(rawRoles ?? []);
  return roles.includes(UserRole.DIRECTOR) || roles.includes(UserRole.OPERATIONAL);
}

export function validatePrepareJoiningTransition(input: {
  fromStatus: string;
  toStatus: string;
  record: PrepareJoiningGateSnapshot;
}): { allowed: boolean; reason?: string } {
  const from = input.fromStatus.toUpperCase();
  const to = input.toStatus.toUpperCase();

  if (from === to) return { allowed: true };
  if (from === "DISPATCHED") return { allowed: false, reason: "DISPATCHED records cannot transition to other statuses." };

  if (to === "CANCELLED") return { allowed: true };
  if (to === "DISPATCHED") {
    return { allowed: false, reason: "READY -> DISPATCHED is only allowed through dispatch creation." };
  }

  if (from === "PENDING" && to === "DOCUMENTS") return { allowed: true };

  if (from === "DOCUMENTS" && to === "MEDICAL") {
    if (!input.record.passportValid || !input.record.seamanBookValid || !input.record.certificatesValid) {
      return {
        allowed: false,
        reason: "DOCUMENTS -> MEDICAL requires passport, seaman book, and certificates to be valid.",
      };
    }
    return { allowed: true };
  }

  if (from === "MEDICAL" && to === "TRAINING") {
    if (!input.record.medicalValid || !input.record.mcuCompleted) {
      return { allowed: false, reason: "MEDICAL -> TRAINING requires medicalValid and mcuCompleted." };
    }
    return { allowed: true };
  }

  // Training can remain optional for candidates that do not require new training.
  if (from === "MEDICAL" && to === "TRAVEL") {
    if (!input.record.medicalValid || !input.record.mcuCompleted) {
      return { allowed: false, reason: "MEDICAL -> TRAVEL requires medicalValid and mcuCompleted." };
    }
    return { allowed: true };
  }

  if (from === "TRAINING" && to === "TRAVEL") {
    if (input.record.orientationDate && !input.record.orientationCompleted) {
      return {
        allowed: false,
        reason: "TRAINING -> TRAVEL requires orientationCompleted when orientationDate is set.",
      };
    }
    return { allowed: true };
  }

  if (from === "TRAVEL" && to === "READY") {
    if (
      !input.record.visaValid ||
      !input.record.ticketBooked ||
      !input.record.transportArranged ||
      !input.record.vesselContractSigned ||
      !input.record.preDepartureFinalCheck
    ) {
      return {
        allowed: false,
        reason:
          "TRAVEL -> READY requires visaValid, ticketBooked, transportArranged, vesselContractSigned, and preDepartureFinalCheck.",
      };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: `Unsupported transition ${from} -> ${to}.` };
}

export function canCreateDispatchFromPrepareJoining(record: PrepareJoiningGateSnapshot): {
  allowed: boolean;
  reason?: string;
} {
  if (record.status.toUpperCase() !== "READY") {
    return { allowed: false, reason: "Dispatch can only be created from READY prepare joining records." };
  }
  return { allowed: true };
}
