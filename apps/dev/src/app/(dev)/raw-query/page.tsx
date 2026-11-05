"use client";

import { useState } from "react";
import { Play, Loader2, Download } from "lucide-react";

const EXAMPLE_QUERIES = [
  {
    label: "All users by role",
    sql: "SELECT role, COUNT(*) as count FROM user_identity GROUP BY role ORDER BY count DESC;",
  },
  {
    label: "Pending verifications",
    sql: "SELECT id, display_name, username, created_at FROM user_identity WHERE verification_status = 'PENDING' ORDER BY created_at DESC LIMIT 20;",
  },
  {
    label: "Open reports",
    sql: "SELECT r.id, r.content_type, r.reason, r.status, r.created_at, u.username AS reporter FROM reports r JOIN user_identity u ON u.id = r.submitter_id WHERE r.status = 'OPEN' ORDER BY r.created_at DESC LIMIT 20;",
  },
  {
    label: "Most active clubs",
    sql: "SELECT c.name, c.slug, COUNT(cm.id) AS member_count FROM clubs c LEFT JOIN club_members cm ON cm.club_id = c.id AND cm.is_active = true GROUP BY c.id, c.name, c.slug ORDER BY member_count DESC LIMIT 10;",
  },
  {
    label: "Recent posts",
    sql: "SELECT p.id, p.type, p.visibility, LEFT(p.content, 80) AS preview, u.username AS author, p.created_at FROM posts p JOIN user_identity u ON u.id = p.author_id ORDER BY p.created_at DESC LIMIT 20;",
  },
  {
    label: "Achievement stats",
    sql: "SELECT category, scope, verification_status, COUNT(*) as count FROM achievements GROUP BY category, scope, verification_status ORDER BY count DESC;",
  },
];

interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  fields: string[];
  executionMs: number;
}

export default function RawQueryPage() {
  const [sql, setSql] = useState(EXAMPLE_QUERIES[0]?.sql ?? "SELECT 1;");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runQuery() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/dev/raw-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      });
      const data = (await res.json()) as QueryResult & { error?: string };
      if (data.error) setError(data.error);
      else setResult(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!result) return;
    const header = result.fields.join(",");
    const rows = result.rows.map((r) =>
      result.fields.map((f) => JSON.stringify(r[f] ?? "")).join(","),
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query-result-${Date.now()}.csv`;
    a.click();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">Raw DB Query</h1>
        <p className="text-sm text-slate-500 mt-1">
          Read-only SQL queries against the database.{" "}
          <span className="text-rose-400 font-semibold">
            Write operations (INSERT, UPDATE, DELETE, DROP) are blocked.
          </span>
        </p>
      </div>

      {/* Example queries */}
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_QUERIES.map((q) => (
          <button
            key={q.label}
            onClick={() => setSql(q.sql)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-400 hover:text-white transition-colors"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* SQL Editor */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-950/40">
          <span className="text-xs font-bold text-slate-500">SQL (read-only)</span>
          <button
            onClick={() => void runQuery()}
            disabled={loading || !sql.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-bold transition-colors"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {loading ? "Running…" : "Run"}
          </button>
        </div>
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          rows={6}
          className="w-full p-4 bg-transparent text-xs text-slate-300 font-mono resize-none focus:outline-none"
          spellCheck={false}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-xs text-rose-400 font-mono">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-950/40">
            <span className="text-xs text-slate-500">
              {result.rowCount} rows · {result.executionMs}ms
            </span>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 bg-slate-950">
                <tr className="border-b border-slate-800">
                  {result.fields.map((f) => (
                    <th
                      key={f}
                      className="text-left px-3 py-2 text-slate-500 font-bold whitespace-nowrap"
                    >
                      {f}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/30">
                    {result.fields.map((f) => (
                      <td
                        key={f}
                        className="px-3 py-2 text-slate-300 whitespace-nowrap max-w-[200px] truncate"
                      >
                        {row[f] === null ? (
                          <span className="text-slate-700">NULL</span>
                        ) : (
                          String(row[f])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
