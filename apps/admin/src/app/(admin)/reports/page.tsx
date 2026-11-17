"use client";

import { useEffect, useState } from "react";
import { Shield, Clock, Activity, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

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
    poll?: {
      id: string;
      question: string;
      pollType: string;
      complaintLevel: string | null;
      section: string | null;
      batch: string | null;
      options: Array<{ id: string; text: string; sortOrder: number }>;
    } | null;
  } | null;
}

interface AnomalyFlagItem {
  id: string;
  userId: string;
  concentrationRatio: number;
  windowStart: string;
  windowEnd: string;
  flaggedAt: string;
  status: "FLAGGED" | "REVIEWED" | "DISMISSED";
  user: {
    id: string;
    displayName: string;
    username: string;
    studentEmail: string;
    role: string;
    campus: {
      id: string;
      name: string;
    } | null;
  };
}

type StatusFilter =
  "OPEN" | "UNDER_REVIEW" | "RESOLVED_NO_ACTION" | "RESOLVED_ACTION_TAKEN" | "DISMISSED";

type QueueMode = "USER_REPORTS" | "ENGAGEMENT_ANOMALIES";

export default function ReportsPage() {
  const [queueMode, setQueueMode] = useState<QueueMode>("USER_REPORTS");

  // User Reports State
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [statusFilter, setStatus] = useState<StatusFilter>("OPEN");
  const [working, setWorking] = useState<string | null>(null);

  // Engagement Anomalies State
  const [anomalies, setAnomalies] = useState<AnomalyFlagItem[]>([]);
  const [loadingAnomalies, setLoadingAnomalies] = useState(false);
  const [anomalyStatusFilter, setAnomalyStatusFilter] = useState<
    "FLAGGED" | "REVIEWED" | "DISMISSED"
  >("FLAGGED");
  const [workingAnomaly, setWorkingAnomaly] = useState<string | null>(null);

  async function loadReports(s: StatusFilter) {
    setLoadingReports(true);
    const res = await fetch(`/api/reports?status=${s}`);
    if (res.ok) {
      const data: { reports: ReportItem[] } = await res.json();
      setReports(data.reports);
    }
    setLoadingReports(false);
  }

  async function loadAnomalies(s: "FLAGGED" | "REVIEWED" | "DISMISSED") {
    setLoadingAnomalies(true);
    const res = await fetch(`/api/engagement-anomalies?status=${s}`);
    if (res.ok) {
      const data: { flags: AnomalyFlagItem[] } = await res.json();
      setAnomalies(data.flags);
    }
    setLoadingAnomalies(false);
  }

  useEffect(() => {
    if (queueMode === "USER_REPORTS") {
      loadReports(statusFilter);
    } else {
      loadAnomalies(anomalyStatusFilter);
    }
  }, [queueMode, statusFilter, anomalyStatusFilter]);

  async function handleResolveReport(
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

  async function handleResolveAnomaly(id: string, status: "REVIEWED" | "DISMISSED") {
    setWorkingAnomaly(id);
    const res = await fetch(`/api/engagement-anomalies`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });

    if (res.ok) {
      setAnomalies((prev) => prev.filter((a) => a.id !== id));
    } else {
      alert("Failed to update engagement anomaly status.");
    }
    setWorkingAnomaly(null);
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
            Trust & Safety Center
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Review user-submitted reports and automated system-detected engagement manipulation
            anomalies.
          </p>
        </div>
      </div>

      {/* Primary Queue Selector */}
      <div className="flex gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setQueueMode("USER_REPORTS")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            queueMode === "USER_REPORTS"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
          }`}
        >
          <Shield className="h-4 w-4" />
          <span>User Reports Queue</span>
        </button>
        <button
          onClick={() => setQueueMode("ENGAGEMENT_ANOMALIES")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            queueMode === "ENGAGEMENT_ANOMALIES"
              ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
              : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>Engagement Anomalies (System Detected)</span>
        </button>
      </div>

      {/* ── QUEUE MODE 1: USER REPORTS ────────────────────────────────────────── */}
      {queueMode === "USER_REPORTS" && (
        <div className="space-y-5">
          {/* Status Tabs */}
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

          {loadingReports && (
            <div className="py-12 text-center text-xs text-slate-400">Loading safety reports…</div>
          )}

          {!loadingReports && reports.length === 0 && (
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
                      <span className="text-xs font-semibold text-slate-200">{r.reason}</span>
                    </div>
                    {r.details && (
                      <p className="text-xs text-slate-400 leading-relaxed">{r.details}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.status === "OPEN" && (
                      <>
                        <button
                          disabled={working === r.id}
                          onClick={() => handleResolveReport(r.id, "DISMISS")}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                        <button
                          disabled={working === r.id}
                          onClick={() => handleResolveReport(r.id, "RESOLVE_NO_ACTION")}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
                        >
                          No Action
                        </button>
                        <button
                          disabled={working === r.id}
                          onClick={() => handleResolveReport(r.id, "RESOLVE_ACTION_TAKEN")}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 transition-colors shadow-sm disabled:opacity-50"
                        >
                          Action Taken
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {r.post && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Posted by {r.post.author?.displayName ?? "Anonymous"}</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {r.post.body}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── QUEUE MODE 2: ENGAGEMENT ANOMALIES ─────────────────────────────────── */}
      {queueMode === "ENGAGEMENT_ANOMALIES" && (
        <div className="space-y-5">
          {/* Ethical Banner */}
          <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 text-xs text-purple-200 space-y-1">
            <div className="flex items-center gap-2 font-bold text-purple-300">
              <AlertTriangle className="h-4 w-4" />
              <span>Human Review Only — No Automated Penalties</span>
            </div>
            <p className="text-[11px] text-purple-300/80 leading-relaxed">
              This detection runs nightly to highlight accounts whose like behavior shows heavy
              single-author concentration (&gt;80% of likes to one author). It is a diagnostic
              signal to detect like-farming rings for administrative inspection. It never
              auto-deletes likes or auto-bans accounts.
            </p>
          </div>

          {/* Anomaly Status Tabs */}
          <div className="flex flex-wrap gap-1 bg-slate-900 rounded-2xl border border-slate-800 p-1.5 w-fit">
            {(["FLAGGED", "REVIEWED", "DISMISSED"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setAnomalyStatusFilter(s)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  anomalyStatusFilter === s
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                {s === "FLAGGED" ? "Active Flags" : s === "REVIEWED" ? "Reviewed" : "Dismissed"}
              </button>
            ))}
          </div>

          {loadingAnomalies && (
            <div className="py-12 text-center text-xs text-slate-400">Scanning anomaly flags…</div>
          )}

          {!loadingAnomalies && anomalies.length === 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
              <Activity className="mx-auto h-12 w-12 text-purple-400 mb-3" />
              <h3 className="text-sm font-bold text-white">No Engagement Anomalies Found</h3>
              <p className="mt-1 text-xs text-slate-400">
                No accounts exceeded the 80% author like concentration threshold in this status
                view.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {anomalies.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4 hover:border-slate-700 transition-colors shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{a.user.displayName}</span>
                      <span className="text-xs font-mono text-purple-400">@{a.user.username}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {a.user.role}
                      </span>
                      {a.user.campus && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/60 text-slate-400">
                          {a.user.campus.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono">{a.user.studentEmail}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {a.status === "FLAGGED" && (
                      <>
                        <button
                          disabled={workingAnomaly === a.id}
                          onClick={() => handleResolveAnomaly(a.id, "REVIEWED")}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Mark Reviewed</span>
                        </button>
                        <button
                          disabled={workingAnomaly === a.id}
                          onClick={() => handleResolveAnomaly(a.id, "DISMISSED")}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Dismiss</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                      Concentration Ratio
                    </span>
                    <span className="text-base font-extrabold text-rose-400 font-mono">
                      {(a.concentrationRatio * 100).toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Target author received &gt;80% of all likes
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                      Evaluation Window (30 Days)
                    </span>
                    <span className="text-xs text-slate-300 font-mono block mt-1">
                      {new Date(a.windowStart).toLocaleDateString()} –{" "}
                      {new Date(a.windowEnd).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                      Flagged At
                    </span>
                    <span className="text-xs text-slate-300 font-mono block mt-1">
                      {new Date(a.flaggedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
