"use client";

/**
 * Admin Reports Queue — /reports
 * Lists open reports. Admins can dismiss or resolve each one.
 * CAMPUS_MANAGER sees only reports on their campus content.
 */
import { useEffect, useState } from "react";

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
    { key: "OPEN", label: "Open" },
    { key: "UNDER_REVIEW", label: "Under Review" },
    { key: "RESOLVED_ACTION_TAKEN", label: "Action Taken" },
    { key: "RESOLVED_NO_ACTION", label: "No Action" },
    { key: "DISMISSED", label: "Dismissed" },
  ];

  const contentTypeColor: Record<string, string> = {
    POST: "bg-blue-100 text-blue-700",
    COMMENT: "bg-purple-100 text-purple-700",
    USER_PROFILE: "bg-red-100 text-red-700",
    CLUB: "bg-yellow-100 text-yellow-700",
    MARKET_LISTING: "bg-orange-100 text-orange-700",
    POLL_ENTRY: "bg-green-100 text-green-700",
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-100">Reports Queue</h1>

      {/* Status tabs */}
      <div className="flex gap-1 bg-slate-800 rounded-xl border border-slate-700 p-1 w-fit">
        {statusTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatus(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === t.key
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-slate-400 text-center py-8">Loading…</p>}

      {!loading && reports.length === 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
          <p className="text-slate-400">🎉 No reports in this queue.</p>
        </div>
      )}

      <div className="space-y-3">
        {reports.map((r) => (
          <div key={r.id} className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      contentTypeColor[r.contentType] ?? "bg-slate-700 text-slate-300"
                    }`}
                  >
                    {r.contentType}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">{r.reason}</span>
                </div>
                <p className="text-xs text-slate-500">
                  Reported {new Date(r.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Actions — only for open/under-review */}
              {(r.status === "OPEN" || r.status === "UNDER_REVIEW") && (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleResolve(r.id, "RESOLVE_ACTION_TAKEN")}
                    disabled={working === r.id}
                    className="bg-red-700 hover:bg-red-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    Action Taken
                  </button>
                  <button
                    onClick={() => handleResolve(r.id, "RESOLVE_NO_ACTION")}
                    disabled={working === r.id}
                    className="bg-slate-600 hover:bg-slate-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    No Action
                  </button>
                  <button
                    onClick={() => handleResolve(r.id, "DISMISS")}
                    disabled={working === r.id}
                    className="text-slate-500 hover:text-slate-300 text-xs disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>

            {/* Details */}
            {r.details && (
              <p className="text-sm text-slate-300 bg-slate-900 rounded p-3 italic">
                &ldquo;{r.details}&rdquo;
              </p>
            )}

            {/* Referenced content — post excerpt */}
            {r.post && (
              <div className="bg-slate-900 rounded p-3">
                <p className="text-xs text-slate-500 mb-1">
                  Post by @{r.post.author.username} ({r.post.author.displayName})
                </p>
                <p className="text-sm text-slate-300 line-clamp-3">{r.post.body}</p>
              </div>
            )}

            {/* Reported user ID (no PII) */}
            {r.reportedUserId && (
              <p className="text-xs text-slate-500">
                Reported user ID: <span className="font-mono">{r.reportedUserId}</span>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
