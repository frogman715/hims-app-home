#!/usr/bin/env node

import path from "node:path";
import { promises as fs } from "node:fs";

const DEFAULT_SHARE_ROOT = "/mnt/hdd/HGI";
const PROJECT_ROOT = "/home/jayapura/hgi-document-audit";
const OUTPUT_DIR = path.join(PROJECT_ROOT, "output");

const ROOT_FOLDER_CATEGORY_MAP = new Map([
  ["00_SYSTEM", "system"],
  ["01_SCAN DOCS", "inbox_scan"],
  ["02_OPERATIONAL", "operational"],
  ["03_ACCOUNTING", "accounting"],
  ["04_DOCUMENT", "crew_document"],
  ["05_IMRON", "legacy_or_owner_review"],
  ["06_LEGAL", "legal"],
  ["99_ARCHIVE", "archive"],
  ["AUDIT INTERGIS", "audit_compliance"],
  ["closing deficiency", "audit_deficiency"],
  ["CREW REPLACEMENT PLAN", "operational_planning"],
  ["HANMARINE GLOBAL INDONESIA", "company_general"],
  ["HANMARINE REQUEST CREW", "crew_request"],
  ["PENGANTAR MCU", "medical_mcu"],
]);

const OUTPUT_FILES = {
  inventoryJson: path.join(OUTPUT_DIR, "inventory.json"),
  inventoryCsv: path.join(OUTPUT_DIR, "inventory.csv"),
  rootFilesReviewCsv: path.join(OUTPUT_DIR, "root-files-review.csv"),
  duplicateCandidatesCsv: path.join(OUTPUT_DIR, "duplicate-candidates.csv"),
  folderCategoryMapCsv: path.join(OUTPUT_DIR, "folder-category-map.csv"),
};

function assertSafeOutputPath(targetPath) {
  const resolved = path.resolve(targetPath);
  const allowedRoot = `${path.resolve(OUTPUT_DIR)}${path.sep}`;
  if (!resolved.startsWith(allowedRoot) && resolved !== path.resolve(OUTPUT_DIR)) {
    throw new Error(`Unsafe output path blocked: ${targetPath}`);
  }
}

function normalizeFilename(filename) {
  return filename
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getExtension(filename) {
  return path.extname(filename).toLowerCase();
}

function toPosixRelative(rootPath, targetPath) {
  const relative = path.relative(rootPath, targetPath);
  return relative === "" ? "." : relative.split(path.sep).join("/");
}

function csvEscape(value) {
  const stringValue = value == null ? "" : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function toCsv(rows, headers) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

async function writeOutputFile(targetPath, content) {
  assertSafeOutputPath(targetPath);
  await fs.writeFile(targetPath, content, "utf8");
}

async function main() {
  const shareRoot = path.resolve(process.env.HGI_SHARE_ROOT || DEFAULT_SHARE_ROOT);

  if (shareRoot !== DEFAULT_SHARE_ROOT) {
    throw new Error(`Refusing unexpected HGI_SHARE_ROOT: ${shareRoot}`);
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const inventory = [];
  const rootFilesReview = [];
  const folderCategoryMap = [];
  const duplicateGroups = new Map();
  const counters = {
    foldersScanned: 0,
    filesScanned: 0,
    rootFilesNeedingReview: 0,
    symlinksSkipped: 0,
    errors: 0,
  };
  const scanErrors = [];

  async function scanDirectory(currentDir, topLevelFolder = null) {
    let dirEntries;
    try {
      dirEntries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch (error) {
      counters.errors += 1;
      scanErrors.push({
        path: toPosixRelative(shareRoot, currentDir),
        error: error.message,
      });
      return;
    }

    counters.foldersScanned += 1;
    dirEntries.sort((a, b) => a.name.localeCompare(b.name, "en"));

    for (const entry of dirEntries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = toPosixRelative(shareRoot, fullPath);
      const isAtRoot = currentDir === shareRoot;
      const entryTopLevelFolder = isAtRoot && entry.isDirectory() ? entry.name : topLevelFolder;

      let stats;
      try {
        stats = await fs.lstat(fullPath);
      } catch (error) {
        counters.errors += 1;
        scanErrors.push({ path: relativePath, error: error.message });
        continue;
      }

      if (stats.isSymbolicLink()) {
        counters.symlinksSkipped += 1;
        continue;
      }

      if (stats.isDirectory()) {
        if (isAtRoot) {
          folderCategoryMap.push({
            root_folder: entry.name,
            category: ROOT_FOLDER_CATEGORY_MAP.get(entry.name) || "uncategorized",
            recognized: ROOT_FOLDER_CATEGORY_MAP.has(entry.name) ? "yes" : "no",
            relative_path: relativePath,
          });
        }
        await scanDirectory(fullPath, entryTopLevelFolder);
        continue;
      }

      if (!stats.isFile()) {
        continue;
      }

      counters.filesScanned += 1;

      const ext = getExtension(entry.name);
      const normalizedFilename = normalizeFilename(entry.name);
      const category = entryTopLevelFolder
        ? ROOT_FOLDER_CATEGORY_MAP.get(entryTopLevelFolder) || "uncategorized"
        : "NEEDS_REVIEW_ROOT_FILE";
      const reviewFlag = isAtRoot ? "NEEDS_REVIEW_ROOT_FILE" : "";

      const record = {
        relative_path: relativePath,
        absolute_path: fullPath,
        file_name: entry.name,
        normalized_filename: normalizedFilename,
        extension: ext,
        size_bytes: stats.size,
        modified_time: stats.mtime.toISOString(),
        root_folder: entryTopLevelFolder || "",
        category,
        review_flag: reviewFlag,
      };

      inventory.push(record);

      if (isAtRoot) {
        counters.rootFilesNeedingReview += 1;
        rootFilesReview.push({
          relative_path: relativePath,
          file_name: entry.name,
          extension: ext,
          size_bytes: stats.size,
          modified_time: stats.mtime.toISOString(),
          review_flag: "NEEDS_REVIEW_ROOT_FILE",
        });
      }

      const duplicateKey = `${normalizedFilename}|||${stats.size}|||${ext}`;
      if (!duplicateGroups.has(duplicateKey)) {
        duplicateGroups.set(duplicateKey, []);
      }
      duplicateGroups.get(duplicateKey).push(record);
    }
  }

  const rootStats = await fs.lstat(shareRoot);
  if (!rootStats.isDirectory()) {
    throw new Error(`HGI share root is not a directory: ${shareRoot}`);
  }

  await scanDirectory(shareRoot);

  inventory.sort((a, b) => a.relative_path.localeCompare(b.relative_path, "en"));
  rootFilesReview.sort((a, b) => a.relative_path.localeCompare(b.relative_path, "en"));
  folderCategoryMap.sort((a, b) => a.root_folder.localeCompare(b.root_folder, "en"));

  const duplicateCandidates = [];
  for (const records of duplicateGroups.values()) {
    if (records.length < 2) {
      continue;
    }
    const sample = records[0];
    for (const record of records.sort((a, b) => a.relative_path.localeCompare(b.relative_path, "en"))) {
      duplicateCandidates.push({
        duplicate_key: `${sample.normalized_filename}|${sample.size_bytes}|${sample.extension}`,
        normalized_filename: sample.normalized_filename,
        extension: sample.extension,
        size_bytes: sample.size_bytes,
        match_count: records.length,
        relative_path: record.relative_path,
        category: record.category,
        root_folder: record.root_folder,
      });
    }
  }

  await writeOutputFile(
    OUTPUT_FILES.inventoryJson,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        share_root: shareRoot,
        safety_mode: "read_only_scan_only",
        summary: {
          folders_scanned: counters.foldersScanned,
          files_scanned: counters.filesScanned,
          root_files_needing_review: counters.rootFilesNeedingReview,
          duplicate_candidate_groups:
            new Set(duplicateCandidates.map((row) => row.duplicate_key)).size,
          duplicate_candidate_files: duplicateCandidates.length,
          symlinks_skipped: counters.symlinksSkipped,
          errors: counters.errors,
        },
        folder_category_map: folderCategoryMap,
        root_files_review: rootFilesReview,
        inventory,
        duplicate_candidates: duplicateCandidates,
        scan_errors: scanErrors,
      },
      null,
      2,
    ),
  );

  await writeOutputFile(
    OUTPUT_FILES.inventoryCsv,
    toCsv(inventory, [
      "relative_path",
      "absolute_path",
      "file_name",
      "normalized_filename",
      "extension",
      "size_bytes",
      "modified_time",
      "root_folder",
      "category",
      "review_flag",
    ]),
  );

  await writeOutputFile(
    OUTPUT_FILES.rootFilesReviewCsv,
    toCsv(rootFilesReview, [
      "relative_path",
      "file_name",
      "extension",
      "size_bytes",
      "modified_time",
      "review_flag",
    ]),
  );

  await writeOutputFile(
    OUTPUT_FILES.duplicateCandidatesCsv,
    toCsv(duplicateCandidates, [
      "duplicate_key",
      "normalized_filename",
      "extension",
      "size_bytes",
      "match_count",
      "relative_path",
      "category",
      "root_folder",
    ]),
  );

  await writeOutputFile(
    OUTPUT_FILES.folderCategoryMapCsv,
    toCsv(folderCategoryMap, [
      "root_folder",
      "category",
      "recognized",
      "relative_path",
    ]),
  );

  console.log(`HGI audit complete for ${shareRoot}`);
  console.log(`Folders scanned: ${counters.foldersScanned}`);
  console.log(`Files scanned: ${counters.filesScanned}`);
  console.log(`Root files needing review: ${counters.rootFilesNeedingReview}`);
  console.log(
    `Duplicate candidate groups: ${new Set(duplicateCandidates.map((row) => row.duplicate_key)).size}`,
  );
  console.log(`Duplicate candidate file rows: ${duplicateCandidates.length}`);
  console.log(`Symlinks skipped: ${counters.symlinksSkipped}`);
  console.log(`Errors: ${counters.errors}`);
  console.log(`Outputs written to: ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(`Audit failed: ${error.message}`);
  process.exitCode = 1;
});
