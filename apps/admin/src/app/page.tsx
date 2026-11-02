export default function AdminHomePage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-brand-400">
          StuNet Admin
        </h1>
        <p className="mt-2 text-lg text-slate-400">
          Restricted — authorised personnel only.
        </p>
      </div>
      <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-sm text-slate-500">
        Phase 0 scaffold ✓ — RBAC + MFA auth coming in Phase 2.
      </div>
    </main>
  );
}
