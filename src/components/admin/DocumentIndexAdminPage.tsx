'use client';

import { useEffect, useState } from "react";
import { Button, Input, Select } from "@/components/ui";

type DocumentIndexRow = {
  id: string;
  fileName: string;
  originalRelativePath: string;
  originalAbsolutePath: string;
  rootFolder: string | null;
  category: string | null;
  reviewFlag: string | null;
  modifiedTime: string | null;
  sizeBytes: number | null;
};

type DocumentIndexResponse = {
  data: DocumentIndexRow[];
  filters: {
    rootFolders: string[];
    categories: string[];
  };
  summary: {
    totalIndexed: number;
    flaggedCount: number;
  };
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

export default function DocumentIndexAdminPage() {
  const [documents, setDocuments] = useState<DocumentIndexRow[]>([]);
  const [rootFolders, setRootFolders] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [rootFolder, setRootFolder] = useState("");
  const [category, setCategory] = useState("");
  const [reviewFlag, setReviewFlag] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState({ totalIndexed: 0, flaggedCount: 0 });
  const rootFolderOptions = [{ value: "", label: "All root folders" }, ...rootFolders.map((value) => ({ value, label: value }))];
  const categoryOptions = [{ value: "", label: "All categories" }, ...categories.map((value) => ({ value, label: value }))];
  const reviewOptions = [
    { value: "", label: "All review states" },
    { value: "flagged", label: "Flagged" },
    { value: "clean", label: "Clean" },
  ];

  async function fetchDocuments(filters?: {
    search?: string;
    rootFolder?: string;
    category?: string;
    reviewFlag?: string;
  }) {
    try {
      setLoading(true);
      setError(null);

      const nextSearch = filters?.search ?? search;
      const nextRootFolder = filters?.rootFolder ?? rootFolder;
      const nextCategory = filters?.category ?? category;
      const nextReviewFlag = filters?.reviewFlag ?? reviewFlag;

      const params = new URLSearchParams({
        limit: "25",
        offset: "0",
      });

      if (nextSearch.trim()) params.set("search", nextSearch.trim());
      if (nextRootFolder) params.set("rootFolder", nextRootFolder);
      if (nextCategory) params.set("category", nextCategory);
      if (nextReviewFlag) params.set("reviewFlag", nextReviewFlag);

      const response = await fetch(`/api/admin/documents?${params.toString()}`);
      const payload = (await response.json()) as DocumentIndexResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to fetch indexed documents");
      }

      setDocuments(payload.data);
      setRootFolders(payload.filters.rootFolders);
      setCategories(payload.filters.categories);
      setSummary(payload.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch indexed documents");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    try {
      setImporting(true);
      setError(null);

      const response = await fetch("/api/admin/documents/import", {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to import HGI inventory");
      }

      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import HGI inventory");
    } finally {
      setImporting(false);
    }
  }

  useEffect(() => {
    fetchDocuments();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">HGI Document Index</h1>
              <p className="mt-1 text-sm text-gray-600">
                Indexed from read-only audit data at <code>docs/hgi-document-audit/output/inventory.json</code>.
              </p>
            </div>
            <Button onClick={handleImport} isLoading={importing}>
              Import Inventory
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-gray-500">Indexed Documents</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{summary.totalIndexed}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-medium text-gray-500">Flagged for Review</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{summary.flaggedCount}</div>
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-4">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search file name or path"
            />
            <Select
              value={rootFolder}
              onChange={(event) => setRootFolder(event.target.value)}
              options={rootFolderOptions}
            />
            <Select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              options={categoryOptions}
            />
            <Select
              value={reviewFlag}
              onChange={(event) => setReviewFlag(event.target.value)}
              options={reviewOptions}
            />
          </div>
          <div className="mt-4 flex gap-3">
            <Button size="sm" onClick={() => void fetchDocuments()} isLoading={loading}>
              Apply Filters
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSearch("");
                setRootFolder("");
                setCategory("");
                setReviewFlag("");
                fetchDocuments({
                  search: "",
                  rootFolder: "",
                  category: "",
                  reviewFlag: "",
                });
              }}
            >
              Reset
            </Button>
          </div>
          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">File</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Original Relative Path</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Category</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Modified</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {documents.map((document) => (
                  <tr key={document.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{document.fileName}</div>
                      <div className="mt-1 text-xs text-gray-500">{document.originalAbsolutePath}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{document.originalRelativePath}</td>
                    <td className="px-4 py-3 text-gray-700">
                      <div>{document.category || "-"}</div>
                      <div className="mt-1 text-xs text-gray-500">{document.rootFolder || "-"}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {document.modifiedTime
                        ? new Date(document.modifiedTime).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{document.reviewFlag || "-"}</td>
                  </tr>
                ))}
                {!loading && documents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No indexed documents found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
