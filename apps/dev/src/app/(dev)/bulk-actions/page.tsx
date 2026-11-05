"use client";

import { useCallback, useEffect, useState } from "react";
import { EntityTable } from "@/components/EntityTable";
import { CreateEditModal } from "@/components/CreateEditModal";

interface BulkAction {
  id: string;
  initiatedById: string;
  type: string;
  payload: Record<string, unknown>;
  confirmationText: string;
  revertableUntil: string;
  executedAt: string | null;
  revertedAt: string | null;
  revertedById: string | null;
  createdAt: string;
  initiator: { username: string; displayName: string } | null;
}

const TYPE_OPTS = [
  "BULK_VERIFY_ACHIEVEMENTS",
  "BULK_REMOVE_POSTS",
  "BULK_BAN_USERS",
  "BULK_ASSIGN_CLUB_ROLE",
].map((v) => ({ value: v, label: v }));

export default function BulkActionsPage() {
  const [actions, setActions] = useState<BulkAction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (typeFilter) params.set("type", typeFilter);
    const res = await fetch(`/api/dev/bulk-actions?${params}`);
    const data = (await res.json()) as { actions: BulkAction[]; total: number };
    setActions(data.actions ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, typeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAction(id: string, action: "execute" | "revert") {
    if (!confirm(`Are you sure you want to ${action} this bulk action?`)) return;
    await fetch("/api/dev/bulk-actions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    void load();
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/dev/bulk-actions", {
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

  async function handleDelete(a: BulkAction) {
    if (!confirm("Delete this bulk action record?")) return;
    await fetch(`/api/dev/bulk-actions?id=${a.id}`, { method: "DELETE" });
    void load();
  }

  const COLUMNS = [
    {
      key: "type",
      label: "Action Type",
      render: (a: BulkAction) => (
        <div>
          <span className="font-mono text-amber-400 text-xs font-bold">{a.type}</span>
          <p className="text-[10px] text-slate-500 mt-0.5">
            By {a.initiator ? a.initiator.displayName : a.initiatedById}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (a: BulkAction) => {
        if (a.revertedAt) {
          return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              REVERTED
            </span>
          );
        }
        if (a.executedAt) {
          return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              EXECUTED
            </span>
          );
        }
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            PENDING
          </span>
        );
      },
    },
    {
      key: "revertWindow",
      label: "Revert Window",
      render: (a: BulkAction) => {
        const until = new Date(a.revertableUntil);
        const isExpired = Date.now() > until.getTime();
        return (
          <div className="text-xs">
            <span className={isExpired ? "text-slate-500" : "text-emerald-400 font-mono"}>
              {until.toLocaleTimeString()} ({isExpired ? "Expired" : "Active"})
            </span>
          </div>
        );
      },
    },
    {
      key: "payload",
      label: "Payload",
      render: (a: BulkAction) => (
        <code className="text-[10px] bg-slate-950 px-2 py-1 rounded border border-slate-800 text-slate-300 block max-w-xs truncate">
          {JSON.stringify(a.payload)}
        </code>
      ),
    },
    {
      key: "quickActions",
      label: "Actions",
      render: (a: BulkAction) => {
        const canRevert = !a.revertedAt && Date.now() < new Date(a.revertableUntil).getTime();
        return (
          <div className="flex gap-2">
            {!a.executedAt && !a.revertedAt && (
              <button
                onClick={() => void handleAction(a.id, "execute")}
                className="text-[10px] px-2 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded hover:bg-emerald-500/30 font-bold"
              >
                Execute
              </button>
            )}
            {canRevert && (
              <button
                onClick={() => void handleAction(a.id, "revert")}
                className="text-[10px] px-2 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded hover:bg-purple-500/30 font-bold"
              >
                Revert
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const FIELDS = [
    {
      key: "type",
      label: "Action Type",
      type: "select" as const,
      options: TYPE_OPTS,
      required: true,
    },
    {
      key: "payload",
      label: 'JSON Payload (e.g. {"ids": ["..."]})',
      type: "textarea" as const,
      required: true,
    },
    { key: "revertMinutes", label: "Revert Window (Minutes)", placeholder: "60" },
    { key: "confirmationText", label: "Confirmation Text", placeholder: "CONFIRM_DEV_BULK_ACTION" },
  ];

  return (
    <>
      <EntityTable
        title="Pending & Historic Bulk Actions"
        data={actions}
        columns={COLUMNS}
        total={total}
        page={page}
        limit={20}
        onPageChange={setPage}
        onDelete={handleDelete}
        onAdd={() => {
          setForm({
            type: "BULK_REMOVE_POSTS",
            payload: '{"postIds": []}',
            revertMinutes: "60",
            confirmationText: "CONFIRM_DEV_BULK_ACTION",
          });
          setSaveError(null);
          setModalOpen(true);
        }}
        addLabel="Create Bulk Action"
        loading={loading}
        filters={
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
          >
            <option value="">All Types</option>
            {TYPE_OPTS.map((o) => (
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
        title="Stage Bulk Action"
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
