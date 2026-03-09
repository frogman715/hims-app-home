"use client";

import { useEffect, useMemo, useState } from "react";

type DispatchDetail = {
  id: string;
  status: string;
  dispatchDate: string;
  port: string;
  flightNumber: string | null;
  remarks: string | null;
  crew: {
    fullName: string;
    rank: string;
    phone: string | null;
  };
  vessel: {
    name: string;
    flag: string;
  } | null;
};

type DispatchResponse = {
  data?: DispatchDetail;
  error?: string;
};

const NEXT_STATUS_BY_CURRENT: Record<string, string[]> = {
  DISPATCHED: ["PICKUP_IN_PROGRESS", "AT_AIRPORT"],
  PICKUP_IN_PROGRESS: ["PICKUP_COMPLETED", "AT_AIRPORT"],
  PICKUP_COMPLETED: ["AT_AIRPORT"],
  AT_AIRPORT: ["CHECKIN_ASSISTED", "COMPLETED"],
  CHECKIN_ASSISTED: ["COMPLETED"],
  COMPLETED: [],
};

export default function DispatchDetailClient({ dispatchId }: { dispatchId: string }) {
  const [dispatch, setDispatch] = useState<DispatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [savingStatus, setSavingStatus] = useState<string | null>(null);

  const fetchDispatch = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/driver/dispatches/${dispatchId}`);
      const payload = (await response.json()) as DispatchResponse;
      if (!response.ok) {
        setError(payload.error ?? "Failed to load dispatch");
        setDispatch(null);
        return;
      }
      setDispatch(payload.data ?? null);
    } catch (fetchError) {
      console.error(fetchError);
      setError("Failed to load dispatch");
      setDispatch(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispatch();
  }, [dispatchId]);

  const nextStatuses = useMemo(() => {
    if (!dispatch) return [];
    return NEXT_STATUS_BY_CURRENT[(dispatch.status || "").toUpperCase()] ?? [];
  }, [dispatch]);

  const updateStatus = async (status: string) => {
    try {
      setSavingStatus(status);
      setError(null);
      const response = await fetch(`/api/driver/dispatches/${dispatchId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, note }),
      });
      const payload = (await response.json()) as DispatchResponse;
      if (!response.ok) {
        setError(payload.error ?? "Failed to update dispatch status");
        return;
      }
      setNote("");
      await fetchDispatch();
    } catch (patchError) {
      console.error(patchError);
      setError("Failed to update dispatch status");
    } finally {
      setSavingStatus(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-300">Loading dispatch...</p>;
  }

  if (error) {
    return <p className="rounded-2xl border border-rose-500/35 bg-rose-500/10 p-4 text-sm text-rose-100">{error}</p>;
  }

  if (!dispatch) {
    return <p className="text-sm text-slate-300">Dispatch not found.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-200">
        <p className="text-base font-semibold text-slate-100">{dispatch.crew.fullName}</p>
        <p className="mt-1 text-xs text-slate-300">{dispatch.crew.rank}</p>
        <div className="mt-3 space-y-1 text-xs">
          <p><span className="font-semibold text-slate-100">Status:</span> {dispatch.status}</p>
          <p><span className="font-semibold text-slate-100">Port:</span> {dispatch.port}</p>
          <p><span className="font-semibold text-slate-100">Dispatch Date:</span> {new Date(dispatch.dispatchDate).toLocaleDateString("en-GB")}</p>
          <p><span className="font-semibold text-slate-100">Flight:</span> {dispatch.flightNumber ?? "-"}</p>
          <p><span className="font-semibold text-slate-100">Vessel:</span> {dispatch.vessel?.name ?? "-"}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-100">Update Pickup / Check-in Status</p>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Optional note"
          rows={3}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        />
        <div className="flex flex-wrap gap-2">
          {nextStatuses.length === 0 ? (
            <span className="text-xs text-slate-400">No further driver updates available.</span>
          ) : (
            nextStatuses.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => updateStatus(status)}
                disabled={savingStatus !== null}
                className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50"
              >
                {savingStatus === status ? "Saving..." : status}
              </button>
            ))
          )}
        </div>
      </div>

      <a
        href={`/api/driver/dispatches/${dispatchId}/letter-guarantee?format=html`}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-2xl border border-emerald-500/50 bg-emerald-500/15 px-4 py-3 text-center text-sm font-semibold text-emerald-100"
      >
        View Letter Guarantee
      </a>
    </div>
  );
}
