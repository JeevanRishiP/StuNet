import { requireAdmin } from "@/lib/rbac";

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const session = await requireAdmin();

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-400">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Signed in as <span className="font-mono text-slate-300">{session.role}</span>
            {session.managedCampusId && (
              <>
                {" "}
                — Campus:{" "}
                <span className="font-mono text-slate-300">{session.managedCampusId}</span>
              </>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {[
            {
              label: "Directory",
              href: "/directory",
              description: "Search and view student profiles",
            },
            {
              label: "Onboarding Queue",
              href: "/onboarding",
              description: "Pending institutional verifications",
            },
            { label: "Reports", href: "/reports", description: "Trust & safety queue" },
            {
              label: "Achievements",
              href: "/achievements",
              description: "Verify achievement submissions",
            },
            { label: "Campus Alerts", href: "/alerts", description: "Manage live campus alerts" },
            { label: "Audit Logs", href: "/audit", description: "Append-only action history" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg border border-slate-700 bg-slate-900 p-4 hover:border-brand-600 hover:bg-slate-800 transition-colors"
            >
              <div className="font-semibold text-slate-100">{item.label}</div>
              <div className="mt-1 text-xs text-slate-500">{item.description}</div>
            </a>
          ))}
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-sm text-slate-500">
          Phase 2 scaffold ✓ — Auth + TOTP MFA ready. Modules land Phase 4+.
        </div>
      </div>
    </main>
  );
}
