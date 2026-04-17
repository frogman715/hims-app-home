import { DOCUMENT_TYPES, getDocumentTypeLabel } from "@/lib/document-types";

type CrewDocumentSnapshot = {
  id: string;
  docType: string;
  docNumber?: string | null;
  expiryDate: Date | null;
};

type PrepareJoiningSnapshot = {
  id: string;
  status: string;
  departureDate: Date | null;
  medicalExpiry: Date | null;
  vaccineExpiryDate: Date | null;
  passportValid: boolean;
  seamanBookValid: boolean;
  certificatesValid: boolean;
  medicalValid: boolean;
  visaValid: boolean;
  orientationCompleted: boolean;
  mcuCompleted: boolean;
  ticketBooked: boolean;
  hotelBooked: boolean;
  transportArranged: boolean;
  safetyLifeJacket: boolean;
  workUniform: boolean;
  personalPassport: boolean;
  vesselStatroomAssigned: boolean;
  vesselContractSigned: boolean;
  preDepartureDocCheck: boolean;
  preDepartureMedicalOK: boolean;
  preDepartureFinalCheck: boolean;
  crew: {
    id: string;
    crewCode?: string | null;
    crewStatus?: string | null;
    fullName: string;
    rank: string;
    nationality: string | null;
  };
  vessel: {
    id: string;
    name: string;
  } | null;
  principal: {
    id: string;
    name: string;
  } | null;
};

export type DocumentAlertSeverity = "expired" | "critical" | "warning" | "notice" | "monitor";
export type ReadinessBand = "READY" | "WATCH" | "BLOCKED";

export type DocumentAlert = {
  id: string;
  docType: string;
  docLabel: string;
  docNumber: string | null;
  expiryDate: Date | null;
  daysUntilExpiry: number | null;
  severity: DocumentAlertSeverity;
};

export type CrewReadinessAssessment = {
  prepareJoiningId: string;
  crewId: string;
  crewCode: string | null;
  crewName: string;
  rank: string;
  nationality: string | null;
  crewStatus: string | null;
  status: string;
  vesselName: string | null;
  principalName: string | null;
  departureDate: Date | null;
  readinessBand: ReadinessBand;
  readinessScore: number;
  blockers: string[];
  warnings: string[];
  completedChecks: number;
  totalChecks: number;
  expiringDocuments: DocumentAlert[];
  assignmentRisk: {
    level: "normal" | "elevated";
    reasons: string[];
  };
};

const documentCategoryMap = new Map(DOCUMENT_TYPES.map((item) => [item.value, item.category]));

function startOfDay(value: Date): Date {
  const normalized = new Date(value);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export function calculateDaysUntil(targetDate: Date, now: Date = new Date()): number {
  const diffMs = startOfDay(targetDate).getTime() - startOfDay(now).getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function getDocumentAlertSeverity(daysUntilExpiry: number): DocumentAlertSeverity {
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry <= 30) return "critical";
  if (daysUntilExpiry <= 90) return "warning";
  if (daysUntilExpiry <= 180) return "notice";
  return "monitor";
}

export function buildDocumentAlert(
  document: CrewDocumentSnapshot,
  now: Date = new Date()
): DocumentAlert {
  const daysUntilExpiry = document.expiryDate ? calculateDaysUntil(document.expiryDate, now) : null;
  return {
    id: document.id,
    docType: document.docType,
    docLabel: getDocumentTypeLabel(document.docType),
    docNumber: document.docNumber ?? null,
    expiryDate: document.expiryDate,
    daysUntilExpiry,
    severity: daysUntilExpiry === null ? "monitor" : getDocumentAlertSeverity(daysUntilExpiry),
  };
}

export function getExpiringDocumentAlerts(
  documents: CrewDocumentSnapshot[],
  now: Date = new Date(),
  maxDays: number = 180
): DocumentAlert[] {
  return documents
    .filter((document) => document.expiryDate)
    .map((document) => buildDocumentAlert(document, now))
    .filter((alert) => alert.daysUntilExpiry !== null && alert.daysUntilExpiry <= maxDays)
    .sort((left, right) => {
      if (left.daysUntilExpiry === null) return 1;
      if (right.daysUntilExpiry === null) return -1;
      return left.daysUntilExpiry - right.daysUntilExpiry;
    });
}

export function hasCriticalDocumentExpiry(alerts: DocumentAlert[]): boolean {
  return alerts.some((alert) => alert.severity === "expired" || alert.severity === "critical");
}

export function getDocumentAlertBuckets(alerts: DocumentAlert[]) {
  return alerts.reduce(
    (accumulator, alert) => {
      accumulator[alert.severity].push(alert);
      return accumulator;
    },
    {
      expired: [] as DocumentAlert[],
      critical: [] as DocumentAlert[],
      warning: [] as DocumentAlert[],
      notice: [] as DocumentAlert[],
      monitor: [] as DocumentAlert[],
    }
  );
}

function buildChecklistScore(prepareJoining: PrepareJoiningSnapshot) {
  const checks = [
    prepareJoining.passportValid,
    prepareJoining.seamanBookValid,
    prepareJoining.certificatesValid,
    prepareJoining.medicalValid,
    prepareJoining.visaValid,
    prepareJoining.orientationCompleted,
    prepareJoining.mcuCompleted,
    prepareJoining.ticketBooked,
    prepareJoining.hotelBooked,
    prepareJoining.transportArranged,
    prepareJoining.safetyLifeJacket,
    prepareJoining.workUniform,
    prepareJoining.personalPassport,
    prepareJoining.vesselStatroomAssigned,
    prepareJoining.vesselContractSigned,
    prepareJoining.preDepartureDocCheck,
    prepareJoining.preDepartureMedicalOK,
    prepareJoining.preDepartureFinalCheck,
  ];

  const completedChecks = checks.filter(Boolean).length;
  return {
    completedChecks,
    totalChecks: checks.length,
    readinessScore: Math.round((completedChecks / checks.length) * 100),
  };
}

function buildChecklistIssues(prepareJoining: PrepareJoiningSnapshot) {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!prepareJoining.passportValid) blockers.push("Passport checklist is not marked valid.");
  if (!prepareJoining.seamanBookValid) blockers.push("Seaman book checklist is not marked valid.");
  if (!prepareJoining.certificatesValid) blockers.push("Certificate checklist is not marked valid.");
  if (!prepareJoining.medicalValid) blockers.push("Medical checklist is not marked valid.");
  if (!prepareJoining.mcuCompleted) blockers.push("MCU is not completed.");
  if (!prepareJoining.orientationCompleted) warnings.push("Orientation is not completed.");
  if (!prepareJoining.ticketBooked) warnings.push("Ticket is not booked.");
  if (!prepareJoining.transportArranged) warnings.push("Transport is not arranged.");
  if (!prepareJoining.preDepartureFinalCheck) warnings.push("Final pre-departure check is not completed.");
  if (!prepareJoining.vesselContractSigned) warnings.push("Vessel contract is not signed.");

  return { blockers, warnings };
}

function buildDocumentIssues(
  alerts: DocumentAlert[],
  now: Date,
  prepareJoining: PrepareJoiningSnapshot
) {
  const blockers: string[] = [];
  const warnings: string[] = [];

  for (const alert of alerts) {
    if (alert.severity === "expired") {
      blockers.push(`${alert.docLabel} is expired.`);
    } else if (alert.severity === "critical") {
      warnings.push(`${alert.docLabel} expires within 30 days.`);
    }
  }

  if (prepareJoining.medicalExpiry) {
    const medicalDays = calculateDaysUntil(prepareJoining.medicalExpiry, now);
    if (medicalDays < 0) {
      blockers.push("Medical validity date has passed.");
    } else if (medicalDays <= 30) {
      warnings.push("Medical validity expires within 30 days.");
    }
  }

  if (prepareJoining.vaccineExpiryDate) {
    const vaccineDays = calculateDaysUntil(prepareJoining.vaccineExpiryDate, now);
    if (vaccineDays < 0) {
      warnings.push("Recorded vaccine validity date has passed.");
    } else if (vaccineDays <= 30) {
      warnings.push("Recorded vaccine validity expires within 30 days.");
    }
  }

  if (prepareJoining.departureDate) {
    const departureDays = calculateDaysUntil(prepareJoining.departureDate, now);
    if (departureDays <= 7 && blockers.length > 0) {
      blockers.push("Departure is within 7 days while blocking items remain.");
    } else if (departureDays <= 14 && (blockers.length > 0 || warnings.length > 0)) {
      warnings.push("Departure is within 14 days and readiness should be reviewed.");
    }
  }

  return { blockers, warnings };
}

export function getSuggestedTaskType(docType: string): "MCU" | "TRAINING" | "VISA" {
  const category = documentCategoryMap.get(docType);
  if (category === "health") return "MCU";
  if (docType.includes("VISA")) return "VISA";
  return "TRAINING";
}

export function assessCrewReadiness(
  prepareJoining: PrepareJoiningSnapshot,
  documents: CrewDocumentSnapshot[],
  now: Date = new Date()
): CrewReadinessAssessment {
  const expiringDocuments = getExpiringDocumentAlerts(documents, now, 180);
  const score = buildChecklistScore(prepareJoining);
  const checklistIssues = buildChecklistIssues(prepareJoining);
  const documentIssues = buildDocumentIssues(expiringDocuments, now, prepareJoining);

  const blockers = Array.from(new Set([...checklistIssues.blockers, ...documentIssues.blockers]));
  const warnings = Array.from(new Set([...checklistIssues.warnings, ...documentIssues.warnings]));

  let readinessBand: ReadinessBand = "READY";
  if (blockers.length > 0) {
    readinessBand = "BLOCKED";
  } else if (warnings.length > 0 || score.readinessScore < 85) {
    readinessBand = "WATCH";
  }

  const assignmentRiskReasons: string[] = [];
  if (prepareJoining.departureDate && calculateDaysUntil(prepareJoining.departureDate, now) <= 14) {
    assignmentRiskReasons.push("Departure is within 14 days.");
  }
  if (readinessBand === "BLOCKED") {
    assignmentRiskReasons.push("Readiness band is blocked.");
  }
  if (hasCriticalDocumentExpiry(expiringDocuments)) {
    assignmentRiskReasons.push("Critical or expired document exists.");
  }

  return {
    prepareJoiningId: prepareJoining.id,
    crewId: prepareJoining.crew.id,
    crewCode: prepareJoining.crew.crewCode ?? null,
    crewName: prepareJoining.crew.fullName,
    rank: prepareJoining.crew.rank,
    nationality: prepareJoining.crew.nationality,
    crewStatus: prepareJoining.crew.crewStatus ?? null,
    status: prepareJoining.status,
    vesselName: prepareJoining.vessel?.name ?? null,
    principalName: prepareJoining.principal?.name ?? null,
    departureDate: prepareJoining.departureDate,
    readinessBand,
    readinessScore: score.readinessScore,
    blockers,
    warnings,
    completedChecks: score.completedChecks,
    totalChecks: score.totalChecks,
    expiringDocuments,
    assignmentRisk: {
      level: assignmentRiskReasons.length > 0 ? "elevated" : "normal",
      reasons: assignmentRiskReasons,
    },
  };
}
