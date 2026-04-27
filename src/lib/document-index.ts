import { readFile } from "fs/promises";
import path from "path";

export const HGI_DOCUMENT_AUDIT_INVENTORY_PATH = path.join(
  process.cwd(),
  "docs/hgi-document-audit/output/inventory.json"
);

export const HGI_DOCUMENT_AUDIT_SOURCE_DATASET = "docs/hgi-document-audit/output/inventory.json";

export type HgiInventoryItem = {
  relative_path: string;
  absolute_path: string;
  file_name: string;
  normalized_filename?: string;
  extension?: string;
  size_bytes?: number;
  modified_time?: string;
  root_folder?: string;
  category?: string;
  review_flag?: string;
};

type HgiInventoryPayload = {
  inventory?: HgiInventoryItem[];
};

export async function loadHgiInventory(): Promise<HgiInventoryItem[]> {
  const raw = await readFile(HGI_DOCUMENT_AUDIT_INVENTORY_PATH, "utf8");
  const parsed = JSON.parse(raw) as HgiInventoryPayload;

  if (!Array.isArray(parsed.inventory)) {
    throw new Error("Invalid HGI inventory payload: expected inventory array");
  }

  return parsed.inventory.filter(
    (item): item is HgiInventoryItem =>
      Boolean(item?.relative_path && item?.absolute_path && item?.file_name)
  );
}
