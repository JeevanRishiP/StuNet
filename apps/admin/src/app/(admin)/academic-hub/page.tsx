"use client";

import { useEffect, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import {
  Bell,
  BookOpen,
  Calendar,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Sparkles,
  Flame,
  Radio,
} from "lucide-react";

interface LiveAlertItem {
  id: string;
  title: string;
  body: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  isActive: boolean;
  createdAt: string;
  expiresAt?: string | null;
  campusId?: string;
  campus?: { name: string };
}

interface CampusOption {
  id: string;
  name: string;
  city: string;
}

export default function AcademicHubPage() {
  const { data: session } = useSession();
  const [alerts, setAlerts] = useState<LiveAlertItem[]>([]);
  const [campuses, setCampuses] = useState<CampusOption[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State
  const [alertType, setAlertType] = useState<"ALERT" | "CIA" | "IA">("ALERT");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [component, setComponent] = useState("CIA 1");
  const [scheduledAt, setScheduledAt] = useState("");
  const [venue, setVenue] = useState("");

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const managedCampusId = (session?.user as any)?.managedCampusId;

  useEffect(() => {
    async function init() {
      try {
        const campRes = await fetch("/api/campuses");
        if (campRes.ok) {
          const campData = await campRes.json();
          const list: CampusOption[] = campData.campuses || [];
          setCampuses(list);

          const defaultId = managedCampusId || list[0]?.id || "";
          setSelectedCampusId(defaultId);
          loadAlerts(defaultId);
        }
      } catch (err) {
        console.error("Failed to load campuses:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [managedCampusId]);

  async function loadAlerts(campusId?: string) {
    const cid = campusId || selectedCampusId;
    if (!cid) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/campuses/${encodeURIComponent(cid)}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.campus?.liveAlerts || []);
      }
    } catch (err) {
      console.error("Failed to load live alerts:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleCampusChange(cid: string) {
    setSelectedCampusId(cid);
    loadAlerts(cid);
  }

  function notify(text: string, type: "success" | "error" = "success") {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCampusId || !title.trim()) {
      notify("Please fill in the announcement title.", "error");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/campuses/${encodeURIComponent(selectedCampusId)}/academic`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: alertType,
            title: title.trim(),
            body: body.trim() || title.trim(),
            component: alertType !== "ALERT" ? component : undefined,
            scheduledAt: alertType !== "ALERT" ? scheduledAt : undefined,
            venue: alertType !== "ALERT" ? venue.trim() : undefined,
          }),
        });

        if (res.ok) {
          notify("✓ Academic announcement / live ticker published!");
          setTitle("");
          setBody("");
          setVenue("");
          setScheduledAt("");
          loadAlerts(selectedCampusId);
        } else {
          const err = await res.json();
          notify(err.error || "Failed to publish academic update", "error");
        }
      } catch {
        notify("Network error broadcasting academic alert", "error");
      }
    });
  }

  async function handleDeleteAlert(alertId: string) {
    if (!confirm("Are you sure you want to deactivate and remove this academic ticker?")) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/alerts/${encodeURIComponent(alertId)}`, {
          method: "DELETE",
        });

        if (res.ok) {
          notify("✓ Academic alert deactivated.");
          loadAlerts(selectedCampusId);
        } else {
          notify("Failed to deactivate alert", "error");
        }
      } catch {
        notify("Network error deactivating alert", "error");
      }
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <BookOpen className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
              Academic Operations Hub
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Academic Hub & Live Alerts</h1>
          <p className="text-xs text-slate-400">
            Publish urgent curriculum updates, CIA deadline extensions, and exam notices to the
            Student Portal Live Broadcast Ticker.
          </p>
        </div>

        {/* Campus Scope Selector */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 self-start md:self-auto">
          <Building2 className="h-4 w-4 text-slate-400" />
          {isSuperAdmin ? (
            <select
              value={selectedCampusId}
              onChange={(e) => handleCampusChange(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              {campuses.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.name} ({c.city})
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs font-semibold text-white">
              {campuses.find((c) => c.id === selectedCampusId)?.name || "Active Campus"}
            </span>
          )}
        </div>
      </div>

      {/* ── NOTIFICATION TOAST ── */}
      {message && (
        <div
          className={`flex items-center gap-2 p-3.5 rounded-xl border text-xs font-semibold animate-in fade-in ${
            message.type === "success"
              ? "bg-emerald-950/60 border-emerald-800/80 text-emerald-300"
              : "bg-rose-950/60 border-rose-800/80 text-rose-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* ── BROADCAST FORM ── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Radio className="h-4 w-4 text-indigo-400 animate-pulse" />
            <span>Broadcast Academic Alert or Publish Assessment Notice</span>
          </h2>
          <span className="text-[10px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-mono">
            Live Student Ticker
          </span>
        </div>

        <form onSubmit={handleBroadcast} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Notice Type</label>
              <select
                value={alertType}
                onChange={(e) => setAlertType(e.target.value as "ALERT" | "CIA" | "IA")}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALERT">Live Urgent News Banner (Slideshow Ticker)</option>
                <option value="CIA">CIA Schedule (Continuous Assessment)</option>
                <option value="IA">IA Exam Hub (Internal Assessment)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {alertType === "ALERT" ? "Alert Headline / Ticker Title" : "Subject / Course"}{" "}
                <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={200}
                placeholder={
                  alertType === "ALERT"
                    ? "e.g. CIA 2 English - Submission Deadline Extended by 2 days"
                    : "e.g. Core Data Structures and Intermediate Algorithms"
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {alertType === "ALERT" ? (
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Announcement Details
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="Provide comprehensive details regarding the syllabus coverage, submission guidelines, or revised timetable..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Component / Slot
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CIA 1, CIA 2, or IA 1"
                    value={component}
                    onChange={(e) => setComponent(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Submission / Exam Date
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Venue / Online Link
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Lab 4 or CCBP LMS Portal"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>{isPending ? "Broadcasting…" : "Publish to Student Portal Slide Show"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── ACTIVE LIVE TICKERS LIST ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-400" />
            <span>Active Student Portal Broadcast Tickers ({alerts.length})</span>
          </h2>
          <span className="text-xs text-slate-400">Shown in Student Campus Live Slide Show</span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400">
            Loading broadcast items from database…
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center space-y-2">
            <Bell className="h-8 w-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No Active Academic Tickers</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Broadcast urgent CIA deadlines, timetable releases, or academic announcements to
              display them in the student app slide show.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-md"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Live on Student Slide Show</span>
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(a.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{a.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{a.body}</p>
                </div>

                <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-800 text-xs">
                  <span className="text-[11px] text-slate-500 font-mono">
                    ID: {a.id.slice(0, 10)}…
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteAlert(a.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 border border-rose-800/40 text-[11px] font-semibold transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Deactivate</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
