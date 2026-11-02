"use client";

/**
 * Admin Onboarding Queue — /onboarding
 * Lists users pending verification. CAMPUS_MANAGER sees only their campus.
 * Admin can approve or reject each user, with optional reason.
 */
import { useEffect, useState } from "react";

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

    // Guard: if user closed the prompt without typing, still allow null reason
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Onboarding Queue</h1>
        <span className="text-sm text-gray-500">{pending.length} pending</span>
      </div>

      {loading && <p className="text-sm text-gray-400 text-center py-8">Loading…</p>}

      {!loading && pending.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <p className="text-gray-500">🎉 No pending verifications!</p>
        </div>
      )}

      <div className="space-y-3">
        {pending.map((u) => (
          <div
            key={u.id}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4"
          >
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">{u.displayName}</p>
              <p className="text-sm text-gray-500">
                @{u.username} · {u.campusName ?? "No campus"} · registered{" "}
                {new Date(u.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => handleAction(u.id, "APPROVE")}
                disabled={working === u.id}
                className="bg-green-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => handleAction(u.id, "REJECT")}
                disabled={working === u.id}
                className="bg-red-100 text-red-700 text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-red-200 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
