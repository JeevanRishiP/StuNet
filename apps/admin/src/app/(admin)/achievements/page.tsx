"use client";

import { useEffect, useState } from "react";

interface Achievement {
  id: string;
  title: string;
  description: string | null;
  category: string;
  scope: string;
  platform: string | null;
  proofUrl: string | null;
  proofDocumentUrl: string | null;
  achievedAt: string;
  createdAt: string;
  userId: string;
  user: {
    displayName: string;
    username: string;
    campus?: { name: string } | null;
  };
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [rejectionInputs, setRejectionInputs] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const res = await fetch("/api/achievements");
    if (res.ok) {
      const d = await res.json();
      setAchievements(d.achievements ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAction(id: string, action: "VERIFY" | "REJECT", reason?: string) {
    if (action === "REJECT" && !reason?.trim()) return;
    setActing(id);
    await fetch(`/api/achievements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        rejectionReason: reason ?? undefined,
      }),
    });
    setActing(null);
    setRejectionInputs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    await load();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Achievement Verification</h1>
        <span className="text-sm text-gray-500">{achievements.length} pending</span>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : achievements.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🏆</p>
          <p className="text-sm">No pending achievement submissions.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {achievements.map((a) => (
            <div key={a.id} className="border border-gray-200 rounded-xl bg-white shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-900">{a.title}</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                      {a.category.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {a.scope.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Submitter */}
                  <p className="text-sm text-gray-500 mb-2">
                    By <span className="font-medium text-gray-700">{a.user.displayName}</span> (@
                    {a.user.username}){a.user.campus ? ` · ${a.user.campus.name}` : ""}
                  </p>

                  {/* Details */}
                  {a.description && <p className="text-sm text-gray-600 mb-2">{a.description}</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    {a.platform && <span>Platform: {a.platform}</span>}
                    <span>Achieved: {new Date(a.achievedAt).toLocaleDateString("en-IN")}</span>
                    {a.proofUrl && (
                      <a
                        href={a.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        Proof Link ↗
                      </a>
                    )}
                    {a.proofDocumentUrl && (
                      <a
                        href={a.proofDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        Document ↗
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => handleAction(a.id, "VERIFY")}
                    disabled={acting === a.id}
                    className="bg-green-600 text-white text-xs font-semibold px-4 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {acting === a.id ? "…" : "Verify ✓"}
                  </button>

                  {/* Rejection flow */}
                  {rejectionInputs[a.id] === undefined ? (
                    <button
                      onClick={() => setRejectionInputs((p) => ({ ...p, [a.id]: "" }))}
                      disabled={acting === a.id}
                      className="bg-red-50 border border-red-300 text-red-700 text-xs font-semibold px-4 py-1.5 rounded-lg hover:bg-red-100 disabled:opacity-50"
                    >
                      Reject ✕
                    </button>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <input
                        type="text"
                        maxLength={500}
                        placeholder="Rejection reason…"
                        value={rejectionInputs[a.id]}
                        onChange={(e) =>
                          setRejectionInputs((p) => ({
                            ...p,
                            [a.id]: e.target.value,
                          }))
                        }
                        className="border border-red-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-400 w-48"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAction(a.id, "REJECT", rejectionInputs[a.id])}
                          disabled={!rejectionInputs[a.id]?.trim() || acting === a.id}
                          className="flex-1 bg-red-600 text-white text-xs font-semibold py-1 rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() =>
                            setRejectionInputs((p) => {
                              const n = { ...p };
                              delete n[a.id];
                              return n;
                            })
                          }
                          className="text-xs text-gray-500 hover:text-gray-700 px-2"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
