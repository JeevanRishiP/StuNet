"use client";

import { useCallback, useEffect, useState } from "react";
import { EntityTable } from "@/components/EntityTable";
import { CreateEditModal } from "@/components/CreateEditModal";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  isRead: boolean;
  createdAt: string;
  userId: string;
  user: { displayName: string | null; username: string | null };
}

const TYPE_OPTS = [
  "CONNECTION_REQUEST",
  "CONNECTION_ACCEPTED",
  "POST_LIKE",
  "POST_COMMENT",
  "ACHIEVEMENT_VERIFIED",
  "ACHIEVEMENT_REJECTED",
  "CLUB_INVITE",
  "CLUB_ROLE_ASSIGNED",
  "CLUB_ROLE_REVOKED",
  "SUGGESTION_VOTE",
  "LIVE_ALERT",
  "MARKET_INTEREST",
  "REPORT_RESOLVED",
  "SYSTEM",
].map((v) => ({ value: v, label: v }));

const FIELDS = [
  { key: "userId", label: "Target User ID", required: true, placeholder: "cuid..." },
  { key: "type", label: "Type", type: "select" as const, options: TYPE_OPTS, required: true },
  { key: "title", label: "Title", required: true },
  { key: "body", label: "Body Text", type: "textarea" as const },
  { key: "actionUrl", label: "Action URL" },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [isReadFilter, setIsReadFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (typeFilter) params.set("type", typeFilter);
    if (isReadFilter !== "") params.set("isRead", isReadFilter);
    const res = await fetch(`/api/dev/notifications?${params}`);
    const data = (await res.json()) as { notifications: Notification[]; total: number };
    setNotifications(data.notifications);
    setTotal(data.total);
    setLoading(false);
  }, [page, typeFilter, isReadFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleRead(n: Notification) {
    await fetch("/api/dev/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: n.id, isRead: !n.isRead }),
    });
    void load();
  }

  async function handleDelete(n: Notification) {
    if (!confirm("Delete this notification?")) return;
    await fetch(`/api/dev/notifications?id=${n.id}`, { method: "DELETE" });
    void load();
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/dev/notifications", {
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
      key: "user",
      label: "User",
      render: (n: Notification) => (
        <span className="text-white">{n.user.displayName ?? n.user.username}</span>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (n: Notification) => (
        <span className="text-[10px] font-mono text-amber-400">{n.type}</span>
      ),
    },
    {
      key: "title",
      label: "Title",
      render: (n: Notification) => (
        <span className="text-xs truncate max-w-[180px] block">{n.title}</span>
      ),
    },
    {
      key: "isRead",
      label: "Read",
      render: (n: Notification) => (
        <button
          onClick={() => void toggleRead(n)}
          className={`text-[10px] font-bold ${n.isRead ? "text-slate-600" : "text-amber-400"}`}
        >
          {n.isRead ? "READ" : "UNREAD"}
        </button>
      ),
    },
    {
      key: "createdAt",
      label: "Sent",
      render: (n: Notification) => new Date(n.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <>
      <EntityTable
        title="Notifications"
        data={notifications}
        columns={COLUMNS}
        total={total}
        page={page}
        limit={20}
        onPageChange={setPage}
        onDelete={handleDelete}
        onAdd={() => {
          setForm({ type: "SYSTEM" });
          setSaveError(null);
          setModalOpen(true);
        }}
        addLabel="Send Notification"
        loading={loading}
        filters={
          <>
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
            <select
              value={isReadFilter}
              onChange={(e) => {
                setIsReadFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
            >
              <option value="">All</option>
              <option value="false">Unread</option>
              <option value="true">Read</option>
            </select>
          </>
        }
      />
      <CreateEditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Send Notification"
        fields={FIELDS}
        values={form}
        onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))}
        onSubmit={handleSave}
        loading={saving}
        error={saveError}
        submitLabel="Send"
      />
    </>
  );
}
