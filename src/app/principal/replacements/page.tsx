"use client";

import { type FormEvent, useEffect, useState } from "react";

type VesselOption = {
  id: string;
  name: string;
};

type MatrixCrewOption = {
  id: string;
  fullName: string;
  rank: string;
};

type ReplacementItem = {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  crew: {
    id: string;
    fullName: string;
    rank: string;
  };
  vessel: {
    id: string;
    name: string;
    type: string;
  } | null;
};

export default function PrincipalReplacementsPage() {
  const [items, setItems] = useState<ReplacementItem[]>([]);
  const [vessels, setVessels] = useState<VesselOption[]>([]);
  const [crewOptions, setCrewOptions] = useState<MatrixCrewOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    vesselId: "",
    crewId: "",
    reason: "",
  });

  async function loadReplacements() {
    const res = await fetch("/api/principal/replacements", { cache: "no-store" });
    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload?.error || "Failed to load replacements");
    }
    setItems(payload.data || []);
  }

  async function loadVessels() {
    const res = await fetch("/api/principal/vessels", { cache: "no-store" });
    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload?.error || "Failed to load vessels");
    }
    setVessels((payload.data || []).map((item: { id: string; name: string }) => ({ id: item.id, name: item.name })));
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([loadReplacements(), loadVessels()]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load replacement page");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const loadCrewOptions = async () => {
      if (!form.vesselId) {
        setCrewOptions([]);
        return;
      }

      try {
        const res = await fetch(`/api/principal/vessels/${form.vesselId}/crew-options`, { cache: "no-store" });
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || "Failed to load vessel crew options");
        }

        setCrewOptions(payload.data || []);
      } catch (err) {
        setCrewOptions([]);
        setError(err instanceof Error ? err.message : "Failed to load vessel crew options");
      }
    };

    loadCrewOptions();
  }, [form.vesselId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/principal/replacements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          crewId: form.crewId,
          reason: form.reason,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to submit replacement request");
      }

      setForm({
        vesselId: "",
        crewId: "",
        reason: "",
      });
      setCrewOptions([]);
      await loadReplacements();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit replacement request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-slate-900">Replacement Requests</h1>
          <p className="mt-2 text-sm text-slate-600">Submit and track crew replacement requests for your active vessels.</p>
        </header>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        <section className="rounded-xl bg-white p-4 shadow">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Submit Request</h2>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
            <label className="text-sm text-slate-700">
              Vessel
              <select
                value={form.vesselId}
                onChange={(event) => setForm((current) => ({ ...current, vesselId: event.target.value, crewId: "" }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              >
                <option value="">Select vessel</option>
                {vessels.map((vessel) => (
                  <option key={vessel.id} value={vessel.id}>
                    {vessel.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-700">
              Crew
              <select
                value={form.crewId}
                onChange={(event) => setForm((current) => ({ ...current, crewId: event.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                disabled={!form.vesselId || crewOptions.length === 0}
              >
                <option value="">{form.vesselId ? "Select crew" : "Select vessel first"}</option>
                {crewOptions.map((crew) => (
                  <option key={crew.id} value={crew.id}>
                    {crew.fullName} · {crew.rank}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm text-slate-700 md:col-span-3">
              Reason
              <textarea
                value={form.reason}
                onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                className="mt-1 min-h-[100px] w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="Describe the replacement reason"
              />
            </label>

            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
              >
                Submit Request
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl bg-white p-4 shadow">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Submitted Requests</h2>
          {loading ? (
            <p className="text-sm text-slate-600">Loading replacement requests...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-600">No replacement requests yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="px-3 py-2">Crew</th>
                    <th className="px-3 py-2">Rank</th>
                    <th className="px-3 py-2">Vessel</th>
                    <th className="px-3 py-2">Reason</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-900">{item.crew.fullName}</td>
                      <td className="px-3 py-2 text-slate-700">{item.crew.rank}</td>
                      <td className="px-3 py-2 text-slate-700">{item.vessel?.name ?? "-"}</td>
                      <td className="px-3 py-2 text-slate-700">{item.reason}</td>
                      <td className="px-3 py-2 text-slate-700">{item.status}</td>
                      <td className="px-3 py-2 text-slate-700">{new Date(item.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
