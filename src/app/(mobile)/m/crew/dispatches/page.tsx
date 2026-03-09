import Link from "next/link";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import MobileShell from "../MobileShell";
import { resolveDriverDispatchIds } from "@/lib/driver-dispatch-scope";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DriverDispatchesPage() {
  const { user, session } = await requireUser({
    allowedRoles: ["DRIVER"],
    redirectOnDisallowed: "/m/crew",
  });

  const assignedDispatchIds = resolveDriverDispatchIds({
    userId: user.id,
    email: session.user.email,
  });

  if (assignedDispatchIds.length === 0) {
    return (
      <MobileShell title="My Dispatch" subtitle="Assigned dispatch tasks only." activeTab="dispatch">
        <div className="rounded-2xl border border-rose-500/35 bg-rose-500/10 p-4 text-sm text-rose-100">
          Driver dispatch scope is not configured for this account.
        </div>
      </MobileShell>
    );
  }

  const dispatches = await prisma.dispatch.findMany({
    where: {
      id: {
        in: assignedDispatchIds,
      },
    },
    include: {
      crew: {
        select: {
          id: true,
          fullName: true,
          rank: true,
        },
      },
    },
    orderBy: {
      dispatchDate: "desc",
    },
  });

  return (
    <MobileShell title="My Dispatch" subtitle="Assigned dispatch tasks only." activeTab="dispatch">
      <div className="space-y-4">
        {dispatches.length === 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-200">
            No assigned dispatches found.
          </div>
        ) : (
          dispatches.map((dispatch) => (
            <Link
              key={dispatch.id}
              href={`/m/crew/dispatches/${dispatch.id}`}
              className="block rounded-2xl border border-slate-700 bg-slate-900/70 p-4"
            >
              <p className="text-base font-semibold text-slate-100">{dispatch.crew.fullName}</p>
              <p className="mt-1 text-xs text-slate-300">{dispatch.crew.rank}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300">
                <p>
                  <span className="font-semibold text-slate-100">Dispatch:</span>{" "}
                  {new Date(dispatch.dispatchDate).toLocaleDateString("en-GB")}
                </p>
                <p>
                  <span className="font-semibold text-slate-100">Port:</span> {dispatch.port}
                </p>
                <p className="col-span-2">
                  <span className="font-semibold text-slate-100">Status:</span> {dispatch.status}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </MobileShell>
  );
}
