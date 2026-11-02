"use client";

import { useEffect, useState } from "react";

type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

interface LiveAlert {
  id: string;
  title: string;
  body: string;
  severity: AlertSeverity;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  campus?: { name: string };
}

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  INFO: "bg-blue-100 text-blue-800",
  WARNING: "bg-yellow-100 text-yellow-800",
  CRITICAL: "bg-red-100 text-red-800",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [deactivating, setDeactivating] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState<AlertSeverity>("INFO");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadAlerts() {
    setLoading(true);
    const res = await fetch("/api/alerts");
    if (res.ok) {
      const d = await res.json();
      setAlerts(d.alerts ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!title.trim() || !body.trim()) {
      setFormError("Title and body are required.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        body: body.trim(),
        severity,
        expiresAt: expiresAt || undefined,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setTitle("");
      setBody("");
      setSeverity("INFO");
      setExpiresAt("");
      await loadAlerts();
    } else {
      const d = await res.json();
      setFormError((d as { error?: string }).error ?? "Failed to create alert.");
    }
  }

  async function handleDeactivate(alertId: string) {
    setDeactivating(alertId);
    await fetch(`/api/alerts/${alertId}`, { method: "DELETE" });
    setDeactivating(null);
    await loadAlerts();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Campus Alerts</h1>

      {/* ── Create Alert Form ── */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Post New Alert</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Alert title…"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Body <span className="text-red-500">*</span>
            </label>
            <textarea
              maxLength={1000}
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Alert details…"
              required
            />
          </div>

          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as AlertSeverity)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="INFO">Info</option>
                <option value="WARNING">Warning</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expires At (optional)
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Posting…" : "Post Alert"}
          </button>
        </form>
      </section>

      {/* ── Active Alerts List ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Active Alerts</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-gray-500">No active alerts.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${
                          SEVERITY_COLORS[alert.severity]
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="font-medium text-gray-900 truncate">{alert.title}</span>
                      {alert.campus && (
                        <span className="text-xs text-gray-400">{alert.campus.name}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{alert.body}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Posted {formatDateTime(alert.createdAt)}
                      {alert.expiresAt ? ` · Expires ${formatDateTime(alert.expiresAt)}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeactivate(alert.id)}
                    disabled={deactivating === alert.id}
                    className="text-xs text-red-600 hover:text-red-800 font-medium whitespace-nowrap disabled:opacity-50"
                  >
                    {deactivating === alert.id ? "Deactivating…" : "Deactivate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
