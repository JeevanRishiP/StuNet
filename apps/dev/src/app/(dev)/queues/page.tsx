"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Plus, Loader2 } from "lucide-react";

interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  recentFailed: {
    id: string | undefined;
    name: string;
    failedReason: string;
    data: unknown;
    timestamp: number;
  }[];
}

interface JobPayload {
  queue: string;
  jobName: string;
  data: string;
}

export default function QueuesPage() {
  const [queues, setQueues] = useState<QueueStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addJob, setAddJob] = useState<JobPayload>({
    queue: "notifications",
    jobName: "test",
    data: "{}",
  });
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/queues");
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { queues: QueueStats[] };
      setQueues(data.queues);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function pushJob() {
    setAdding(true);
    setAddResult(null);
    try {
      const res = await fetch("/api/dev/queues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queue: addJob.queue,
          jobName: addJob.jobName,
          data: JSON.parse(addJob.data),
        }),
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      setAddResult(data.jobId ? `✅ Job added: ${data.jobId}` : `❌ ${data.error}`);
      void load();
    } catch (e) {
      setAddResult(`❌ ${String(e)}`);
    } finally {
      setAdding(false);
    }
  }

  const SEV_COLORS = {
    waiting: "text-amber-400",
    active: "text-blue-400",
    completed: "text-emerald-400",
    failed: "text-rose-400",
    delayed: "text-purple-400",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Queue Inspector</h1>
          <p className="text-sm text-slate-500 mt-1">
            Live BullMQ queue status and job management.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-xs text-rose-400">
          {error} — Is Redis running on <code className="text-amber-400">localhost:6382</code>?
        </div>
      )}

      {/* Queue cards */}
      <div className="grid gap-4">
        {queues.map((q) => (
          <div
            key={q.name}
            className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/40">
              <p className="text-sm font-bold text-white font-mono">{q.name}</p>
              <div className="flex gap-4">
                {(["waiting", "active", "completed", "failed", "delayed"] as const).map((k) => (
                  <div key={k} className="text-center">
                    <p className={`text-sm font-bold ${SEV_COLORS[k]}`}>{q[k]}</p>
                    <p className="text-[9px] text-slate-600 uppercase">{k}</p>
                  </div>
                ))}
              </div>
            </div>

            {q.recentFailed.length > 0 && (
              <div className="p-4 space-y-2">
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wide">
                  Recent Failed Jobs
                </p>
                {q.recentFailed.map((job, i) => (
                  <div key={i} className="bg-rose-500/5 border border-rose-500/10 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-white">{job.name}</span>
                      <span className="text-[10px] text-slate-600">
                        {new Date(job.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-[10px] text-rose-400 mt-1">{job.failedReason}</p>
                    <pre className="text-[9px] text-slate-600 mt-1 overflow-x-auto">
                      {JSON.stringify(job.data, null, 1)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add job */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Plus className="h-4 w-4 text-amber-400" />
          Push Job to Queue
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">
              Queue Name
            </label>
            <select
              value={addJob.queue}
              onChange={(e) => setAddJob((j) => ({ ...j, queue: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
            >
              {["notifications", "reportEscalation", "successBoard"].map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">
              Job Name
            </label>
            <input
              value={addJob.jobName}
              onChange={(e) => setAddJob((j) => ({ ...j, jobName: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
              placeholder="e.g. send-notification"
            />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">
            Job Data (JSON)
          </label>
          <textarea
            value={addJob.data}
            onChange={(e) => setAddJob((j) => ({ ...j, data: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono resize-none focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void pushJob()}
            disabled={adding}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-bold transition-colors"
          >
            {adding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Push Job
          </button>
          {addResult && <p className="text-xs">{addResult}</p>}
        </div>
      </div>
    </div>
  );
}
