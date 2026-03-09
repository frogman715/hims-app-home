"use client";

import { useEffect, useState } from "react";

type DispatchStatus =
  | "DISPATCHED"
  | "PICKUP_IN_PROGRESS"
  | "AT_AIRPORT"
  | "CHECKIN_ASSISTED"
  | "COMPLETED";

type DispatchRecord = {
  id: string;
  crewId: string;
  vesselId: string | null;
  dispatchDate: string;
  port: string;
  flightNumber: string | null;
  status: string;
  statusBucket: DispatchStatus | "UNKNOWN";
  remarks: string | null;
  crewName: string;
  crewRank: string;
  createdAt: string;
  updatedAt: string;
};

type DispatchDashboardData = {
  generatedAt: string;
  summary: {
    todayTotal: number;
    weekTotal: number;
    delayedTotal: number;
    overduePickupTotal: number;
  };
  distribution: {
    today: Record<DispatchStatus, number>;
    week: Record<DispatchStatus, number>;
  };
  todayDispatches: DispatchRecord[];
  weekDispatches: DispatchRecord[];
  delayedDispatches: DispatchRecord[];
  overduePickupDispatches: DispatchRecord[];
  warnings: string[];
  unknownStatusCounts: Record<string, number>;
};

type DashboardPayload = {
  data?: DispatchDashboardData;
  error?: string;
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function renderStatusDistribution(distribution: Record<DispatchStatus, number>) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {Object.entries(distribution).map(([status, count]) => (
        <div key={status} className="rounded border border-gray-200 bg-white p-3">
          <p className="text-xs font-semibold text-gray-500">{status}</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{count}</p>
        </div>
      ))}
    </div>
  );
}

function renderDispatchTable(items: DispatchRecord[]) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-600">No dispatches.</p>;
  }

  return (
    <div className="overflow-x-auto rounded border border-gray-200 bg-white">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-600">
            <th className="px-4 py-2">Crew</th>
            <th className="px-4 py-2">Rank</th>
            <th className="px-4 py-2">Dispatch Date</th>
            <th className="px-4 py-2">Port</th>
            <th className="px-4 py-2">Flight</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-gray-100 text-gray-900">
              <td className="px-4 py-2 font-semibold">{item.crewName}</td>
              <td className="px-4 py-2">{item.crewRank}</td>
              <td className="px-4 py-2">{formatDate(item.dispatchDate)}</td>
              <td className="px-4 py-2">{item.port}</td>
              <td className="px-4 py-2">{item.flightNumber ?? "-"}</td>
              <td className="px-4 py-2">{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DispatchDashboardClient() {
  const [payload, setPayload] = useState<DispatchDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/crewing/dispatch-dashboard", {
          cache: "no-store",
        });
        const body = (await response.json()) as DashboardPayload;
        if (!response.ok) {
          setError(body.error ?? "Failed to load dispatch dashboard.");
          setPayload(null);
          return;
        }
        setPayload(body.data ?? null);
      } catch {
        setError("Failed to load dispatch dashboard.");
        setPayload(null);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  if (loading) {
    return <p className="text-sm text-gray-600">Loading dispatch dashboard...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!payload) {
    return <p className="text-sm text-gray-600">No dashboard data available.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">Today Dispatches</p>
          <p className="text-xl font-bold text-gray-900">{payload.summary.todayTotal}</p>
        </div>
        <div className="rounded border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">This Week Dispatches</p>
          <p className="text-xl font-bold text-gray-900">{payload.summary.weekTotal}</p>
        </div>
        <div className="rounded border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">Delayed Dispatches</p>
          <p className="text-xl font-bold text-amber-700">{payload.summary.delayedTotal}</p>
        </div>
        <div className="rounded border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">Overdue Pickup</p>
          <p className="text-xl font-bold text-rose-700">{payload.summary.overduePickupTotal}</p>
        </div>
      </div>

      {payload.warnings.length > 0 ? (
        <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">Warnings</p>
          <ul className="list-disc list-inside space-y-1">
            {payload.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Today Status Distribution</h2>
        {renderStatusDistribution(payload.distribution.today)}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">This Week Status Distribution</h2>
        {renderStatusDistribution(payload.distribution.week)}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Today Dispatches</h2>
        {renderDispatchTable(payload.todayDispatches)}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Delayed Dispatches</h2>
        {renderDispatchTable(payload.delayedDispatches)}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Overdue Pickup Dispatches</h2>
        {renderDispatchTable(payload.overduePickupDispatches)}
      </div>
    </div>
  );
}

