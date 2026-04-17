import fs from "fs";
import path from "path";
import { getUploadBaseDir } from "@/lib/upload-path";

const CREW_CODE_PREFIX = "HGI-CRW-";
const CREW_FOLDER_SEGMENTS = ["passport", "seamanbook", "certificates", "medical", "visa"] as const;

export type CrewDocumentFolder = (typeof CREW_FOLDER_SEGMENTS)[number];

export function mapDocumentTypeToFolder(docType: string): CrewDocumentFolder {
  const normalized = docType.trim().toUpperCase();

  if (normalized.includes("PASSPORT")) return "passport";
  if (normalized.includes("SEAMAN_BOOK") || normalized.includes("SEAMAN BOOK")) return "seamanbook";
  if (
    normalized.includes("MEDICAL") ||
    normalized.includes("YELLOW_FEVER") ||
    normalized.includes("CHOLERA") ||
    normalized.includes("DRUG_ALCOHOL")
  ) {
    return "medical";
  }
  if (normalized.includes("VISA")) return "visa";
  return "certificates";
}

export function parseCrewCodeNumber(crewCode: string | null | undefined): number {
  if (!crewCode) return 0;
  const match = crewCode.match(/HGI-CRW-(\d{4,})$/);
  return match ? Number(match[1]) : 0;
}

export function formatCrewCode(sequence: number): string {
  return `${CREW_CODE_PREFIX}${String(sequence).padStart(4, "0")}`;
}

export async function generateNextCrewCode(
  fetchLatest: () => Promise<{ crewCode: string | null } | null>
): Promise<string> {
  const latest = await fetchLatest();
  const next = parseCrewCodeNumber(latest?.crewCode) + 1;
  return formatCrewCode(next);
}

export function ensureCrewDigitalFolders(crewId: string): string {
  const root = path.join(getUploadBaseDir(), "crew-files", crewId);
  for (const segment of CREW_FOLDER_SEGMENTS) {
    fs.mkdirSync(path.join(root, segment), { recursive: true });
  }
  return root;
}
