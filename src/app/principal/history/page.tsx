"use client";

import { useEffect, useState } from "react";

type CandidateItem = {
  id: string;
  status: string;
  position: string;
  updatedAt: string;
  reviewedAt: string | null;
  remarks: string | null;
  crew: {
    fullName: string;
    rank: string | null;
    nationality: string | null;
  };
};

export default function PrincipalHistoryPage() {
  const [items, setItems] = useState<CandidateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/principal/candidates?view=history", { cache: "no-store" });
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || "Failed to load history");
        }
        setItems(payload.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-slate-900">History</h1>
          <p className="mt-2 text-sm text-slate-600">Principal decisions for assigned candidates.</p>
        </header>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        <section className="rounded-xl bg-white p-4 shadow">
          {loading ? (
            <p className="p-4 text-sm text-slate-600">Loading history...</p>
          ) : items.length === 0 ? (
            <p className="p-4 text-sm text-slate-600">No principal decisions yet.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-semibold text-slate-900">{item.crew.fullName}</h2>
                      <p className="text-sm text-slate-600">{item.position} · {item.crew.rank ?? "-"}</p>
                      <p className="mt-1 text-xs text-slate-500">Decision: {item.status}</p>
                      <p className="text-xs text-slate-500">
                        Reviewed: {item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : "-"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        item.status === "ACCEPTED"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  {item.remarks ? (
                    <p className="mt-3 rounded-md bg-slate-100 p-2 text-xs text-slate-700">{item.remarks}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
