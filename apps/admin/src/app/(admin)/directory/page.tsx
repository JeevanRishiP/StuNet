"use client";

/**
 * Admin Directory — /directory
 * Search and browse all users. Admin-safe fields only.
 * CAMPUS_MANAGER sees only their campus. SUPER_ADMIN sees all.
 */
import { useEffect, useState, useCallback } from "react";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [search, roleFilter, statusFilter, cursor],
  );

  // Re-fetch from scratch when filters change
  useEffect(() => {
    setCursor(null);
    setHasMore(true);
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, roleFilter, statusFilter]);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      VERIFIED: "bg-green-100 text-green-700",
      PENDING: "bg-yellow-100 text-yellow-700",
      REJECTED: "bg-red-100 text-red-700",
    };
    return map[s] ?? "bg-gray-100 text-gray-600";
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">User Directory</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <input
          type="text"
          placeholder="Search name or username…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRole(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All roles</option>
          <option value="STUDENT">Student</option>
          <option value="CAMPUS_MANAGER">Campus Manager</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Campus</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{u.displayName}</p>
                    <p className="text-gray-400 text-xs">@{u.username}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{u.campusName ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{u.role}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(u.verificationStatus)}`}
                  >
                    {u.verificationStatus}
                  </span>
                  {u.isBanned && (
                    <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      BANNED
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && <p className="text-center text-sm text-gray-400 py-6">Loading…</p>}
        {!loading && users.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-6">No users found.</p>
        )}
      </div>

      {hasMore && !loading && (
        <div className="text-center">
          <button onClick={() => load(false)} className="text-sm text-blue-600 hover:underline">
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
