/**
 * Principal-visible document allowlist (default deny).
 *
 * NOTE: Keep internal-only documents hidden unless explicitly added here.
 */

export const PRINCIPAL_ALLOWED_DOC_TYPES = new Set<string>([
  "CV",
  "PASSPORT",
  "SEAMAN_BOOK",
  "STCW_BST",
  "STCW_AFF",
  "STCW_MEFA",
  "STCW_SCRB",
  "COP_TANKER",
  "DEPHUB_CERTIFICATE",
  "KOSMA",
  "SCHENGEN_VISA_NL",
  "VISA",
]);

export function isPrincipalVisibleDocumentType(docType: string | null | undefined): boolean {
  if (!docType) return false;
  return PRINCIPAL_ALLOWED_DOC_TYPES.has(docType.trim().toUpperCase());
}
