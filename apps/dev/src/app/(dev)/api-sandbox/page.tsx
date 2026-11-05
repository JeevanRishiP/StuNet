"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";

const STUDENT_ROUTES = [
  { method: "GET", path: "/api/posts" },
  { method: "POST", path: "/api/posts" },
  { method: "GET", path: "/api/clubs" },
  { method: "GET", path: "/api/clubs/[clubId]" },
  { method: "GET", path: "/api/clubs/[clubId]/members" },
  { method: "GET", path: "/api/connections" },
  { method: "POST", path: "/api/connections" },
  { method: "GET", path: "/api/campus/alerts" },
  { method: "GET", path: "/api/campus/schedule" },
  { method: "GET", path: "/api/campus/calendar" },
  { method: "GET", path: "/api/marketplace" },
  { method: "POST", path: "/api/marketplace" },
  { method: "GET", path: "/api/achievements" },
  { method: "GET", path: "/api/notifications" },
  { method: "GET", path: "/api/users/me" },
  { method: "GET", path: "/api/users/[username]" },
  { method: "POST", path: "/api/reports" },
];

const ADMIN_ROUTES = [
  { method: "GET", path: "/api/campuses" },
  { method: "POST", path: "/api/campuses" },
  { method: "GET", path: "/api/directory" },
  { method: "GET", path: "/api/onboarding" },
  { method: "GET", path: "/api/reports" },
  { method: "PATCH", path: "/api/reports/[reportId]" },
  { method: "GET", path: "/api/achievements" },
  { method: "PATCH", path: "/api/achievements/[achievementId]" },
  { method: "GET", path: "/api/alerts" },
  { method: "POST", path: "/api/alerts" },
  { method: "GET", path: "/api/schedules" },
];

type Portal = "student" | "admin";
const PORTAL_PORT: Record<Portal, number> = { student: 3010, admin: 3011 };

export default function ApiSandboxPage() {
  const [portal, setPortal] = useState<Portal>("student");
  const [method, setMethod] = useState("GET");
  const [path, setPath] = useState("/api/posts");
  const [body, setBody] = useState("{}");
  const [response, setResponse] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [asUserId, setAsUserId] = useState("");

  const routes = portal === "student" ? STUDENT_ROUTES : ADMIN_ROUTES;

  async function send() {
    setLoading(true);
    setResponse(null);
    setStatus(null);

    try {
      const baseUrl = `http://localhost:${PORTAL_PORT[portal]}`;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (asUserId) headers["x-dev-impersonate"] = asUserId;

      const opts: RequestInit = {
        method,
        headers,
        ...(method !== "GET" && method !== "HEAD" ? { body } : {}),
      };

      const res = await fetch(`${baseUrl}${path}`, opts);
      setStatus(res.status);
      const text = await res.text();
      try {
        setResponse(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setResponse(text);
      }
    } catch (e) {
      setResponse(`Error: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">API Sandbox</h1>
        <p className="text-sm text-slate-500 mt-1">
          Test any API route on the Student or Admin portal with any user identity.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Route list */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex gap-1 p-2 border-b border-slate-800">
            {(["student", "admin"] as Portal[]).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPortal(p);
                  setPath(p === "student" ? "/api/posts" : "/api/campuses");
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${portal === p ? "bg-amber-500 text-slate-950" : "text-slate-500 hover:text-white"}`}
              >
                {p === "student" ? "🎓 Student" : "🔒 Admin"}
              </button>
            ))}
          </div>
          <div className="divide-y divide-slate-800/50 max-h-[480px] overflow-y-auto">
            {routes.map((r) => (
              <button
                key={`${r.method}${r.path}`}
                onClick={() => {
                  setMethod(r.method);
                  setPath(r.path);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-800/50 transition-colors ${path === r.path && method === r.method ? "bg-amber-500/10" : ""}`}
              >
                <span
                  className={`text-[9px] font-bold w-8 shrink-0 ${r.method === "GET" ? "text-emerald-400" : r.method === "POST" ? "text-blue-400" : r.method === "PATCH" ? "text-amber-400" : "text-rose-400"}`}
                >
                  {r.method}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{r.path}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Request + Response */}
        <div className="lg:col-span-2 space-y-3">
          {/* Request builder */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex gap-2">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-amber-400 focus:outline-none"
              >
                {["GET", "POST", "PATCH", "PUT", "DELETE"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>

            <input
              value={asUserId}
              onChange={(e) => setAsUserId(e.target.value)}
              placeholder="As User ID (optional — sets x-dev-impersonate header)"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />

            {method !== "GET" && (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                placeholder="Request body (JSON)…"
              />
            )}

            <button
              onClick={() => void send()}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-bold transition-colors"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {loading ? "Sending…" : "Send Request"}
            </button>
          </div>

          {/* Response */}
          {response !== null && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div
                className={`flex items-center gap-2 px-4 py-2.5 border-b border-slate-800 ${status && status < 300 ? "bg-emerald-500/5" : "bg-rose-500/5"}`}
              >
                <span
                  className={`text-xs font-bold ${status && status < 300 ? "text-emerald-400" : "text-rose-400"}`}
                >
                  {status} {status && status < 300 ? "OK" : "Error"}
                </span>
                <span className="text-[10px] text-slate-500">
                  {portal === "student" ? "Student Portal" : "Admin Portal"} · {path}
                </span>
              </div>
              <pre className="p-4 text-[10px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                {response}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
