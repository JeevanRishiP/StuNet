export default function HomePage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-brand-700">
          StuNet
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          Student Community Platform — coming soon.
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
        Phase 0 scaffold ✓ — database + auth layers coming next.
      </div>
    </main>
  );
}
