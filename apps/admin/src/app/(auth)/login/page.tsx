"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import {
  Shield,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  AlertCircle,
  KeySquare,
  Sparkles,
} from "lucide-react";

type LoginStep = "credentials" | "mfa" | "mfa-setup";

export default function AdminLoginPage(): React.JSX.Element {
  const [step, setStep] = useState<LoginStep>("credentials");
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [suggestedTotp, setSuggestedTotp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCredentials(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = ((form.get("email") as string) ?? "").trim().toLowerCase();
    const password = (form.get("password") as string) ?? "";
    setCredentials({ email, password });

    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/auth/preflight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(data.error ?? "Invalid admin email or password.");
          return;
        }

        if (data.liveTotpCode) {
          setSuggestedTotp(data.liveTotpCode);
        }

        if (data.requiresMfa) {
          setStep("mfa");
        } else {
          // Direct sign-in if no MFA required
          const result = await signIn("admin-credentials", {
            email,
            password,
            totpCode: "",
            redirect: false,
          });

          if (result?.error) {
            setError("Sign in failed. Please try again.");
          } else {
            window.location.href = "/dashboard";
          }
        }
      } catch {
        setError("Network error while verifying admin credentials.");
      }
    });
  }

  function handleMfa(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const totpCode = (form.get("totpCode") as string)?.trim();

    startTransition(async () => {
      setError(null);
      const result = await signIn("admin-credentials", {
        email: credentials.email,
        password: credentials.password,
        totpCode,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid MFA code. Please check your authenticator app or enter 123456.");
      } else {
        window.location.href = "/dashboard";
      }
    });
  }

  function fillDemo() {
    const emailInput = document.getElementById("email") as HTMLInputElement;
    const passInput = document.getElementById("password") as HTMLInputElement;
    if (emailInput && passInput) {
      emailInput.value = "carol@niat.edu.in";
      passInput.value = "AdminPass123!";
    }
  }

  function fillMfaCode(code: string) {
    const totpInput = document.getElementById("totpCode") as HTMLInputElement;
    if (totpInput) {
      totpInput.value = code;
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-slate-950 text-slate-100">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            StuNet Admin Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Restricted access · Campus Managers & System Administrators
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl space-y-5">
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-rose-800/80 bg-rose-950/60 p-3 text-xs text-rose-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === "credentials" && (
            <form method="post" action="#" onSubmit={handleCredentials} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-300 mb-1">
                  Administrator Email
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 h-4 w-4 text-slate-500 pointer-events-none" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="carol@niat.edu.in"
                    defaultValue="carol@niat.edu.in"
                    className="flex h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 pl-10 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 h-4 w-4 text-slate-500 pointer-events-none" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    defaultValue="AdminPass123!"
                    className="flex h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 pl-10 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 transition-all"
              >
                <span>{isPending ? "Checking Credentials…" : "Sign In to Admin"}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {step === "mfa" && (
            <form method="post" action="#" onSubmit={handleMfa} className="space-y-4">
              <div className="text-center space-y-1">
                <KeySquare className="mx-auto h-8 w-8 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Two-Factor Authentication</h3>
                <p className="text-xs text-slate-400">
                  Enter the 6-digit TOTP code from your authenticator app
                </p>
              </div>

              <div>
                <input
                  id="totpCode"
                  name="totpCode"
                  type="text"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="000000"
                  defaultValue={suggestedTotp ?? "123456"}
                  autoFocus
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-center text-2xl tracking-[0.4em] font-mono text-white placeholder:text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>

              {/* Convenience Helper in Dev */}
              <div className="p-2.5 rounded-xl bg-indigo-950/50 border border-indigo-800/60 flex items-center justify-between text-xs text-indigo-300">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  <span>
                    Seeded TOTP Key:{" "}
                    <code className="text-indigo-200 font-mono">JBSWY3DPEHPK3PXP</code>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => fillMfaCode(suggestedTotp ?? "123456")}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-200 underline"
                >
                  Auto-fill
                </button>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {isPending ? "Verifying Code…" : "Verify MFA & Sign In"}
              </button>

              <button
                type="button"
                onClick={() => setStep("credentials")}
                className="w-full text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                ← Back to credentials
              </button>
            </form>
          )}

          {step === "mfa-setup" && (
            <div className="space-y-3 text-center">
              <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
                MFA Enrollment Required
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your administrative role requires multi-factor authentication. Contact your Super
                Administrator to provision your TOTP key.
              </p>
              <button
                type="button"
                onClick={() => setStep("credentials")}
                className="text-xs text-slate-400 hover:text-slate-200 underline"
              >
                ← Back to login
              </button>
            </div>
          )}

          {/* Seeded Admin Demo Box */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-indigo-400 shrink-0" />
              <div>
                <p className="font-semibold text-slate-200">Seeded Admin Account</p>
                <p className="text-[11px] text-slate-500">
                  carol@niat.edu.in / AdminPass123! (MFA: 123456)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={fillDemo}
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline shrink-0"
            >
              Auto-fill
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-600">
          StuNet Institutional Security · Role-Isolated Database Grants Active
        </p>
      </div>
    </main>
  );
}
