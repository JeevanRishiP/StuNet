"use client";

import { useState } from "react";
import { Terminal, Eye, EyeOff, Lock } from "lucide-react";

export default function DevLoginPage() {
  const [secret, setSecret] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });

      if (!res.ok) {
        setError("Invalid DEV_SECRET. Check your .env file.");
        return;
      }

      window.location.href = "/";
    } catch {
      setError("Network error. Is the dev server running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-xl shadow-amber-500/20 mb-4">
            <Terminal className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">StuNet Dev Console</h1>
          <p className="text-sm text-slate-500 mt-1">Local developer access only</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                DEV_SECRET
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type={show ? "text" : "password"}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Enter your DEV_SECRET"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={() => setSecret("stunet_dev_secret_change_me_locally")}
              className="text-[11px] text-amber-400 hover:text-amber-300 underline block text-left"
            >
              Fill local DEV_SECRET (stunet_dev_secret_change_me_locally)
            </button>

            <button
              type="submit"
              disabled={loading || !secret}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-sm transition-colors"
            >
              {loading ? "Authenticating…" : "Enter Dev Console"}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-slate-700 mt-4">
          This portal is blocked in production. Local dev only.
        </p>
      </div>
    </div>
  );
}
