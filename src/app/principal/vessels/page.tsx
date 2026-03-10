"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type PrincipalVessel = {
  id: string;
  name: string;
  imoNumber: string | null;
  type: string;
  flag: string;
  status: string;
  activeAssignmentCount: number;
};

export default function PrincipalVesselsPage() {
  const [items, setItems] = useState<PrincipalVessel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/principal/vessels", { cache: "no-store" });
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload?.error || "Failed to load vessels");
        }
        setItems(payload.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load vessels");
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
          <h1 className="text-2xl font-bold text-slate-900">My Vessels</h1>
          <p className="mt-2 text-sm text-slate-600">Active vessels assigned to your principal.</p>
        </header>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        <section className="rounded-xl bg-white p-4 shadow">
          {loading ? (
            <p className="p-4 text-sm text-slate-600">Loading vessels...</p>
          ) : items.length === 0 ? (
            <p className="p-4 text-sm text-slate-600">No active vessels found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-600">
                    <th className="px-4 py-2">Vessel</th>
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Flag</th>
                    <th className="px-4 py-2">IMO</th>
                    <th className="px-4 py-2">Active Crew</th>
                    <th className="px-4 py-2">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 text-slate-900">
                      <td className="px-4 py-2 font-semibold">{item.name}</td>
                      <td className="px-4 py-2">{item.type}</td>
                      <td className="px-4 py-2">{item.flag}</td>
                      <td className="px-4 py-2">{item.imoNumber ?? "-"}</td>
                      <td className="px-4 py-2">{item.activeAssignmentCount}</td>
                      <td className="px-4 py-2">
                        <Link href={`/principal/vessels/${item.id}`} className="text-blue-700 hover:underline">
                          View Matrix
                        </Link>
                      </td>
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
