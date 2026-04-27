import { prisma } from "./prisma";
import {
  HGI_DOCUMENT_AUDIT_SOURCE_DATASET,
  loadHgiInventory,
  type HgiInventoryItem,
} from "./document-index";

const IMPORT_CHUNK_SIZE = 200;

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNullableInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  if (value > 2147483647 || value < -2147483648) {
    return null;
  }

  return Math.trunc(value);
}

function toNullableDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mapInventoryItem(item: HgiInventoryItem) {
  return {
    sourceDataset: HGI_DOCUMENT_AUDIT_SOURCE_DATASET,
    originalRelativePath: item.relative_path,
    originalAbsolutePath: item.absolute_path,
    fileName: item.file_name,
    normalizedFilename: toNullableString(item.normalized_filename),
    extension: toNullableString(item.extension),
    sizeBytes: toNullableInt(item.size_bytes),
    modifiedTime: toNullableDate(item.modified_time),
    rootFolder: toNullableString(item.root_folder),
    category: toNullableString(item.category),
    reviewFlag: toNullableString(item.review_flag),
  };
}

export async function importHgiDocumentIndex() {
  const inventory = await loadHgiInventory();

  let processed = 0;

  for (let index = 0; index < inventory.length; index += IMPORT_CHUNK_SIZE) {
    const chunk = inventory.slice(index, index + IMPORT_CHUNK_SIZE);

    await prisma.$transaction(
      chunk.map((item) => {
        const data = mapInventoryItem(item);

        return prisma.documentIndex.upsert({
          where: {
            originalRelativePath: data.originalRelativePath,
          },
          create: data,
          update: data,
        });
      })
    );

    processed += chunk.length;
  }

  const total = await prisma.documentIndex.count({
    where: {
      sourceDataset: HGI_DOCUMENT_AUDIT_SOURCE_DATASET,
    },
  });

  return {
    imported: processed,
    total,
  };
}
