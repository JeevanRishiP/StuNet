"use client";

import { useEffect, useState } from "react";
import { Shield, Clock } from "lucide-react";

interface ReportItem {
  id: string;
  contentType: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  submitterId: string;
  postId: string | null;
  commentId: string | null;
  listingId: string | null;
  reportedUserId: string | null;
  post: {
    id: string;
    body: string | null;
    author: { id: string; displayName: string; username: string };
  } | null;
}

type StatusFilter =
  "OPEN" | "UNDER_REVIEW" | "RESOLVED_NO_ACTION" | "RESOLVED_ACTION_TAKEN" | "DISMISSED";

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatus] = useState<StatusFilter>("OPEN");
  const [working, setWorking] = useState<string | null>(null);

  async function load(s: StatusFilter) {
    setLoading(true);
    const res = await fetch(`/api/reports?status=${s}`);
    if (res.ok) {
      const data: { reports: ReportItem[] } = await res.json();
      setReports(data.reports);
    }
    setLoading(false);
  }

  useEffect(() => {
    load(statusFilter);
  }, [statusFilter]);

  async function handleResolve(
    reportId: string,
    action: "DISMISS" | "RESOLVE_NO_ACTION" | "RESOLVE_ACTION_TAKEN",
  ) {
    const resolution =
      action === "RESOLVE_ACTION_TAKEN"
        ? window.prompt("Describe the action taken (required):")
        : undefined;

    if (action === "RESOLVE_ACTION_TAKEN" && !resolution) return;

    setWorking(reportId);
    const res = await fetch(`/api/reports/${reportId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, resolution }),
    });

    if (res.ok) {
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } else {
      const body = await res.json().catch(() => ({}));
      alert((body as { error?: string }).error ?? "Failed to resolve report.");
    }
    setWorking(null);
  }

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: "OPEN", label: "Open Reports" },
    { key: "UNDER_REVIEW", label: "Under Review" },
    { key: "RESOLVED_ACTION_TAKEN", label: "Action Taken" },
    { key: "RESOLVED_NO_ACTION", label: "No Action" },
    { key: "DISMISSED", label: "Dismissed" },
  ];

  const contentTypeColor: Record<string, string> = {
    POST: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    COMMENT: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
    USER_PROFILE: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
    CLUB: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    MARKET_LISTING: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    POLL_ENTRY: "bg-teal-500/20 text-teal-300 border border-teal-500/30",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Trust & Safety Queue
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Review reported posts, user conduct breaches, and marketplace flags.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-slate-900 rounded-2xl border border-slate-800 p-1.5 w-fit">
        {statusTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatus(t.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === t.key
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="py-12 text-center text-xs text-slate-400">Loading safety reports…</div>
      )}

      {!loading && reports.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
          <Shield className="mx-auto h-12 w-12 text-emerald-400 mb-3" />
          <h3 className="text-sm font-bold text-white">No Reports in this Queue</h3>
          <p className="mt-1 text-xs text-slate-400">
            Campus community health is currently in good standing.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {reports.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3 hover:border-slate-700 transition-colors shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      contentTypeColor[r.contentType] ?? "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {r.contentType}
                  </span>
                  <span className="text-xs font-mono font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                    {r.reason}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Reported on {new Date(r.createdAt).toLocaleString()}</span>
                </p>
              </div>

              {(r.status === "OPEN" || r.status === "UNDER_REVIEW") && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleResolve(r.id, "RESOLVE_ACTION_TAKEN")}
                    disabled={working === r.id}
                    className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-3 py-1.5 transition-colors shadow-sm disabled:opacity-50"
                  >
                    Take Action
                  </button>
                  <button
                    onClick={() => handleResolve(r.id, "RESOLVE_NO_ACTION")}
                    disabled={working === r.id}
                    className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-1.5 transition-colors disabled:opacity-50"
                  >
                    No Action
                  </button>
                  <button
                    onClick={() => handleResolve(r.id, "DISMISS")}
                    disabled={working === r.id}
                    className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 transition-colors disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>

            {r.details && (
              <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-xs text-slate-300 italic">
                &ldquo;{r.details}&rdquo;
              </div>
            )}

            {r.post && (
              <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 space-y-1">
                <p className="text-[11px] font-semibold text-slate-400">
                  Reported Post by @{r.post.author.username} ({r.post.author.displayName}):
                </p>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {r.post.body}
                </p>
              </div>
            )}

            {r.reportedUserId && (
              <p className="text-[11px] text-slate-500 font-mono">
                Reported User ID: {r.reportedUserId}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
