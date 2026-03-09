"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type ContractItem = {
  id: string;
  contractNumber: string;
  contractKind: "SEA" | "OFFICE_PKL";
  rank: string;
  contractStart: string;
  contractEnd: string;
  status: string;
  crew: {
    id: string;
    fullName: string;
    rank: string;
  };
  vessel: {
    id: string;
    name: string;
  } | null;
  principal: {
    id: string;
    name: string;
  } | null;
};

type HistoryEntry = {
  id: string;
  action: string;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  oldValuesJson: Record<string, unknown> | null;
  newValuesJson: Record<string, unknown> | null;
  metadataJson: Record<string, unknown> | null;
};

export default function CrewContractHistoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const crewIdParam = params.crewId;
  const crewId = Array.isArray(crewIdParam) ? crewIdParam[0] : crewIdParam;

  const [activeContracts, setActiveContracts] = useState<ContractItem[]>([]);
  const [pastContracts, setPastContracts] = useState<ContractItem[]>([]);
  const [timeline, setTimeline] = useState<ContractItem[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const selectedFromQuery = searchParams.get("contractId");
  const selectedContractId = useMemo(() => {
    if (selectedFromQuery && timeline.some((contract) => contract.id === selectedFromQuery)) {
      return selectedFromQuery;
    }
    return timeline[0]?.id ?? null;
  }, [selectedFromQuery, timeline]);

  useEffect(() => {
    if (!crewId) return;

    const run = async () => {
      setLoadingTimeline(true);
      setTimelineError(null);

      try {
        const response = await fetch(`/api/contracts/timeline?crewId=${encodeURIComponent(crewId)}`);
        const payload = await response.json();

        if (!response.ok) {
          setTimelineError(payload?.error ?? "Failed to load contract timeline.");
          setActiveContracts([]);
          setPastContracts([]);
          setTimeline([]);
          return;
        }

        setActiveContracts(payload.activeContracts ?? []);
        setPastContracts(payload.pastContracts ?? []);
        setTimeline(payload.timeline ?? []);
      } catch {
        setTimelineError("Failed to load contract timeline.");
        setActiveContracts([]);
        setPastContracts([]);
        setTimeline([]);
      } finally {
        setLoadingTimeline(false);
      }
    };

    run();
  }, [crewId]);

  useEffect(() => {
    if (!selectedContractId) {
      setHistory([]);
      return;
    }

    const run = async () => {
      setLoadingHistory(true);
      setHistoryError(null);

      try {
        const response = await fetch(`/api/contracts/${selectedContractId}/history`);
        const payload = await response.json();

        if (!response.ok) {
          setHistoryError(payload?.error ?? "Failed to load contract history.");
          setHistory([]);
          return;
        }

        setHistory(payload.history ?? []);
      } catch {
        setHistoryError("Failed to load contract history.");
        setHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };

    run();
  }, [selectedContractId]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crew Contract History</h1>
          <p className="text-sm text-gray-700 mt-1">Timeline and status history by crew contract.</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/crew/${crewId}`} className="rounded bg-gray-600 px-3 py-2 text-sm text-white hover:bg-gray-700">
            Back to Crew
          </Link>
          <Link href="/contracts" className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">
            Contracts
          </Link>
        </div>
      </div>

      {loadingTimeline ? <p className="text-sm text-gray-600">Loading timeline...</p> : null}
      {timelineError ? <p className="text-sm text-red-600">{timelineError}</p> : null}

      {!loadingTimeline && !timelineError ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <section className="rounded border border-green-200 bg-green-50 p-4">
              <h2 className="text-sm font-semibold text-green-800 mb-2">Active Contracts ({activeContracts.length})</h2>
              {activeContracts.length === 0 ? <p className="text-sm text-green-700">No active contracts.</p> : null}
              <ul className="space-y-2">
                {activeContracts.map((contract) => (
                  <li key={contract.id} className="text-sm text-green-900">
                    <Link href={`/contracts/${contract.id}`} className="font-semibold hover:underline">
                      {contract.contractNumber}
                    </Link>
                    <span> · {contract.rank} · {contract.vessel?.name ?? "-"}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded border border-slate-300 bg-slate-50 p-4">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">Past Contracts ({pastContracts.length})</h2>
              {pastContracts.length === 0 ? <p className="text-sm text-slate-700">No past contracts.</p> : null}
              <ul className="space-y-2">
                {pastContracts.map((contract) => (
                  <li key={contract.id} className="text-sm text-slate-900">
                    <Link href={`/contracts/${contract.id}`} className="font-semibold hover:underline">
                      {contract.contractNumber}
                    </Link>
                    <span> · {contract.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="rounded border border-gray-200 bg-white p-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Timeline (by contract start date)</h2>
            {timeline.length === 0 ? <p className="text-sm text-gray-600">No contracts found.</p> : null}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-600">
                    <th className="py-2 pr-4">Contract</th>
                    <th className="py-2 pr-4">Crew</th>
                    <th className="py-2 pr-4">Rank</th>
                    <th className="py-2 pr-4">Vessel</th>
                    <th className="py-2 pr-4">Principal</th>
                    <th className="py-2 pr-4">Period</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">History</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((contract) => (
                    <tr key={contract.id} className="border-b border-gray-100 text-gray-900">
                      <td className="py-2 pr-4">
                        <Link href={`/contracts/${contract.id}`} className="font-semibold hover:underline">
                          {contract.contractNumber}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">{contract.crew?.fullName ?? "-"}</td>
                      <td className="py-2 pr-4">{contract.rank}</td>
                      <td className="py-2 pr-4">{contract.vessel?.name ?? "-"}</td>
                      <td className="py-2 pr-4">{contract.principal?.name ?? "-"}</td>
                      <td className="py-2 pr-4">
                        {new Date(contract.contractStart).toLocaleDateString()} - {new Date(contract.contractEnd).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-4">{contract.status}</td>
                      <td className="py-2 pr-4">
                        <Link
                          href={`/contracts/crew/${crewId}/history?contractId=${contract.id}`}
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
          </section>

          <section className="rounded border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Status History</h2>
            {!selectedContractId ? <p className="text-sm text-gray-600">Select a contract from timeline.</p> : null}
            {loadingHistory ? <p className="text-sm text-gray-600">Loading history...</p> : null}
            {historyError ? <p className="text-sm text-red-600">{historyError}</p> : null}
            {!loadingHistory && !historyError && selectedContractId && history.length === 0 ? (
              <p className="text-sm text-gray-600">No history entries recorded.</p>
            ) : null}

            {!loadingHistory && !historyError && history.length > 0 ? (
              <ul className="space-y-3">
                {history.map((entry) => (
                  <li key={entry.id} className="rounded border border-gray-200 p-3">
                    <p className="text-sm font-semibold text-gray-900">{entry.action}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(entry.createdAt).toLocaleString()} · {entry.actor?.name ?? entry.actor?.email ?? "Unknown"}
                    </p>
                    <p className="text-xs text-gray-700 mt-1">
                      {entry.oldValuesJson?.status ? `From: ${String(entry.oldValuesJson.status)} ` : ""}
                      {entry.newValuesJson?.status ? `To: ${String(entry.newValuesJson.status)}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
