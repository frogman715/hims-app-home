import { APP_ROLES, requireUser } from "@/lib/authz";
import Link from "next/link";
import RotationBoardDetailClient from "./RotationBoardDetailClient";

export default async function RotationBoardDetailPage({
  params,
}: {
  params: Promise<{ vesselId: string }>;
}) {
  await requireUser({
    redirectIfCrew: "/m/crew",
    allowedRoles: [APP_ROLES.DIRECTOR, APP_ROLES.OPERATIONAL],
    redirectOnDisallowed: "/dashboard",
  });

  const { vesselId } = await params;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crew Rotation Detail</h1>
          <p className="text-sm text-gray-700 mt-1">
            Rank-based read-only due-off, overdue, replacement demand, and conservative suggestions.
          </p>
        </div>
        <Link href="/crewing/rotation-board" className="rounded bg-gray-600 px-3 py-2 text-sm text-white hover:bg-gray-700">
          Back to Rotation Board
        </Link>
      </div>

      <RotationBoardDetailClient vesselId={vesselId} />
    </div>
  );
}

