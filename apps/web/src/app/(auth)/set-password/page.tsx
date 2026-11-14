"use client";

import { Suspense, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Lock,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  User,
} from "lucide-react";
import { Card, CardContent } from "@stunet/ui";

function SetPasswordForm(): React.JSX.Element {
  const searchParams = useSearchParams();
  const { data: session, status, update } = useSession();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const username = session?.user?.username || session?.user?.name || "Student / Faculty Identifier";
  const role = session?.user?.role || "STUDENT";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError("Please enter a new password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/set-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password, confirmPassword }),
        });

        const data = await res.json();

        if (res.ok) {
          setSuccess(true);
          // Update client-side session to clear needsPasswordSetup flag
          if (typeof update === "function") {
            await update({ needsPasswordSetup: false }).catch(() => null);
          }

          setTimeout(() => {
            const callbackUrl = searchParams.get("callbackUrl") || "/";
            window.location.href = callbackUrl;
          }, 800);
        } else {
          setError(data.error || "Failed to set password. Please try again.");
        }
      } catch {
        setError("Network error while setting password. Please try again.");
      }
    });
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <KeyRound className="h-4 w-4 animate-spin text-indigo-600" />
          <span>Loading security setup…</span>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || !session?.user?.id) {
    return (
      <div className="w-full space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Authentication Required
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            Please sign in with your institutional Google account or credentials to set or update
            your password.
          </p>
        </div>
        <a
          href="/login"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
        >
          <span>Go to Login</span>
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
          <KeyRound className="h-7 w-7" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 dark:from-indigo-400 dark:via-indigo-300 dark:to-purple-300 bg-clip-text text-transparent">
          Set Your Password
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          First-time login verified via Google. Set a password for faster return visits using your
          USN or Employee ID.
        </p>
      </div>

      {/* Set Password Card */}
      <Card className="border-slate-200/90 shadow-xl shadow-indigo-950/5 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
        <CardContent className="p-6 sm:p-8 space-y-5">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/90 dark:bg-rose-950/50 p-3.5 text-xs text-rose-800 dark:text-rose-200 leading-relaxed shadow-xs"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/90 dark:bg-emerald-950/50 p-3.5 text-xs text-emerald-800 dark:text-emerald-200 font-medium"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Password set successfully! Redirecting to StuNet…</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Fixed Username Display */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Your Username ({role === "FACULTY" ? "Employee ID" : "USN"})
                </label>
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                  Fixed Identity
                </span>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-2.5 flex items-center justify-center text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  disabled
                  value={username}
                  className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-700 dark:text-slate-200 cursor-not-allowed select-none opacity-90"
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Assigned directly from your campus institutional roster. You will use this username
                to sign in with your password.
              </p>
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="newPassword"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Create Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 flex items-center justify-center text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="newPassword"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-2.5 flex items-center justify-center text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending || success}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <span>
                {isPending ? "Hashing & Saving Password…" : "Save Password & Enter StuNet"}
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Security Rule Explainer */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-4 text-xs text-slate-600 dark:text-slate-400 space-y-1 text-center shadow-sm">
        <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span>Hybrid Security Guarantee</span>
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Your password is encrypted with Argon2id and stored in an isolated credentials partition.
          Google OAuth remains available indefinitely as an instant account recovery option.
        </p>
      </div>
    </div>
  );
}

export default function SetPasswordPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-8">
          <div className="text-xs text-slate-500">Loading password setup…</div>
        </div>
      }
    >
      <SetPasswordForm />
    </Suspense>
  );
}
