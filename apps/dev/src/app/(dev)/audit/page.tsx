"use client";

import { useCallback, useEffect, useState } from "react";
import { EntityTable } from "@/components/EntityTable";

interface AuditLog {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  ipAddress: string | null;
  createdAt: string;
  adminId: string;
  admin: { displayName: string | null; username: string | null };
  metaJson: unknown;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (actionFilter) params.set("action", actionFilter);
    const res = await fetch(`/api/dev/audit?${params}`);
    const data = (await res.json()) as { logs: AuditLog[]; total: number };
    setLogs(data.logs);
    setTotal(data.total);
    setLoading(false);
  }, [page, actionFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const COLUMNS = [
    {
      key: "action",
      label: "Action",
      render: (l: AuditLog) => (
        <span className="font-mono text-[10px] text-amber-400 font-bold">{l.action}</span>
      ),
    },
    {
      key: "targetType",
      label: "Target",
      render: (l: AuditLog) => <span className="text-[10px] text-slate-400">{l.targetType}</span>,
    },
    {
      key: "admin",
      label: "Admin",
      render: (l: AuditLog) => (
        <span className="text-white">{l.admin?.displayName ?? l.admin?.username ?? "System"}</span>
      ),
    },
    {
      key: "ipAddress",
      label: "IP",
      render: (l: AuditLog) => l.ipAddress ?? <span className="text-slate-600">—</span>,
    },
    {
      key: "metaJson",
      label: "Payload",
      render: (l: AuditLog) => (
        <button
          onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
          className="text-[10px] text-amber-400 hover:text-amber-300"
        >
          {expandedId === l.id ? "▲ Hide" : "▼ View"}
        </button>
      ),
    },
    {
      key: "createdAt",
      label: "When",
      render: (l: AuditLog) => new Date(l.createdAt).toLocaleString(),
    },
  ];

  return (
    <div className="space-y-4">
      <EntityTable
        title="Admin Audit Logs"
        data={logs}
        columns={COLUMNS}
        total={total}
        page={page}
        limit={20}
        onPageChange={setPage}
        loading={loading}
        filters={
          <input
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by action (e.g. BAN_USER)…"
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        }
      />

      {/* JSON Payload Viewer */}
      {expandedId &&
        (() => {
          const log = logs.find((l) => l.id === expandedId);
          if (!log) return null;
          return (
            <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-4">
              <p className="text-[10px] font-bold text-amber-400 mb-2">
                Payload for: {log.action} ({log.targetType} / {log.targetId})
              </p>
              <pre className="text-[10px] text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(log.metaJson, null, 2)}
              </pre>
            </div>
          );
        })()}
    </div>
  );
}
