"use client";

import { useCallback, useEffect, useState } from "react";
import { EntityTable } from "@/components/EntityTable";

interface Connection {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  createdAt: string;
  sender: { displayName: string | null; username: string | null };
  receiver: { displayName: string | null; username: string | null };
}

const STATUS_OPTS = ["PENDING", "ACCEPTED", "DECLINED"].map((v) => ({ value: v, label: v }));
const STATUS_COLORS: Record<string, string> = {
  PENDING: "text-amber-400",
  ACCEPTED: "text-emerald-400",
  DECLINED: "text-rose-400",
};

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/dev/connections?${params}`);
    const data = (await res.json()) as { connections: Connection[]; total: number };
    setConnections(data.connections);
    setTotal(data.total);
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeStatus(id: string, status: string) {
    await fetch("/api/dev/connections", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    void load();
  }

  async function handleDelete(c: Connection) {
    if (!confirm("Delete this connection?")) return;
    await fetch(`/api/dev/connections?id=${c.id}`, { method: "DELETE" });
    void load();
  }

  const COLUMNS = [
    {
      key: "sender",
      label: "Sender",
      render: (c: Connection) => (
        <span className="text-white">{c.sender.displayName ?? c.sender.username}</span>
      ),
    },
    {
      key: "receiver",
      label: "Receiver",
      render: (c: Connection) => (
        <span className="text-white">{c.receiver.displayName ?? c.receiver.username}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (c: Connection) => (
        <select
          value={c.status}
          onChange={(e) => void changeStatus(c.id, e.target.value)}
          className={`bg-transparent border-0 text-[10px] font-bold focus:outline-none cursor-pointer ${STATUS_COLORS[c.status] ?? "text-slate-400"}`}
        >
          {STATUS_OPTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      render: (c: Connection) => new Date(c.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <EntityTable
      title="Connections"
      data={connections}
      columns={COLUMNS}
      total={total}
      page={page}
      limit={20}
      onPageChange={setPage}
      onDelete={handleDelete}
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
  );
}
