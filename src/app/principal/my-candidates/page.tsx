"use client";

import { useEffect, useMemo, useState } from "react";

type CandidateItem = {
  id: string;
  status: string;
  position: string;
  applicationDate: string;
  remarks: string | null;
  crew: {
    id: string;
    fullName: string;
    rank: string | null;
    nationality: string | null;
  };
  principal: {
    id: string;
    name: string;
  } | null;
};

type CandidateDetail = CandidateItem & {
  reviewedAt: string | null;
};

type CandidateDocument = {
  id: string;
  docType: string;
  docNumber: string | null;
  expiryDate: string | null;
  downloadUrl: string;
};

export default function PrincipalMyCandidatesPage() {
  const [items, setItems] = useState<CandidateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CandidateDetail | null>(null);
  const [docs, setDocs] = useState<CandidateDocument[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  async function loadCandidates() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/principal/candidates?view=my", { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to load candidates");
      }
      setItems(payload.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load candidates");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(candidateId: string) {
    setError(null);
    try {
      const [detailRes, docRes] = await Promise.all([
        fetch(`/api/principal/candidates/${candidateId}`, { cache: "no-store" }),
        fetch(`/api/principal/candidates/${candidateId}/documents`, { cache: "no-store" }),
      ]);

      const detailPayload = await detailRes.json();
      if (!detailRes.ok) {
        throw new Error(detailPayload?.error || "Failed to load candidate detail");
      }

      const docsPayload = await docRes.json();
      if (!docRes.ok) {
        throw new Error(docsPayload?.error || "Failed to load candidate documents");
      }

      setDetail(detailPayload);
      setDocs(docsPayload.data || []);
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load candidate detail");
    }
  }

  async function submitDecision(decision: "APPROVE" | "REJECT") {
    if (!selectedId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/principal/candidates/${selectedId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: note.trim() || undefined }),
      });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Failed to save decision");
      }

      setSelectedId(null);
      setDetail(null);
      setDocs([]);
      setNote("");
      await loadCandidates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save decision");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    loadCandidates();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-slate-900">My Candidates</h1>
          <p className="mt-2 text-sm text-slate-600">Candidates assigned to your principal awaiting owner decision.</p>
        </header>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <section className="rounded-xl bg-white p-4 shadow">
            {loading ? (
              <p className="p-4 text-sm text-slate-600">Loading candidates...</p>
            ) : items.length === 0 ? (
              <p className="p-4 text-sm text-slate-600">No assigned candidates in OFFERED status.</p>
            ) : (
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold text-slate-900">{item.crew.fullName}</h2>
                        <p className="text-sm text-slate-600">{item.position} · {item.crew.rank ?? "-"}</p>
                        <p className="mt-1 text-xs text-slate-500">Status: {item.status}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(item.id);
                          loadDetail(item.id);
                        }}
                        className="rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                      >
                        Open
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl bg-white p-4 shadow">
            {!selected || !detail ? (
              <p className="p-4 text-sm text-slate-600">Select a candidate to review CV, documents, and decision actions.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{detail.crew.fullName}</h3>
                  <p className="text-sm text-slate-600">{detail.position} · {detail.crew.nationality ?? "-"}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/api/principal/candidates/${detail.id}/cv`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    View CV
                  </a>
                  <a
                    href={`/api/principal/candidates/${detail.id}/cv?download=1`}
                    className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Download CV
                  </a>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Owner-Visible Documents</h4>
                  {docs.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">No documents available under principal allowlist.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {docs.map((doc) => (
                        <li key={doc.id} className="flex items-center justify-between rounded-md border border-slate-200 p-2 text-xs">
                          <span className="text-slate-700">{doc.docType}</span>
                          <a href={doc.downloadUrl} className="font-semibold text-blue-700 hover:underline">Download</a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="owner-note" className="text-sm font-semibold text-slate-800">Owner Note</label>
                  <textarea
                    id="owner-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Optional note for decision"
                    className="min-h-[90px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => submitDecision("APPROVE")}
                    disabled={submitting}
                    className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => submitDecision("REJECT")}
                    disabled={submitting}
                    className="rounded-md bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
