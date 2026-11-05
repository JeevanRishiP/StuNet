"use client";

import { useCallback, useEffect, useState } from "react";
import { EntityTable } from "@/components/EntityTable";
import { CreateEditModal } from "@/components/CreateEditModal";

interface DeletionRequest {
  id: string;
  userId: string;
  status: "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED";
  requestedAt: string;
  scheduledAt: string | null;
  completedAt: string | null;
  reviewedById: string | null;
  notes: string | null;
  user: { username: string; displayName: string } | null;
}

const STATUS_OPTS = ["PENDING", "APPROVED", "COMPLETED", "REJECTED"].map((v) => ({
  value: v,
  label: v,
}));

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  APPROVED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function DeletionsPage() {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/dev/deletions?${params}`);
    const data = (await res.json()) as { requests: DeletionRequest[]; total: number };
    setRequests(data.requests ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleStatusChange(id: string, newStatus: string) {
    await fetch("/api/dev/deletions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        status: newStatus,
        completedAt: newStatus === "COMPLETED" ? new Date().toISOString() : null,
      }),
    });
    void load();
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/dev/deletions", {
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

  async function handleDelete(r: DeletionRequest) {
    if (!confirm("Delete this deletion request record?")) return;
    await fetch(`/api/dev/deletions?id=${r.id}`, { method: "DELETE" });
    void load();
  }

  const COLUMNS = [
    {
      key: "userId",
      label: "Target User",
      render: (r: DeletionRequest) => (
        <div>
          <p className="text-white font-medium">{r.user ? r.user.displayName : r.userId}</p>
          {r.user && (
            <p className="text-[10px] text-slate-500">
              @{r.user.username} • {r.userId}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r: DeletionRequest) => (
        <select
          value={r.status}
          onChange={(e) => void handleStatusChange(r.id, e.target.value)}
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border bg-slate-900 cursor-pointer focus:outline-none ${
            STATUS_COLORS[r.status] ?? "text-slate-400"
          }`}
        >
          {STATUS_OPTS.map((o) => (
            <option key={o.value} value={o.value} className="bg-slate-900 text-white">
              {o.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "requestedAt",
      label: "Requested",
      render: (r: DeletionRequest) => new Date(r.requestedAt).toLocaleDateString(),
    },
    {
      key: "scheduledAt",
      label: "Scheduled At",
      render: (r: DeletionRequest) =>
        r.scheduledAt ? (
          new Date(r.scheduledAt).toLocaleDateString()
        ) : (
          <span className="text-slate-600">—</span>
        ),
    },
    {
      key: "notes",
      label: "Notes",
      render: (r: DeletionRequest) => (
        <span className="text-slate-400 text-xs truncate max-w-xs block">{r.notes ?? "—"}</span>
      ),
    },
  ];

  const FIELDS = [
    { key: "userId", label: "Target User ID", required: true, placeholder: "cuid..." },
    {
      key: "status",
      label: "Initial Status",
      type: "select" as const,
      options: STATUS_OPTS,
      required: true,
    },
    { key: "notes", label: "Notes", type: "textarea" as const },
    { key: "scheduledAt", label: "Scheduled At (YYYY-MM-DD, optional)" },
  ];

  return (
    <>
      <EntityTable
        title="Data Deletion Requests"
        data={requests}
        columns={COLUMNS}
        total={total}
        page={page}
        limit={20}
        onPageChange={setPage}
        onDelete={handleDelete}
        onAdd={() => {
          setForm({ status: "PENDING" });
          setSaveError(null);
          setModalOpen(true);
        }}
        addLabel="Create Test Request"
        loading={loading}
        filters={
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
        }
      />

      <CreateEditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Deletion Request"
        fields={FIELDS}
        values={form}
        onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))}
        onSubmit={handleSave}
        loading={saving}
        error={saveError}
      />
    </>
  );
}
