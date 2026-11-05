"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

const ACTIONS = [
  { id: "edit_club_members", label: "Can edit club members", resource: "club" },
  { id: "create_club_post", label: "Can create club post", resource: "club" },
  { id: "verify_achievement", label: "Can verify achievements", resource: "achievement" },
  { id: "ban_user", label: "Can ban users", resource: "user" },
  { id: "create_alert", label: "Can create campus alerts", resource: "campus" },
  { id: "view_audit_log", label: "Can view audit log", resource: "audit" },
  { id: "manage_campuses", label: "Can manage all campuses", resource: "campus" },
  { id: "bulk_actions", label: "Can perform bulk actions", resource: "bulk" },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  STUDENT: [],
  CLUB_MANAGER: ["create_club_post"],
  CLUB_PRESIDENT: ["edit_club_members", "create_club_post"],
  CAMPUS_MANAGER: ["verify_achievement", "ban_user", "create_alert", "view_audit_log"],
  SUPER_ADMIN: [
    "edit_club_members",
    "create_club_post",
    "verify_achievement",
    "ban_user",
    "create_alert",
    "view_audit_log",
    "manage_campuses",
    "bulk_actions",
  ],
};

const ROLES = Object.keys(ROLE_PERMISSIONS);

export default function PermissionsPage() {
  const [selectedRole, setSelectedRole] = useState("STUDENT");
  const [userId, setUserId] = useState("");
  const [testing, setTesting] = useState(false);

  const allowed = ROLE_PERMISSIONS[selectedRole] ?? [];

  async function testLive() {
    if (!userId) return;
    setTesting(true);
    // Fetch actual user role from DB and compute permissions
    const res = await fetch(`/api/dev/users?q=${userId}&limit=1`);
    const data = (await res.json()) as { users: { role: string; id: string; username: string }[] };
    const user = data.users.find((u) => u.id === userId || u.username === userId);
    if (user) setSelectedRole(user.role);
    setTesting(false);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Permission Tester</h1>
        <p className="text-sm text-slate-500 mt-1">
          Check what any role or user can do across the entire platform.
        </p>
      </div>

      {/* Role selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white">Select Role</h2>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                selectedRole === role
                  ? "bg-amber-500 text-slate-950"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-800">
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Or enter a User ID to test their actual role…"
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
          <button
            onClick={() => void testLive()}
            disabled={!userId || testing}
            className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Test Live
          </button>
        </div>
      </div>

      {/* Permission Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/40">
          <p className="text-xs font-bold text-white">
            Permission Matrix — <span className="text-amber-400">{selectedRole}</span>
          </p>
        </div>
        <div className="divide-y divide-slate-800/60">
          {ACTIONS.map((action) => {
            const isAllowed = allowed.includes(action.id);
            return (
              <div key={action.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-white">{action.label}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    resource: {action.resource} · action_id: {action.id}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isAllowed ? (
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-bold">ALLOWED</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-rose-400">
                      <XCircle className="h-4 w-4" />
                      <span className="text-xs font-bold">DENIED</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Role × Action matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/40">
          <p className="text-xs font-bold text-white">Full Role × Action Matrix</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-4 py-2 text-slate-500 font-semibold">Action</th>
                {ROLES.map((r) => (
                  <th
                    key={r}
                    className={`px-3 py-2 font-bold ${selectedRole === r ? "text-amber-400" : "text-slate-500"}`}
                  >
                    {r.replace("_", " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ACTIONS.map((action) => (
                <tr key={action.id} className="border-b border-slate-800/50">
                  <td className="px-4 py-2 text-slate-400">{action.label}</td>
                  {ROLES.map((role) => (
                    <td key={role} className="px-3 py-2 text-center">
                      {(ROLE_PERMISSIONS[role] ?? []).includes(action.id) ? (
                        <span className="text-emerald-400">✓</span>
                      ) : (
                        <span className="text-slate-700">✗</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
