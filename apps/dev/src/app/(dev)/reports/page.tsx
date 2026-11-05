"use client";

import { useCallback, useEffect, useState } from "react";
import { EntityTable } from "@/components/EntityTable";

interface Report {
  id: string;
  contentType: string;
  reason: string;
  status: string;
  details: string | null;
  resolution: string | null;
  createdAt: string;
  submitter: { displayName: string | null; username: string | null };
}

const STATUS_OPTS = [
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED_ACTION_TAKEN",
  "RESOLVED_NO_ACTION",
  "DISMISSED",
].map((v) => ({ value: v, label: v }));
const CONTENT_OPTS = [
  "POST",
  "COMMENT",
  "USER_PROFILE",
  "CLUB",
  "GROUP",
  "MARKET_LISTING",
  "POLL_ENTRY",
].map((v) => ({ value: v, label: v }));

const STATUS_COLORS: Record<string, string> = {
  OPEN: "text-rose-400",
  UNDER_REVIEW: "text-amber-400",
  RESOLVED_ACTION_TAKEN: "text-emerald-400",
  RESOLVED_NO_ACTION: "text-slate-400",
  DISMISSED: "text-slate-600",
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [contentFilter, setContentFilter] = useState("");
  const [resolutionId, setResolutionId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (statusFilter) params.set("status", statusFilter);
    if (contentFilter) params.set("contentType", contentFilter);
    const res = await fetch(`/api/dev/reports?${params}`);
    const data = (await res.json()) as { reports: Report[]; total: number };
    setReports(data.reports);
    setTotal(data.total);
    setLoading(false);
  }, [page, statusFilter, contentFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeStatus(id: string, status: string) {
    await fetch("/api/dev/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    void load();
  }

  async function saveResolution() {
    if (!resolutionId) return;
    await fetch("/api/dev/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: resolutionId, resolution: resolutionText }),
    });
    setResolutionId(null);
    setResolutionText("");
    void load();
  }

  const COLUMNS = [
    {
      key: "submitter",
      label: "Reporter",
      render: (r: Report) => (
        <span className="text-white">{r.submitter.displayName ?? r.submitter.username}</span>
      ),
    },
    {
      key: "contentType",
      label: "Content",
      render: (r: Report) => <span className="text-[10px] text-slate-400">{r.contentType}</span>,
    },
    {
      key: "reason",
      label: "Reason",
      render: (r: Report) => <span className="text-xs">{r.reason}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (r: Report) => (
        <select
          value={r.status}
          onChange={(e) => void changeStatus(r.id, e.target.value)}
          className={`bg-transparent border-0 text-[10px] font-bold focus:outline-none cursor-pointer ${STATUS_COLORS[r.status] ?? "text-slate-400"}`}
        >
          {STATUS_OPTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label.replace("RESOLVED_", "")}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "resolution",
      label: "Resolution",
      render: (r: Report) =>
        resolutionId === r.id ? (
          <div className="flex gap-1">
            <input
              value={resolutionText}
              onChange={(e) => setResolutionText(e.target.value)}
              className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-white w-32 focus:outline-none"
              placeholder="Resolution note…"
              autoFocus
            />
            <button
              onClick={() => void saveResolution()}
              className="text-[10px] text-emerald-400 font-bold"
            >
              Save
            </button>
            <button onClick={() => setResolutionId(null)} className="text-[10px] text-slate-500">
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setResolutionId(r.id);
              setResolutionText(r.resolution ?? "");
            }}
            className="text-[10px] text-amber-400 hover:text-amber-300"
          >
            {r.resolution ? r.resolution.slice(0, 30) + "…" : "Add note"}
          </button>
        ),
    },
    {
      key: "createdAt",
      label: "Filed",
      render: (r: Report) => new Date(r.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <EntityTable
      title="Reports"
      data={reports}
      columns={COLUMNS}
      total={total}
      page={page}
      limit={20}
      onPageChange={setPage}
      loading={loading}
      filters={
        <>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={contentFilter}
            onChange={(e) => {
              setContentFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
          >
            <option value="">All Content Types</option>
            {CONTENT_OPTS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </>
      }
    />
  );
}
