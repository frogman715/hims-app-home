"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ReadinessItem = {
  prepareJoiningId: string;
  crewId: string;
  crewCode: string | null;
  crewName: string;
  rank: string;
  nationality: string | null;
  crewStatus: string | null;
  status: string;
  vesselName: string | null;
  principalName: string | null;
  departureDate: string | null;
  readinessBand: "READY" | "WATCH" | "BLOCKED";
  readinessScore: number;
  blockers: string[];
  warnings: string[];
  completedChecks: number;
  totalChecks: number;
  expiringDocuments: Array<{
    id: string;
    docLabel: string;
    daysUntilExpiry: number | null;
    severity: "expired" | "critical" | "warning" | "notice" | "monitor";
  }>;
  assignmentRisk: {
    level: "normal" | "elevated";
    reasons: string[];
  };
};

type ReadinessResponse = {
  advisory: boolean;
  message: string;
  summary: {
    total: number;
    ready: number;
    watch: number;
    blocked: number;
  };
  data: ReadinessItem[];
};

function getBandStyles(band: ReadinessItem["readinessBand"]) {
  if (band === "READY") return "bg-emerald-100 text-emerald-700";
  if (band === "WATCH") return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

export default function CrewReadinessPage() {
  const [payload, setPayload] = useState<ReadinessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReadiness() {
      try {
        const response = await fetch("/api/crewing/readiness");
        if (!response.ok) {
          throw new Error("Failed to load readiness dashboard");
        }

        const data = (await response.json()) as ReadinessResponse;
        if (!cancelled) {
          setPayload(data);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load readiness");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReadiness();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-10 shadow-sm">
          <p className="text-sm font-semibold text-slate-600">Loading advisory readiness data…</p>
        </div>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-10 shadow-sm">
          <p className="text-sm font-semibold text-rose-600">{error ?? "Readiness data is unavailable."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl bg-white p-8 shadow-sm lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Crew Readiness Dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{payload.message}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/crewing/readiness-board" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              Board View
            </Link>
            <Link href="/crewing/prepare-joining" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              Prepare Joining
            </Link>
            <Link href="/crewing/workflow" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Crew Workflow
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tracked</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{payload.summary.total}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ready</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{payload.summary.ready}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Watch</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{payload.summary.watch}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Blocked</p>
            <p className="mt-2 text-3xl font-bold text-rose-600">{payload.summary.blocked}</p>
          </div>
        </div>

        <div className="space-y-4">
          {payload.data.map((item) => (
            <div key={item.prepareJoiningId} className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-slate-900">{item.crewName}</h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getBandStyles(item.readinessBand)}`}>
                      {item.readinessBand}
                    </span>
                    {item.assignmentRisk.level === "elevated" ? (
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                        Assignment Risk
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.rank} • {item.nationality ?? "No nationality"} • {item.vesselName ?? "No vessel"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.crewCode ?? "No Crew ID"} • Crew Status: {item.crewStatus ?? "AVAILABLE"} • Principal: {item.principalName ?? "Unassigned"} • Prepare Joining Status: {item.status}
                  </p>
                  {item.assignmentRisk.level === "elevated" ? (
                    <p className="mt-2 text-xs font-medium text-rose-600">
                      {item.assignmentRisk.reasons.join(" ")}
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Score</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{item.readinessScore}%</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Checks</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {item.completedChecks}/{item.totalChecks}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Departure</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {item.departureDate ? new Date(item.departureDate).toLocaleDateString() : "TBD"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                  <h3 className="text-sm font-semibold text-rose-700">Blockers</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {item.blockers.length > 0 ? item.blockers.map((blocker) => <li key={blocker}>• {blocker}</li>) : <li>• No blocking items detected.</li>}
                  </ul>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <h3 className="text-sm font-semibold text-amber-700">Warnings</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {item.warnings.length > 0 ? item.warnings.map((warning) => <li key={warning}>• {warning}</li>) : <li>• No active warnings.</li>}
                  </ul>
                </div>
                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                  <h3 className="text-sm font-semibold text-sky-700">Expiring Documents</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {item.expiringDocuments.length > 0 ? item.expiringDocuments.slice(0, 5).map((document) => (
                      <li key={document.id}>
                        • {document.docLabel} {document.daysUntilExpiry !== null ? `(${document.daysUntilExpiry} days)` : ""}
                      </li>
                    )) : <li>• No document expiries in the current advisory window.</li>}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
