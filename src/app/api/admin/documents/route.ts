import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { APP_ROLES, requireUserApi } from "@/lib/authz";
import { handleApiError, validatePagination } from "@/lib/error-handler";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUserApi([APP_ROLES.DIRECTOR, APP_ROLES.DOCUMENT, APP_ROLES.QMR]);
    if (!auth.ok) {
      const { message, status } = auth as { ok: false; message: string; status: number };
      return NextResponse.json({ error: message }, { status });
    }

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search")?.trim() ?? "";
    const rootFolder = searchParams.get("rootFolder")?.trim() ?? "";
    const category = searchParams.get("category")?.trim() ?? "";
    const reviewFlag = searchParams.get("reviewFlag")?.trim() ?? "";
    const limitParam = searchParams.get("limit") ?? "25";
    const offsetParam = searchParams.get("offset") ?? "0";
    const { limit, offset } = validatePagination(limitParam, offsetParam);

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { fileName: { contains: search, mode: "insensitive" } },
        { normalizedFilename: { contains: search, mode: "insensitive" } },
        { originalRelativePath: { contains: search, mode: "insensitive" } },
      ];
    }

    if (rootFolder) {
      where.rootFolder = rootFolder;
    }

    if (category) {
      where.category = category;
    }

    if (reviewFlag === "flagged") {
      where.reviewFlag = { not: null };
    } else if (reviewFlag === "clean") {
      where.reviewFlag = null;
    }

    const [documents, total, rootFolders, categories, flaggedCount] = await Promise.all([
      prisma.documentIndex.findMany({
        where,
        orderBy: [{ rootFolder: "asc" }, { originalRelativePath: "asc" }],
        take: limit,
        skip: offset,
      }),
      prisma.documentIndex.count({ where }),
      prisma.documentIndex.findMany({
        distinct: ["rootFolder"],
        where: {
          rootFolder: {
            not: null,
          },
        },
        select: {
          rootFolder: true,
        },
        orderBy: {
          rootFolder: "asc",
        },
      }),
      prisma.documentIndex.findMany({
        distinct: ["category"],
        where: {
          category: {
            not: null,
          },
        },
        select: {
          category: true,
        },
        orderBy: {
          category: "asc",
        },
      }),
      prisma.documentIndex.count({
        where: {
          reviewFlag: {
            not: null,
          },
        },
      }),
    ]);

    return NextResponse.json({
      data: documents,
      filters: {
        rootFolders: rootFolders.map((item) => item.rootFolder).filter(Boolean),
        categories: categories.map((item) => item.category).filter(Boolean),
      },
      summary: {
        totalIndexed: total,
        flaggedCount,
      },
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
