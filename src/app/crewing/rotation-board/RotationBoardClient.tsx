"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RotationBoardItem = {
  vesselId: string;
  vesselName: string;
  vesselType: string;
  principalName: string | null;
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

type RotationBoardResponse = {
  data: RotationBoardItem[];
  meta: {
    totalVessels: number;
    vesselsWithDemand: number;
  };
};

export default function RotationBoardClient() {
  const [payload, setPayload] = useState<RotationBoardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/crewing/rotation-board", { cache: "no-store" });
        const data = (await response.json()) as RotationBoardResponse & { error?: string };

        if (!response.ok) {
          setPayload(null);
          setError(data.error ?? "Failed to load rotation board.");
          return;
        }

        setPayload(data);
      } catch {
        setPayload(null);
        setError("Failed to load rotation board.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  if (loading) {
    return <p className="text-sm text-gray-600">Loading rotation board...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!payload || payload.data.length === 0) {
    return <p className="text-sm text-gray-600">No active vessels found for rotation planning.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-700">
        <p>
          Vessels: {payload.meta.totalVessels} · Vessels with demand: {payload.meta.vesselsWithDemand}
        </p>
      </div>

      <div className="overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-600">
              <th className="px-4 py-2">Vessel</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Principal</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2">Due Off Soon</th>
              <th className="px-4 py-2">Overdue</th>
              <th className="px-4 py-2">Replacement Demand</th>
              <th className="px-4 py-2">Pipeline</th>
              <th className="px-4 py-2">Total Need</th>
              <th className="px-4 py-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {payload.data.map((item) => (
              <tr key={item.vesselId} className="border-b border-gray-100 text-gray-900">
                <td className="px-4 py-2 font-semibold">{item.vesselName}</td>
                <td className="px-4 py-2">{item.vesselType}</td>
                <td className="px-4 py-2">{item.principalName ?? "-"}</td>
                <td className="px-4 py-2">{item.summary.activeCount}</td>
                <td className="px-4 py-2">{item.summary.dueOffSoonCount}</td>
                <td className="px-4 py-2">{item.summary.overdueCount}</td>
                <td className="px-4 py-2">{item.summary.replacementDemandCount}</td>
                <td className="px-4 py-2">{item.summary.pipelineCount}</td>
                <td className="px-4 py-2 font-semibold text-amber-700">{item.summary.totalNeedCount}</td>
                <td className="px-4 py-2">
                  <Link href={`/crewing/rotation-board/${item.vesselId}`} className="text-blue-600 hover:text-blue-800">
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

