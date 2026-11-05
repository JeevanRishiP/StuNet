"use client";

import { useEffect, useState } from "react";
import { UserCog, ExternalLink, X } from "lucide-react";

interface UserOption {
  id: string;
  displayName: string | null;
  username: string | null;
  role: string;
  campus: { name: string } | null;
  clubMemberships?: { club: { name: string }; role: string }[];
}

export default function ImpersonatePage() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<UserOption | null>(null);
  const [impersonating, setImpersonating] = useState<UserOption | null>(null);

  useEffect(() => {
    if (search.length < 2) {
      setUsers([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/dev/users?q=${encodeURIComponent(search)}&limit=10`);
      const data = (await res.json()) as { users: UserOption[] };
      setUsers(data.users);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function startImpersonation(user: UserOption) {
    await fetch("/api/dev/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    setImpersonating(user);
    setSelected(null);
  }

  async function stopImpersonation() {
    await fetch("/api/dev/impersonate", { method: "DELETE" });
    setImpersonating(null);
  }

  const ROLE_COLORS: Record<string, string> = {
    STUDENT: "text-slate-300",
    CLUB_MANAGER: "text-purple-400",
    CAMPUS_MANAGER: "text-amber-400",
    SUPER_ADMIN: "text-rose-400",
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Role Impersonator</h1>
        <p className="text-sm text-slate-500 mt-1">
          Log into the Student or Admin portal as any user. Opens in a new tab with an impersonation
          cookie.
        </p>
      </div>

      {/* Active Impersonation Banner */}
      {impersonating && (
        <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <UserCog className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-400">Active Impersonation</p>
              <p className="text-xs text-slate-400">
                {impersonating.displayName ?? impersonating.username} ·{" "}
                <span className={ROLE_COLORS[impersonating.role] ?? "text-slate-400"}>
                  {impersonating.role}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={() => void stopImpersonation()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Stop Impersonation
          </button>
        </div>
      )}

      {/* Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white">Select User to Impersonate</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or username…"
          className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        />

        {loading && <p className="text-xs text-slate-600">Searching…</p>}

        {users.length > 0 && (
          <div className="space-y-1">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelected(u)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors ${
                  selected?.id === u.id
                    ? "bg-amber-500/15 border border-amber-500/30"
                    : "bg-slate-800/50 hover:bg-slate-800 border border-transparent"
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-white">{u.displayName ?? u.username}</p>
                  <p className="text-[10px] text-slate-500">
                    @{u.username} · {u.campus?.name ?? "No campus"}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold ${ROLE_COLORS[u.role] ?? "text-slate-400"}`}
                >
                  {u.role}
                </span>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="border-t border-slate-800 pt-4 space-y-3">
            <p className="text-xs text-slate-400">
              Selected:{" "}
              <strong className="text-white">{selected.displayName ?? selected.username}</strong> (
              {selected.role})
            </p>
            <div className="flex gap-2">
              <a
                href={`http://localhost:3010?__dev_impersonate=${selected.id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => void startImpersonation(selected)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open as Student Portal
              </a>
              <a
                href={`http://localhost:3011?__dev_impersonate=${selected.id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => void startImpersonation(selected)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open as Admin Portal
              </a>
            </div>
            <p className="text-[10px] text-slate-600">
              Tip: This sets a <code>x-dev-impersonate</code> cookie. Add impersonation middleware
              to apps/web and apps/admin to intercept it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
