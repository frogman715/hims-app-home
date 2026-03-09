/**
 * Phase 7 compatibility config (schema-safe): vessel crew matrix requirements.
 *
 * Populate via env JSON:
 * HGI_VESSEL_MATRIX_REQUIREMENTS_JSON='{"vesselIds":{"<vesselId>":[{"rank":"MASTER","requiredCount":1}]},"vesselTypes":{"TANKER":[{"rank":"MASTER","requiredCount":1}]}}'
 */

type RawRequirement = {
  rank?: string;
  requiredCount?: number;
  requiredCertificates?: string[];
};

type RawConfig = {
  vesselIds?: Record<string, RawRequirement[]>;
  vesselTypes?: Record<string, RawRequirement[]>;
};

export type VesselMatrixRequirement = {
  rank: string;
  requiredCount: number;
  requiredCertificates: string[];
};

export type ResolvedVesselRequirements = {
  source: "vesselId" | "vesselType";
  requirements: VesselMatrixRequirement[];
};

function normalizeRank(value: string): string {
  return value.trim().toUpperCase();
}

function sanitizeRequirement(input: RawRequirement): VesselMatrixRequirement | null {
  const rank = typeof input.rank === "string" ? normalizeRank(input.rank) : "";
  const requiredCount = Number.isFinite(input.requiredCount)
    ? Math.max(0, Math.floor(Number(input.requiredCount)))
    : -1;

  if (!rank || requiredCount < 0) {
    return null;
  }

  const requiredCertificates = Array.isArray(input.requiredCertificates)
    ? input.requiredCertificates
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

  return { rank, requiredCount, requiredCertificates };
}

function parseRawConfig(): RawConfig {
  const raw = process.env.HGI_VESSEL_MATRIX_REQUIREMENTS_JSON;
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as RawConfig;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

function normalizeRequirementList(list: RawRequirement[] | undefined): VesselMatrixRequirement[] {
  if (!Array.isArray(list)) return [];

  const normalized: VesselMatrixRequirement[] = [];
  for (const item of list) {
    const cleaned = sanitizeRequirement(item);
    if (cleaned) {
      normalized.push(cleaned);
    }
  }

  return normalized;
}

export function resolveVesselRequirements(input: {
  vesselId: string;
  vesselType?: string | null;
}): ResolvedVesselRequirements | null {
  const config = parseRawConfig();

  const byVesselId = normalizeRequirementList(config.vesselIds?.[input.vesselId]);
  if (byVesselId.length > 0) {
    return { source: "vesselId", requirements: byVesselId };
  }

  const normalizedType = input.vesselType?.trim().toUpperCase();
  if (normalizedType) {
    const byVesselType = normalizeRequirementList(config.vesselTypes?.[normalizedType]);
    if (byVesselType.length > 0) {
      return { source: "vesselType", requirements: byVesselType };
    }
  }

  // Fail-closed: no inferred requirements.
  return null;
}
