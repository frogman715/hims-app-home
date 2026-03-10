import type { VesselMatrixVessel } from "@/lib/vessel-matrix";

type PrincipalVesselRecord = {
  id: string;
  name: string;
  imoNumber: string | null;
  type: string;
  flag: string;
  status: string;
  assignments?: Array<{
    id: string;
  }>;
};

type PrincipalJoiningRecord = {
  id: string;
  status: string;
  updatedAt: Date;
  departureDate: Date | null;
  departurePort: string | null;
  arrivalPort: string | null;
  flightNumber: string | null;
  ticketBooked: boolean;
  hotelBooked: boolean;
  transportArranged: boolean;
  orientationCompleted: boolean;
  visaValid: boolean;
  vesselContractSigned: boolean;
  preDepartureFinalCheck: boolean;
  crew: {
    id: string;
    fullName: string;
    rank: string;
    nationality: string | null;
  };
  vessel: {
    id: string;
    name: string;
    type: string;
    flag: string;
  } | null;
};

type PrincipalDispatchRecord = {
  id: string;
  dispatchDate: Date;
  port: string;
  flightNumber: string | null;
  status: string;
  remarks: string | null;
  updatedAt: Date;
  crew: {
    id: string;
    fullName: string;
    rank: string;
  };
  vessel: {
    id: string;
    name: string;
    type: string;
    flag: string;
  };
};

type PrincipalReplacementRecord = {
  id: string;
  reason: string;
  status: string;
  remarks: string | null;
  createdAt: Date;
  crew: {
    id: string;
    fullName: string;
    rank: string;
    assignments: Array<{
      id: string;
      rank: string;
      startDate: Date;
      endDate: Date | null;
      vessel: {
        id: string;
        name: string;
        type: string;
      };
    }>;
  };
  replacementCrew: {
    id: string;
    fullName: string;
    rank: string;
  } | null;
};

export function serializePrincipalVessel(item: PrincipalVesselRecord) {
  return {
    id: item.id,
    name: item.name,
    imoNumber: item.imoNumber,
    type: item.type,
    flag: item.flag,
    status: item.status,
    activeAssignmentCount: item.assignments?.length ?? 0,
  };
}

export function serializePrincipalVesselMatrix(item: VesselMatrixVessel) {
  return item;
}

export function serializePrincipalJoining(item: PrincipalJoiningRecord) {
  return {
    id: item.id,
    status: item.status,
    updatedAt: item.updatedAt.toISOString(),
    departureDate: item.departureDate?.toISOString() ?? null,
    departurePort: item.departurePort,
    arrivalPort: item.arrivalPort,
    flightNumber: item.flightNumber,
    readiness: {
      ticketBooked: item.ticketBooked,
      hotelBooked: item.hotelBooked,
      transportArranged: item.transportArranged,
      orientationCompleted: item.orientationCompleted,
      visaValid: item.visaValid,
      vesselContractSigned: item.vesselContractSigned,
      preDepartureFinalCheck: item.preDepartureFinalCheck,
    },
    crew: item.crew,
    vessel: item.vessel,
  };
}

export function serializePrincipalDispatch(item: PrincipalDispatchRecord) {
  return {
    id: item.id,
    dispatchDate: item.dispatchDate.toISOString(),
    port: item.port,
    flightNumber: item.flightNumber,
    status: item.status,
    remarks: item.remarks,
    updatedAt: item.updatedAt.toISOString(),
    crew: item.crew,
    vessel: item.vessel,
  };
}

export function serializePrincipalReplacement(item: PrincipalReplacementRecord) {
  const activeAssignment = item.crew.assignments[0] ?? null;

  return {
    id: item.id,
    reason: item.reason,
    status: item.status,
    remarks: item.remarks,
    createdAt: item.createdAt.toISOString(),
    crew: {
      id: item.crew.id,
      fullName: item.crew.fullName,
      rank: activeAssignment?.rank ?? item.crew.rank,
    },
    vessel: activeAssignment
      ? {
          id: activeAssignment.vessel.id,
          name: activeAssignment.vessel.name,
          type: activeAssignment.vessel.type,
        }
      : null,
    assignment: activeAssignment
      ? {
          id: activeAssignment.id,
          startDate: activeAssignment.startDate.toISOString(),
          endDate: activeAssignment.endDate?.toISOString() ?? null,
        }
      : null,
    replacementCrew: item.replacementCrew
      ? {
          id: item.replacementCrew.id,
          fullName: item.replacementCrew.fullName,
          rank: item.replacementCrew.rank,
        }
      : null,
  };
}
