"use client";

import { useCallback, useEffect, useState } from "react";
import { EntityTable } from "@/components/EntityTable";
import { CreateEditModal } from "@/components/CreateEditModal";

interface Alert {
  id: string;
  title: string;
  body: string;
  severity: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  campus: { name: string };
}

const SEV_OPTS = ["INFO", "WARNING", "CRITICAL"].map((v) => ({ value: v, label: v }));
const SEV_COLORS: Record<string, string> = {
  INFO: "text-blue-400",
  WARNING: "text-amber-400",
  CRITICAL: "text-rose-400",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [sevFilter, setSevFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [campuses, setCampuses] = useState<{ id: string; name: string; city: string }[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCampuses() {
      try {
        const res = await fetch("/api/dev/campuses");
        const data = (await res.json()) as {
          campuses: { id: string; name: string; city: string }[];
        };
        setCampuses(data.campuses ?? []);
      } catch {
        // ignore
      }
    }
    void loadCampuses();
  }, []);

  const fields = [
    {
      key: "campusId",
      label: "Campus",
      type: "searchable-select" as const,
      required: true,
      placeholder: "Search or select campus…",
      options: campuses.map((c) => ({
        value: c.id,
        label: `${c.name} (${c.city})`,
      })),
    },
    {
      key: "createdById",
      label: "Created By (User ID)",
      placeholder: "cuid... (defaults to dev-console)",
    },
    {
      key: "severity",
      label: "Severity",
      type: "select" as const,
      options: SEV_OPTS,
      required: true,
    },
    { key: "title", label: "Title", required: true },
    { key: "body", label: "Message / Body", type: "textarea" as const, required: true },
    { key: "expiresAt", label: "Expires At (ISO date)", placeholder: "2024-12-31" },
  ];

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (sevFilter) params.set("severity", sevFilter);
    if (activeFilter !== "") params.set("active", activeFilter);
    const res = await fetch(`/api/dev/alerts?${params}`);
    const data = (await res.json()) as { alerts: Alert[] };
    setAlerts(data.alerts);
    setLoading(false);
  }, [sevFilter, activeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleActive(a: Alert) {
    await fetch("/api/dev/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, isActive: !a.isActive }),
    });
    void load();
  }

  async function handleDelete(a: Alert) {
    if (!confirm(`Delete alert "${a.title}"?`)) return;
    await fetch(`/api/dev/alerts?id=${a.id}`, { method: "DELETE" });
    void load();
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/dev/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error: string; detail?: string };
        setSaveError(err.detail ?? err.error);
        return;
      }
      setModalOpen(false);
      void load();
    } finally {
      setSaving(false);
    }
  }

  const COLUMNS = [
    {
      key: "severity",
      label: "Severity",
      render: (a: Alert) => (
        <span className={`font-bold text-[10px] ${SEV_COLORS[a.severity] ?? "text-slate-400"}`}>
          {a.severity}
        </span>
      ),
    },
    { key: "campus", label: "Campus", render: (a: Alert) => a.campus?.name ?? "—" },
    {
      key: "title",
      label: "Title",
      render: (a: Alert) => <span className="text-white font-medium">{a.title}</span>,
    },
    {
      key: "body",
      label: "Message",
      render: (a: Alert) => (
        <span className="text-slate-400 truncate max-w-[200px] block">{a.body}</span>
      ),
    },
    {
      key: "isActive",
      label: "Active",
      render: (a: Alert) => (
        <button
          onClick={() => void toggleActive(a)}
          className={`text-[10px] font-bold ${a.isActive ? "text-emerald-400" : "text-slate-600"}`}
        >
          {a.isActive ? "● ACTIVE" : "○ OFF"}
        </button>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (a: Alert) => new Date(a.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <>
      <EntityTable
        title="Campus Alerts"
        data={alerts}
        columns={COLUMNS}
        total={alerts.length}
        page={1}
        limit={alerts.length || 1}
        onPageChange={() => {}}
        onDelete={handleDelete}
        onAdd={() => {
          setForm({ severity: "INFO" });
          setSaveError(null);
          setModalOpen(true);
        }}
        addLabel="Create Alert"
        loading={loading}
        filters={
          <>
            <select
              value={sevFilter}
              onChange={(e) => setSevFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
            >
              <option value="">All Severities</option>
              {SEV_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
            >
              <option value="">All</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>
          </>
        }
      />
      <CreateEditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Campus Alert"
        fields={fields}
        values={form}
        onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))}
        onSubmit={handleSave}
        loading={saving}
        error={saveError}
        submitLabel="Create Alert"
      />
    </>
  );
}
