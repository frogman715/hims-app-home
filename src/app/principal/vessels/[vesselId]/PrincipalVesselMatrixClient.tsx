"use client";

import { useEffect, useState } from "react";

type MatrixRow = {
  rank: string;
  requiredCount: number;
  filledCount: number;
  openCount: number;
  dueOffSoonCount: number;
  replacementRequestCount: number;
  replacementNeedCount: number;
  requiredCertificates: string[];
  filledCrew: Array<{
    assignmentId: string;
    crewId: string;
    crewName: string;
    assignmentStatus: string;
    startDate: string;
    endDate: string | null;
  }>;
};

type MatrixDetail = {
  vesselId: string;
  vesselName: string;
  vesselType: string;
  principalName: string | null;
  rows: MatrixRow[];
  summary: {
    requiredTotal: number;
    filledTotal: number;
    openTotal: number;
    replacementNeedTotal: number;
  } | null;
};

export default function PrincipalVesselMatrixClient({ vesselId }: { vesselId: string }) {
  const [data, setData] = useState<MatrixDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/principal/vessels/${vesselId}/matrix`, { cache: "no-store" });
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || "Failed to load vessel matrix");
        }
        setData(payload.data || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load vessel matrix");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [vesselId]);

  if (loading) {
    return <p className="text-sm text-slate-600">Loading vessel matrix...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-slate-600">No matrix data available.</p>;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-white p-4 shadow">
        <h2 className="text-lg font-semibold text-slate-900">{data.vesselName}</h2>
        <p className="mt-1 text-sm text-slate-600">
          Type: {data.vesselType} · Required: {data.summary?.requiredTotal ?? 0} · Filled: {data.summary?.filledTotal ?? 0} · Open: {data.summary?.openTotal ?? 0}
        </p>
      </section>

      {data.rows.map((row) => (
        <section key={row.rank} className="rounded-xl bg-white p-4 shadow">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-semibold text-slate-900">{row.rank}</h3>
            <span className="text-xs text-slate-600">Required {row.requiredCount}</span>
            <span className="text-xs text-slate-600">Filled {row.filledCount}</span>
            <span className="text-xs text-slate-600">Open {row.openCount}</span>
            <span className="text-xs text-slate-600">Due Off {row.dueOffSoonCount}</span>
            <span className="text-xs text-slate-600">Replacement Need {row.replacementNeedCount}</span>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Required certificates: {row.requiredCertificates.length > 0 ? row.requiredCertificates.join(", ") : "-"}
          </p>

          {row.filledCrew.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No active crew for this rank.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="px-3 py-2">Crew</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Start</th>
                    <th className="px-3 py-2">End</th>
                  </tr>
                </thead>
                <tbody>
                  {row.filledCrew.map((crew) => (
                    <tr key={crew.assignmentId} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-900">{crew.crewName}</td>
                      <td className="px-3 py-2 text-slate-700">{crew.assignmentStatus}</td>
                      <td className="px-3 py-2 text-slate-700">{new Date(crew.startDate).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-slate-700">{crew.endDate ? new Date(crew.endDate).toLocaleDateString() : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
