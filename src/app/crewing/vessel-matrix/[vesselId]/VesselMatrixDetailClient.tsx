"use client";

import { useEffect, useState } from "react";

type VesselMatrixRow = {
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

type VesselMatrixDetail = {
  vesselId: string;
  vesselName: string;
  vesselType: string;
  principalName: string | null;
  requirementsConfigured: boolean;
  configSource: "vesselId" | "vesselType" | null;
  rows: VesselMatrixRow[];
  summary: {
    requiredTotal: number;
    filledTotal: number;
    openTotal: number;
    replacementNeedTotal: number;
  } | null;
};

type DetailResponse = {
  data?: VesselMatrixDetail;
  error?: string;
  code?: string;
  vessel?: VesselMatrixDetail;
};

export default function VesselMatrixDetailClient({ vesselId }: { vesselId: string }) {
  const [data, setData] = useState<VesselMatrixDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/crewing/vessel-matrix/${vesselId}`);
        const payload = (await response.json()) as DetailResponse;

        if (!response.ok) {
          if (payload.code === "REQUIREMENTS_NOT_CONFIGURED") {
            setError("Requirements are not configured for this vessel. Configure HGI_VESSEL_MATRIX_REQUIREMENTS_JSON first.");
          } else {
            setError(payload.error ?? "Failed to load vessel matrix detail.");
          }
          setData(null);
          return;
        }

        setData(payload.data ?? null);
      } catch {
        setError("Failed to load vessel matrix detail.");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [vesselId]);

  if (loading) {
    return <p className="text-sm text-gray-600">Loading matrix detail...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-gray-600">No matrix detail found.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-700">
        <p className="font-semibold text-gray-900">{data.vesselName}</p>
        <p>
          Type: {data.vesselType} · Principal: {data.principalName ?? "-"} · Config: {data.configSource}
        </p>
        <p>
          Required: {data.summary?.requiredTotal ?? 0} · Filled: {data.summary?.filledTotal ?? 0} · Open: {data.summary?.openTotal ?? 0} · Replacement Need: {data.summary?.replacementNeedTotal ?? 0}
        </p>
      </div>

      <div className="space-y-3">
        {data.rows.map((row) => (
          <div key={row.rank} className="rounded border border-gray-200 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <p className="font-semibold text-gray-900">{row.rank}</p>
              <p className="text-sm text-gray-700">Required {row.requiredCount}</p>
              <p className="text-sm text-gray-700">Filled {row.filledCount}</p>
              <p className="text-sm text-gray-700">Open {row.openCount}</p>
              <p className="text-sm text-gray-700">Due Off Soon {row.dueOffSoonCount}</p>
              <p className="text-sm text-gray-700">Replacement Requests {row.replacementRequestCount}</p>
              <p className="text-sm font-semibold text-amber-700">Replacement Need {row.replacementNeedCount}</p>
            </div>

            <p className="text-xs text-gray-600 mb-2">
              Required certificates: {row.requiredCertificates.length > 0 ? row.requiredCertificates.join(", ") : "-"}
            </p>

            {row.filledCrew.length === 0 ? (
              <p className="text-sm text-gray-600">No active crew assigned for this rank.</p>
            ) : (
              <ul className="space-y-1 text-sm text-gray-800">
                {row.filledCrew.map((crew) => (
                  <li key={crew.assignmentId}>
                    {crew.crewName} · {crew.assignmentStatus} · Start {new Date(crew.startDate).toLocaleDateString()}
                    {crew.endDate ? ` · End ${new Date(crew.endDate).toLocaleDateString()}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
