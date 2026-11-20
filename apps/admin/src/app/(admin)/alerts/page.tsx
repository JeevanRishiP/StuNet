"use client";

import { useEffect, useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import {
  Bell,
  AlertTriangle,
  Info,
  Flame,
  Clock,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Plus,
  Sparkles,
  Eye,
} from "lucide-react";

type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

interface LiveAlert {
  id: string;
  title: string;
  body: string;
  severity: AlertSeverity;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  campusId?: string;
  campus?: { name: string };
}

interface CampusOption {
  id: string;
  name: string;
  city: string;
}

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { label: string; badge: string; border: string; bg: string; icon: any }
> = {
  INFO: {
    label: "Info / Notice",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    border: "border-blue-500/30",
    bg: "bg-blue-950/20",
    icon: Info,
  },
  WARNING: {
    label: "Warning / Advisory",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    border: "border-amber-500/30",
    bg: "bg-amber-950/20",
    icon: AlertTriangle,
  },
  CRITICAL: {
    label: "Urgent / Emergency",
    badge: "bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse",
    border: "border-rose-500/40",
    bg: "bg-rose-950/30",
    icon: Flame,
  },
};

export default function AlertsPage() {
  const { data: session } = useSession();
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [campuses, setCampuses] = useState<CampusOption[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState<AlertSeverity>("INFO");
  const [expiresAt, setExpiresAt] = useState("");

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
    setLoading(true);
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) {
        const d = await res.json();
        setAlerts(d.alerts ?? []);
      }
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      setLoading(false);
    }
  }

  function notify(text: string, type: "success" | "error" = "success") {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      notify("Title and announcement details are required.", "error");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            severity,
            expiresAt: expiresAt || undefined,
            campusId: selectedCampusId || undefined,
          }),
        });

        if (res.ok) {
          notify("✓ Campus Alert posted and broadcasted to Student Portal!");
          setTitle("");
          setBody("");
          setSeverity("INFO");
          setExpiresAt("");
          loadAlerts(selectedCampusId);
        } else {
          const d = await res.json();
          notify(d.error ?? "Failed to create alert.", "error");
        }
      } catch {
        notify("Network error posting alert.", "error");
      }
    });
  }

  async function handleDeactivate(alertId: string) {
    if (!confirm("Are you sure you want to deactivate and remove this alert?")) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/alerts/${alertId}`, { method: "DELETE" });
        if (res.ok) {
          notify("✓ Alert deactivated successfully.");
          loadAlerts(selectedCampusId);
        } else {
          notify("Failed to deactivate alert.", "error");
        }
      } catch {
        notify("Network error deactivating alert.", "error");
      }
    });
  }

  const SevIcon = SEVERITY_CONFIG[severity].icon;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Bell className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
              Administrative Broadcasts
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Campus Alerts</h1>
          <p className="text-xs text-slate-400">
            Publish high-priority institutional announcements, facility notices, safety alerts, and
            weather advisories.
          </p>
        </div>

        {/* Campus Scope Selector */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 self-start md:self-auto">
          <Building2 className="h-4 w-4 text-slate-400" />
          {isSuperAdmin ? (
            <select
              value={selectedCampusId}
              onChange={(e) => {
                setSelectedCampusId(e.target.value);
                loadAlerts(e.target.value);
              }}
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

      {/* ── POST NEW ALERT FORM & LIVE PREVIEW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span>Post New Campus Alert</span>
            </h2>
            <span className="text-[10px] text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full font-mono">
              Live Push
            </span>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Alert Title <span className="text-rose-400">*</span>
                </label>
                <span className="text-[10px] text-slate-500">{title.length}/200</span>
              </div>
              <input
                type="text"
                required
                maxLength={200}
                placeholder="e.g. Monsoon Advisory: Bus Shuttles Operating with 15-Minute Delay"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Severity & Expiry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Severity Level <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["INFO", "WARNING", "CRITICAL"] as AlertSeverity[]).map((sev) => {
                    const active = severity === sev;
                    const conf = SEVERITY_CONFIG[sev];
                    return (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setSeverity(sev)}
                        className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all text-center flex flex-col items-center gap-1 ${
                          active
                            ? `${conf.bg} ${conf.border} text-white ring-1 ring-white/20`
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <conf.icon className="h-3.5 w-3.5" />
                        <span>{sev}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Auto-Expiry Date & Time{" "}
                  <span className="text-slate-500 text-[10px]">(Optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Body */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Announcement Details & Action Items <span className="text-rose-400">*</span>
                </label>
                <span className="text-[10px] text-slate-500">{body.length}/1000</span>
              </div>
              <textarea
                rows={4}
                required
                maxLength={1000}
                placeholder="Detailed announcement, instructions, emergency contact numbers, or alternative arrangements..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400">
                Severity: <strong className="text-white">{SEVERITY_CONFIG[severity].label}</strong>
              </span>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                <span>{isPending ? "Publishing…" : "Broadcast Alert to Students"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Column */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Eye className="h-4 w-4 text-indigo-400" />
              <span>Student Portal Live Preview</span>
            </h2>
            <span className="text-[10px] text-emerald-400 font-mono">Mobile & Web</span>
          </div>

          <p className="text-xs text-slate-400">
            This preview simulates how students will see the alert in their Live Campus Alerts feed:
          </p>

          <div
            className={`rounded-2xl border p-4 transition-all shadow-md ${SEVERITY_CONFIG[severity].bg} ${SEVERITY_CONFIG[severity].border}`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${SEVERITY_CONFIG[severity].badge}`}
              >
                <SevIcon className="h-3 w-3" />
                <span>{severity}</span>
              </span>
              <span className="text-[10px] text-slate-400">Just now</span>
            </div>

            <h4 className="text-sm font-bold text-white leading-snug">
              {title.trim() || "Alert headline will appear here…"}
            </h4>

            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {body.trim() ||
                "Full announcement text and action items will appear here for all active students and faculty."}
            </p>

            <div className="flex items-center justify-between pt-2.5 mt-3 border-t border-slate-800/60 text-[10px] text-slate-400">
              <span>Campus Official Notice</span>
              {expiresAt && (
                <span className="flex items-center gap-1 text-slate-400 font-mono">
                  <Clock className="h-2.5 w-2.5" />
                  <span>Expires {new Date(expiresAt).toLocaleDateString()}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── ACTIVE ALERTS TABLE ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Bell className="h-4 w-4 text-indigo-400" />
            <span>Active Campus Alerts ({alerts.length})</span>
          </h2>
          <span className="text-xs text-slate-400">
            Synchronized across Web & Mobile Applications
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400">
            Loading alerts from database…
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center space-y-2">
            <Bell className="h-8 w-8 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No Active Campus Alerts</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No campus-wide administrative alerts are currently live. Use the form above to post
              emergency, advisory, or facility notices.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.map((al) => {
              const sev = al.severity as AlertSeverity;
              const conf = SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.INFO;
              const Icon = conf.icon;
              const isExpired = al.expiresAt ? new Date(al.expiresAt) < new Date() : false;

              return (
                <div
                  key={al.id}
                  className={`rounded-2xl border bg-slate-900/90 p-5 flex flex-col justify-between transition-all shadow-md ${
                    isExpired ? "opacity-60 border-slate-800" : conf.border
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${conf.badge}`}
                      >
                        <Icon className="h-3 w-3" />
                        <span>{al.severity}</span>
                      </span>

                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(al.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug">{al.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{al.body}</p>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-800 text-xs">
                    {al.expiresAt ? (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-500" />
                        <span>Exp: {new Date(al.expiresAt).toLocaleDateString()}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        Active indefinite
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeactivate(al.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 border border-rose-800/40 text-[11px] font-semibold transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Deactivate</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
