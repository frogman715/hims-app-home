"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type VesselMatrixRow = {
  rank: string;
  requiredCount: number;
  filledCount: number;
  openCount: number;
  replacementNeedCount: number;
};

type VesselMatrixItem = {
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

type MatrixResponse = {
  data: VesselMatrixItem[];
  meta: {
    totalVessels: number;
    configuredVessels: number;
    unconfiguredVessels: number;
  };
};

export default function VesselMatrixClient() {
  const [payload, setPayload] = useState<MatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/crewing/vessel-matrix");
        const data = (await response.json()) as MatrixResponse & { error?: string };

        if (!response.ok) {
          setError(data.error ?? "Failed to load vessel matrix.");
          setPayload(null);
          return;
        }

        setPayload(data);
      } catch {
        setError("Failed to load vessel matrix.");
        setPayload(null);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  if (loading) {
    return <p className="text-sm text-gray-600">Loading vessel matrix...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!payload || payload.data.length === 0) {
    return <p className="text-sm text-gray-600">No active vessels found.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-700">
        <p>
          Vessels: {payload.meta.totalVessels} · Configured: {payload.meta.configuredVessels} · Unconfigured: {payload.meta.unconfiguredVessels}
        </p>
      </div>

      {payload.meta.unconfiguredVessels > 0 ? (
        <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Some vessels are fail-closed because requirements are not configured.
        </div>
      ) : null}

      <div className="overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-600">
              <th className="px-4 py-2">Vessel</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Principal</th>
              <th className="px-4 py-2">Required</th>
              <th className="px-4 py-2">Filled</th>
              <th className="px-4 py-2">Open</th>
              <th className="px-4 py-2">Replacement Need</th>
              <th className="px-4 py-2">Config</th>
              <th className="px-4 py-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {payload.data.map((item) => (
              <tr key={item.vesselId} className="border-b border-gray-100 text-gray-900">
                <td className="px-4 py-2 font-semibold">{item.vesselName}</td>
                <td className="px-4 py-2">{item.vesselType}</td>
                <td className="px-4 py-2">{item.principalName ?? "-"}</td>
                <td className="px-4 py-2">{item.summary?.requiredTotal ?? "-"}</td>
                <td className="px-4 py-2">{item.summary?.filledTotal ?? "-"}</td>
                <td className="px-4 py-2">{item.summary?.openTotal ?? "-"}</td>
                <td className="px-4 py-2">{item.summary?.replacementNeedTotal ?? "-"}</td>
                <td className="px-4 py-2">
                  {item.requirementsConfigured
                    ? `Configured (${item.configSource})`
                    : "Not configured"}
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/crewing/vessel-matrix/${item.vesselId}`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
