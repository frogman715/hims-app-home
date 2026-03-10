"use client";

import { useEffect, useState } from "react";

type JoiningItem = {
  id: string;
  status: string;
  updatedAt: string;
  departureDate: string | null;
  departurePort: string | null;
  arrivalPort: string | null;
  flightNumber: string | null;
  readiness: {
    ticketBooked: boolean;
    hotelBooked: boolean;
    transportArranged: boolean;
    orientationCompleted: boolean;
    visaValid: boolean;
    vesselContractSigned: boolean;
    preDepartureFinalCheck: boolean;
  };
  crew: {
    id: string;
    fullName: string;
    rank: string;
    nationality: string | null;
  };
  vessel: {
    id: string;
    name: string;
    type: string;
    flag: string;
  } | null;
};

type DispatchItem = {
  id: string;
  dispatchDate: string;
  port: string;
  flightNumber: string | null;
  status: string;
  crew: {
    id: string;
    fullName: string;
    rank: string;
  };
  vessel: {
    id: string;
    name: string;
    type: string;
    flag: string;
  };
};

export default function PrincipalJoiningPage() {
  const [joining, setJoining] = useState<JoiningItem[]>([]);
  const [dispatches, setDispatches] = useState<DispatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [joiningRes, dispatchRes] = await Promise.all([
          fetch("/api/principal/joining", { cache: "no-store" }),
          fetch("/api/principal/dispatches", { cache: "no-store" }),
        ]);

        const joiningPayload = await joiningRes.json();
        const dispatchPayload = await dispatchRes.json();

        if (!joiningRes.ok) {
          throw new Error(joiningPayload?.error || "Failed to load joining status");
        }

        if (!dispatchRes.ok) {
          throw new Error(dispatchPayload?.error || "Failed to load dispatch status");
        }

        setJoining(joiningPayload.data || []);
        setDispatches(dispatchPayload.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load joining portal data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-slate-900">Joining Status</h1>
          <p className="mt-2 text-sm text-slate-600">Joining progress and dispatch status for your principal.</p>
        </header>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        {loading ? (
          <section className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm text-slate-600">Loading portal data...</p>
          </section>
        ) : (
          <>
            <section className="rounded-xl bg-white p-4 shadow">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Prepare Joining</h2>
              {joining.length === 0 ? (
                <p className="text-sm text-slate-600">No joining crew found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-600">
                        <th className="px-3 py-2">Crew</th>
                        <th className="px-3 py-2">Rank</th>
                        <th className="px-3 py-2">Vessel</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Departure</th>
                        <th className="px-3 py-2">Readiness</th>
                      </tr>
                    </thead>
                    <tbody>
                      {joining.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100">
                          <td className="px-3 py-2 font-medium text-slate-900">{item.crew.fullName}</td>
                          <td className="px-3 py-2 text-slate-700">{item.crew.rank}</td>
                          <td className="px-3 py-2 text-slate-700">{item.vessel?.name ?? "-"}</td>
                          <td className="px-3 py-2 text-slate-700">{item.status}</td>
                          <td className="px-3 py-2 text-slate-700">
                            {item.departureDate ? new Date(item.departureDate).toLocaleDateString() : "-"}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-600">
                            {[
                              item.readiness.ticketBooked ? "Ticket" : null,
                              item.readiness.transportArranged ? "Transport" : null,
                              item.readiness.visaValid ? "Visa" : null,
                              item.readiness.preDepartureFinalCheck ? "Final Check" : null,
                            ]
                              .filter(Boolean)
                              .join(", ") || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-xl bg-white p-4 shadow">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Dispatches</h2>
              {dispatches.length === 0 ? (
                <p className="text-sm text-slate-600">No dispatches found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-600">
                        <th className="px-3 py-2">Crew</th>
                        <th className="px-3 py-2">Rank</th>
                        <th className="px-3 py-2">Vessel</th>
                        <th className="px-3 py-2">Dispatch Date</th>
                        <th className="px-3 py-2">Port</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dispatches.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100">
                          <td className="px-3 py-2 font-medium text-slate-900">{item.crew.fullName}</td>
                          <td className="px-3 py-2 text-slate-700">{item.crew.rank}</td>
                          <td className="px-3 py-2 text-slate-700">{item.vessel.name}</td>
                          <td className="px-3 py-2 text-slate-700">{new Date(item.dispatchDate).toLocaleDateString()}</td>
                          <td className="px-3 py-2 text-slate-700">{item.port}</td>
                          <td className="px-3 py-2 text-slate-700">{item.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
