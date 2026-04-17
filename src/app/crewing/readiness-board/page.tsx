"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ReadinessItem = {
  prepareJoiningId: string;
  crewId: string;
  crewName: string;
  rank: string;
  vesselName: string | null;
  departureDate: string | null;
  readinessBand: "READY" | "WATCH" | "BLOCKED";
  readinessScore: number;
  blockers: string[];
  warnings: string[];
  assignmentRisk: {
    level: "normal" | "elevated";
    reasons: string[];
  };
};

type ReadinessResponse = {
  message: string;
  data: ReadinessItem[];
};

const columns: Array<ReadinessItem["readinessBand"]> = ["READY", "WATCH", "BLOCKED"];

function getColumnClasses(column: ReadinessItem["readinessBand"]) {
  if (column === "READY") return "border-emerald-200 bg-emerald-50";
  if (column === "WATCH") return "border-amber-200 bg-amber-50";
  return "border-rose-200 bg-rose-50";
}

export default function ReadinessBoardPage() {
  const [payload, setPayload] = useState<ReadinessResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const response = await fetch("/api/crewing/readiness");
      if (!response.ok) return;
      const data = (await response.json()) as ReadinessResponse;
      if (!cancelled) setPayload(data);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-sm lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Crew Readiness Board</h1>
            <p className="mt-2 text-sm text-slate-600">
              {payload?.message ?? "Advisory readiness view grouped into operational buckets."}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/crewing/readiness" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              Dashboard View
            </Link>
            <Link href="/crewing/prepare-joining" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Prepare Joining
            </Link>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {columns.map((column) => {
            const items = payload?.data.filter((item) => item.readinessBand === column) ?? [];
            return (
              <section key={column} className={`rounded-3xl border p-4 shadow-sm ${getColumnClasses(column)}`}>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">{column}</h2>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {items.map((item) => (
                    <article key={item.prepareJoiningId} className="rounded-2xl bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">{item.crewName}</h3>
                          <p className="mt-1 text-xs text-slate-600">{item.rank} • {item.vesselName ?? "No vessel"}</p>
                        </div>
                        <span className="text-sm font-bold text-slate-900">{item.readinessScore}%</span>
                      </div>
                      {item.assignmentRisk.level === "elevated" ? (
                        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                          {item.assignmentRisk.reasons.join(" ")}
                        </p>
                      ) : null}
                      <p className="mt-3 text-xs text-slate-500">
                        Departure: {item.departureDate ? new Date(item.departureDate).toLocaleDateString() : "TBD"}
                      </p>
                    </article>
                  ))}
                  {items.length === 0 ? (
                    <div className="rounded-2xl bg-white/80 p-4 text-sm text-slate-600">No crew in this advisory bucket.</div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
