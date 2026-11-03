"use client";

import { useEffect, useState, useCallback } from "react";
import { Search } from "lucide-react";

interface AdminUser {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  headline: string | null;
  role: string;
  verificationStatus: string;
  campusId: string | null;
  campusName: string | null;
  isActive: boolean;
  isBanned: boolean;
  createdAt: string;
}

export default function DirectoryPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRole] = useState("");
  const [statusFilter, setStatus] = useState("");

  const load = useCallback(
    async (reset: boolean) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("name", search);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (!reset && cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/directory?${params.toString()}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data: { users: AdminUser[]; nextCursor: string | null } = await res.json();

      setUsers((prev) => (reset ? data.users : [...prev, ...data.users]));
      setCursor(data.nextCursor);
      setHasMore(data.nextCursor !== null);
      setLoading(false);
    },
    [search, roleFilter, statusFilter, cursor],
  );

  useEffect(() => {
    setCursor(null);
    setHasMore(true);
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter, statusFilter]);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      VERIFIED: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      PENDING: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      REJECTED: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    };
    return map[s] ?? "bg-slate-800 text-slate-400";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">User Directory</h1>
        <p className="mt-1 text-xs text-slate-400">
          Search and inspect registered student identities. Scoped strictly to permitted fields.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search student name or username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-10 pr-4 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All Roles</option>
          <option value="STUDENT">Student</option>
          <option value="CAMPUS_MANAGER">Campus Manager</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="text-left px-5 py-3.5 font-bold">Student</th>
                <th className="text-left px-5 py-3.5 font-bold">Campus</th>
                <th className="text-left px-5 py-3.5 font-bold">Role</th>
                <th className="text-left px-5 py-3.5 font-bold">Verification Status</th>
                <th className="text-left px-5 py-3.5 font-bold">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="font-semibold text-white">{u.displayName}</p>
                      <p className="text-slate-400 text-[11px]">@{u.username}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-300">{u.campusName ?? "—"}</td>
                  <td className="px-5 py-3.5">
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadge(u.verificationStatus)}`}
                    >
                      {u.verificationStatus}
                    </span>
                    {u.isBanned && (
                      <span className="ml-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        BANNED
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="py-10 text-center text-xs text-slate-400">Loading student directory…</div>
        )}
        {!loading && users.length === 0 && (
          <div className="py-12 text-center text-xs text-slate-500">
            No students matched search criteria.
          </div>
        )}
      </div>

      {hasMore && !loading && (
        <div className="text-center pt-2">
          <button
            onClick={() => load(false)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-indigo-400 hover:bg-slate-800 transition-colors"
          >
            Load More Students
          </button>
        </div>
      )}
    </div>
  );
}
