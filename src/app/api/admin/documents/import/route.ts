import { NextResponse } from "next/server";
import { APP_ROLES, requireUserApi } from "@/lib/authz";
import { handleApiError } from "@/lib/error-handler";
import { importHgiDocumentIndex } from "@/lib/document-index-import";

export async function POST() {
  try {
    const auth = await requireUserApi([APP_ROLES.DIRECTOR, APP_ROLES.DOCUMENT]);
    if (!auth.ok) {
      const { message, status } = auth as { ok: false; message: string; status: number };
      return NextResponse.json({ error: message }, { status });
    }

    const result = await importHgiDocumentIndex();

    return NextResponse.json({
      message: "HGI document index import completed",
      source: "docs/hgi-document-audit/output/inventory.json",
      ...result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
