import { APP_ROLES, requireUser } from "@/lib/authz";
import Link from "next/link";
import VesselMatrixClient from "./VesselMatrixClient";

export default async function VesselMatrixPage() {
  await requireUser({
    redirectIfCrew: "/m/crew",
    allowedRoles: [APP_ROLES.DIRECTOR, APP_ROLES.OPERATIONAL],
    redirectOnDisallowed: "/dashboard",
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vessel Crew Matrix</h1>
          <p className="text-sm text-gray-700 mt-1">
            Read-only vessel manning matrix from configured requirements and active assignments.
          </p>
        </div>
        <Link href="/crewing" className="rounded bg-gray-600 px-3 py-2 text-sm text-white hover:bg-gray-700">
          Back to Crewing
        </Link>
      </div>

      <VesselMatrixClient />
    </div>
  );
}
