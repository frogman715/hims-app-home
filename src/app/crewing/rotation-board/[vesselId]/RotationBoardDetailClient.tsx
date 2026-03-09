"use client";

import { useEffect, useState } from "react";

type RotationDueOffItem = {
  assignmentId: string;
  crewId: string;
  crewName: string;
  rank: string;
  assignmentStatus: string;
  endDate: string;
  daysUntilEnd: number;
  contractEnd: string | null;
};

type RotationSuggestion = {
  crewId: string;
  crewName: string;
  rank: string;
  crewStatus: string;
};

type RotationBoardRankRow = {
  rank: string;
  activeCount: number;
  dueOffSoonCount: number;
  overdueCount: number;
  replacementDemandCount: number;
  pipelineCount: number;
  totalNeedCount: number;
  dueOffSoon: RotationDueOffItem[];
  overdue: RotationDueOffItem[];
  suggestions: RotationSuggestion[];
  warnings: string[];
};

type RotationBoardDetail = {
  vesselId: string;
  vesselName: string;
  vesselType: string;
  principalName: string | null;
  rows: RotationBoardRankRow[];
  summary: {
    activeCount: number;
    dueOffSoonCount: number;
    overdueCount: number;
    replacementDemandCount: number;
    pipelineCount: number;
    totalNeedCount: number;
  };
  warnings: string[];
};

type DetailResponse = {
  data?: RotationBoardDetail;
  error?: string;
};

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

export default function RotationBoardDetailClient({ vesselId }: { vesselId: string }) {
  const [payload, setPayload] = useState<RotationBoardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/crewing/rotation-board/${vesselId}`, { cache: "no-store" });
        const data = (await response.json()) as DetailResponse;

        if (!response.ok) {
          setPayload(null);
          setError(data.error ?? "Failed to load rotation board detail.");
          return;
        }

        setPayload(data.data ?? null);
      } catch {
        setPayload(null);
        setError("Failed to load rotation board detail.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [vesselId]);

  if (loading) {
    return <p className="text-sm text-gray-600">Loading rotation detail...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!payload) {
    return <p className="text-sm text-gray-600">No rotation detail found.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-700">
        <p className="font-semibold text-gray-900">{payload.vesselName}</p>
        <p>
          Type: {payload.vesselType} · Principal: {payload.principalName ?? "-"}
        </p>
        <p>
          Active: {payload.summary.activeCount} · Due Off Soon: {payload.summary.dueOffSoonCount} · Overdue: {payload.summary.overdueCount}
          {" "}· Replacement Demand: {payload.summary.replacementDemandCount} · Pipeline: {payload.summary.pipelineCount}
          {" "}· Total Need: {payload.summary.totalNeedCount}
        </p>
      </div>

      {payload.warnings.length > 0 ? (
        <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">Read-only warnings</p>
          <ul className="list-disc list-inside space-y-1">
            {payload.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {payload.rows.length === 0 ? (
        <p className="text-sm text-gray-600">No rank rows available for this vessel.</p>
      ) : (
        payload.rows.map((row) => (
          <div key={row.rank} className="rounded border border-gray-200 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <p className="font-semibold text-gray-900">{row.rank}</p>
              <p className="text-sm text-gray-700">Active {row.activeCount}</p>
              <p className="text-sm text-gray-700">Due Off Soon {row.dueOffSoonCount}</p>
              <p className="text-sm text-gray-700">Overdue {row.overdueCount}</p>
              <p className="text-sm text-gray-700">Replacement Demand {row.replacementDemandCount}</p>
              <p className="text-sm text-gray-700">Pipeline {row.pipelineCount}</p>
              <p className="text-sm font-semibold text-amber-700">Total Need {row.totalNeedCount}</p>
            </div>

            {row.warnings.length > 0 ? (
              <div className="mb-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
                {row.warnings.join(" ")}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Due Off Soon</p>
                {row.dueOffSoon.length === 0 ? (
                  <p className="text-sm text-gray-600">None</p>
                ) : (
                  <ul className="space-y-1 text-sm text-gray-800">
                    {row.dueOffSoon.map((item) => (
                      <li key={item.assignmentId}>
                        {item.crewName} · {formatDate(item.endDate)} ({item.daysUntilEnd}d)
                        {item.contractEnd ? ` · Contract ${formatDate(item.contractEnd)}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Overdue</p>
                {row.overdue.length === 0 ? (
                  <p className="text-sm text-gray-600">None</p>
                ) : (
                  <ul className="space-y-1 text-sm text-gray-800">
                    {row.overdue.map((item) => (
                      <li key={item.assignmentId}>
                        {item.crewName} · {formatDate(item.endDate)} ({Math.abs(item.daysUntilEnd)}d late)
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-gray-500">Suggestions (Same Rank)</p>
                {row.suggestions.length === 0 ? (
                  <p className="text-sm text-gray-600">No conservative suggestions available.</p>
                ) : (
                  <ul className="space-y-1 text-sm text-gray-800">
                    {row.suggestions.map((item) => (
                      <li key={item.crewId}>
                        {item.crewName} · {item.crewStatus}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

