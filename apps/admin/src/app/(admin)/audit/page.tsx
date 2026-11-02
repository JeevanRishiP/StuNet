/**
 * Admin Audit Log — /audit
 * Append-only history of all admin actions.
 * Read-only — admins cannot edit or delete entries (enforced at DB level too).
 * SUPER_ADMIN sees all; CAMPUS_MANAGER sees only entries where targetId is on their campus.
 */
import { requireAdmin } from "@/lib/rbac";
import { adminDb } from "@/lib/db";

export default async function AuditPage() {
  // Require admin auth (redirects to /login if not authenticated)
  await requireAdmin(["SUPER_ADMIN", "CAMPUS_MANAGER"]);

  const logs = await adminDb.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      action: true,
      targetType: true,
      targetId: true,
      metaJson: true,
      createdAt: true,
      adminId: true,
      admin: {
        select: { username: true, displayName: true },
      },
    },
  });

  const actionColor: Record<string, string> = {
    ONBOARDING_APPROVE: "text-green-400",
    ONBOARDING_REJECT: "text-red-400",
    USER_BAN: "text-red-500",
    USER_UNBAN: "text-yellow-400",
    CLUB_ROLE_ASSIGN: "text-blue-400",
    CLUB_ROLE_REVOKE: "text-orange-400",
    REPORT_DISMISS: "text-slate-400",
    REPORT_RESOLVE_NO_ACTION: "text-slate-300",
    REPORT_RESOLVE_ACTION_TAKEN: "text-red-400",
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-100">Audit Log</h1>
      <p className="text-sm text-slate-500">Last 100 admin actions (append-only, non-editable)</p>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 border-b border-slate-700">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-400">Action</th>
              <th className="text-left px-4 py-3 font-medium text-slate-400">Target</th>
              <th className="text-left px-4 py-3 font-medium text-slate-400">Admin</th>
              <th className="text-left px-4 py-3 font-medium text-slate-400">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-700/40">
                <td className="px-4 py-3">
                  <span
                    className={`font-mono text-xs ${actionColor[log.action] ?? "text-slate-300"}`}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs font-mono">
                  {log.targetType}:{log.targetId.slice(0, 12)}…
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {log.admin?.displayName ?? log.adminId.slice(0, 8)}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {logs.length === 0 && (
          <p className="text-center text-slate-500 text-sm py-8">No audit entries yet.</p>
        )}
      </div>
    </div>
  );
}
