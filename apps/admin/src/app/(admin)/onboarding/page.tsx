"use client";

import { useEffect, useState } from "react";
import { UserCheck, Check, X, Clock } from "lucide-react";

interface PendingUser {
  id: string;
  displayName: string;
  username: string;
  campusName: string | null;
  createdAt: string;
}

export default function OnboardingPage() {
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/onboarding");
    if (res.ok) {
      const data: { pending: PendingUser[] } = await res.json();
      setPending(data.pending);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAction(userId: string, action: "APPROVE" | "REJECT") {
    const reason = action === "REJECT" ? window.prompt("Rejection reason (optional):") : null;
    setWorking(userId);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, reason: reason ?? undefined }),
    });
    if (res.ok) {
      setPending((prev) => prev.filter((u) => u.id !== userId));
    } else {
      const body = await res.json().catch(() => ({}));
      alert((body as { error?: string }).error ?? "Action failed.");
    }
    setWorking(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Onboarding Queue</h1>
          <p className="mt-1 text-xs text-slate-400">
            Pending student verifications requiring administrative review.
          </p>
        </div>
        <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-300">
          {pending.length} Pending
        </span>
      </div>

      {loading && (
        <div className="py-12 text-center text-xs text-slate-400">Loading onboarding queue…</div>
      )}

      {!loading && pending.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center">
          <UserCheck className="mx-auto h-12 w-12 text-emerald-400 mb-3" />
          <h3 className="text-sm font-bold text-white">All Clear! No Pending Verifications</h3>
          <p className="mt-1 text-xs text-slate-400">
            All registered students on this campus are verified or processed.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {pending.map((u) => (
          <div
            key={u.id}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-4 flex items-center justify-between gap-4 hover:border-slate-700 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-white">{u.displayName}</p>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>@{u.username}</span>
                <span>·</span>
                <span className="text-indigo-400">{u.campusName ?? "Unassigned Campus"}</span>
                <span>·</span>
                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Clock className="h-3 w-3" />
                  {new Date(u.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleAction(u.id, "APPROVE")}
                disabled={working === u.id}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Approve</span>
              </button>
              <button
                onClick={() => handleAction(u.id, "REJECT")}
                disabled={working === u.id}
                className="flex items-center gap-1.5 rounded-xl border border-rose-800/80 bg-rose-950/60 px-3.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900 disabled:opacity-50 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reject</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
