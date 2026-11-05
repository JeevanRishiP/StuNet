"use client";

import { useState } from "react";
import { Sprout, Trash2, CheckCircle2, XCircle, Loader2 } from "lucide-react";

const PRESETS = [
  {
    id: "fresh_campus",
    label: "Fresh Campus",
    desc: "1 campus + 3 clubs + 10 students with various roles and verification states",
    icon: "🏛️",
  },
  {
    id: "busy_feed",
    label: "Busy Feed",
    desc: "20 posts with mixed visibility (PUBLIC / CONNECTIONS / CAMPUS). Needs existing users.",
    icon: "📝",
  },
  {
    id: "moderation_queue",
    label: "Moderation Queue",
    desc: "5 reports in various states + 5 pending achievements. Needs existing users.",
    icon: "🚩",
  },
];

interface SeedResult {
  ok: boolean;
  seeded?: Record<string, number>;
  deleted?: Record<string, number>;
  error?: string;
}

export default function SeederPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, SeedResult>>({});
  const [wiping, setWiping] = useState(false);
  const [wipeResult, setWipeResult] = useState<SeedResult | null>(null);

  async function runSeed(preset: string) {
    setLoading(preset);
    setResults((r) => ({ ...r, [preset]: undefined as unknown as SeedResult }));
    try {
      const res = await fetch("/api/dev/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset }),
      });
      const data = (await res.json()) as SeedResult;
      setResults((r) => ({ ...r, [preset]: data }));
    } finally {
      setLoading(null);
    }
  }

  async function wipeAll() {
    if (!confirm("Wipe all seeded data (tagged __dev_seeded__)? This cannot be undone.")) return;
    setWiping(true);
    const res = await fetch("/api/dev/seed", { method: "DELETE" });
    const data = (await res.json()) as SeedResult;
    setWipeResult(data);
    setWiping(false);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Data Seeder</h1>
        <p className="text-sm text-slate-500 mt-1">
          One-click presets to seed test data for specific scenarios. All seeded records are tagged{" "}
          <code className="text-amber-400 bg-amber-500/10 px-1 rounded">__dev_seeded__</code> for
          easy cleanup.
        </p>
      </div>

      {/* Presets */}
      <div className="space-y-3">
        {PRESETS.map((preset) => {
          const result = results[preset.id];
          const isLoading = loading === preset.id;
          return (
            <div
              key={preset.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{preset.icon}</span>
                <div>
                  <p className="text-sm font-bold text-white">{preset.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{preset.desc}</p>
                  {result && (
                    <div
                      className={`flex items-center gap-1.5 mt-2 text-xs ${result.ok ? "text-emerald-400" : "text-rose-400"}`}
                    >
                      {result.ok ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      {result.ok
                        ? `Done! Created: ${Object.entries(result.seeded ?? {})
                            .map(([k, v]) => `${v} ${k}`)
                            .join(", ")}`
                        : result.error}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => void runSeed(preset.id)}
                disabled={isLoading || loading !== null}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-bold transition-colors shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sprout className="h-3.5 w-3.5" />
                )}
                {isLoading ? "Seeding…" : "Seed"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Wipe */}
      <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-white">Wipe Seeded Data</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Deletes all records tagged <code className="text-amber-400">__dev_seeded__</code> —
            posts, reports, achievements, users, campuses.
          </p>
          {wipeResult && (
            <p className={`text-xs mt-1.5 ${wipeResult.ok ? "text-emerald-400" : "text-rose-400"}`}>
              {wipeResult.ok
                ? `Wiped: ${Object.entries(wipeResult.deleted ?? {})
                    .map(([k, v]) => `${v} ${k}`)
                    .join(", ")}`
                : wipeResult.error}
            </p>
          )}
        </div>
        <button
          onClick={() => void wipeAll()}
          disabled={wiping}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-bold transition-colors shrink-0"
        >
          {wiping ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          {wiping ? "Wiping…" : "Wipe All"}
        </button>
      </div>
    </div>
  );
}
