"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type LoginStep = "credentials" | "mfa" | "mfa-setup";

export default function AdminLoginPage(): React.JSX.Element {
  const _router = useRouter(); // used in Phase 4 for post-login redirects
  const [step, setStep] = useState<LoginStep>("credentials");
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCredentials(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setCredentials({
      email: form.get("email") as string,
      password: form.get("password") as string,
    });
    // Pre-flight check — attempt login without TOTP to detect MFA state
    startTransition(async () => {
      setError(null);
      const result = await signIn("admin-credentials", {
        email: form.get("email"),
        password: form.get("password"),
        totpCode: "",
        redirect: false,
      });

      if (result?.error === "MFA_REQUIRED" || result?.error === "MFA_INVALID") {
        setStep("mfa");
      } else if (result?.error === "MFA_SETUP_REQUIRED") {
        setStep("mfa-setup");
      } else if (result?.error === "TOO_MANY_ATTEMPTS") {
        setError("Too many failed attempts. Please wait 30 minutes.");
      } else if (result?.error) {
        setError("Invalid email or password.");
      } else {
        // Use window.location for typed-routes compatibility
        window.location.href = "/dashboard";
      }
    });
  }

  function handleMfa(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      setError(null);
      const result = await signIn("admin-credentials", {
        email: credentials.email,
        password: credentials.password,
        totpCode: form.get("totpCode"),
        redirect: false,
      });

      if (result?.error === "MFA_INVALID") {
        setError("Invalid MFA code. Please try again.");
      } else if (result?.error) {
        setError("Authentication failed. Please start over.");
        setStep("credentials");
      } else {
        window.location.href = "/dashboard";
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-brand-400">StuNet Admin</h1>
          <p className="mt-1 text-sm text-slate-400">Restricted — authorised personnel only</p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-md border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {step === "credentials" && (
          <form onSubmit={handleCredentials} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {isPending ? "Checking…" : "Continue"}
            </button>
          </form>
        )}

        {step === "mfa" && (
          <form onSubmit={handleMfa} className="space-y-4">
            <p className="text-sm text-slate-400">
              Enter the 6-digit code from your authenticator app.
            </p>
            <div>
              <label htmlFor="totpCode" className="block text-sm font-medium text-slate-300">
                MFA Code
              </label>
              <input
                id="totpCode"
                name="totpCode"
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="one-time-code"
                className="mt-1 block w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-center text-2xl tracking-widest text-slate-100 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {isPending ? "Verifying…" : "Verify & sign in"}
            </button>
            <button
              type="button"
              onClick={() => setStep("credentials")}
              className="w-full text-sm text-slate-500 hover:text-slate-300"
            >
              ← Back
            </button>
          </form>
        )}

        {step === "mfa-setup" && (
          <div className="space-y-3 text-center">
            <p className="text-sm text-amber-400 font-medium">MFA setup required</p>
            <p className="text-sm text-slate-400">
              Your admin account requires Multi-Factor Authentication before you can log in. Contact
              your Super Admin to complete MFA setup.
            </p>
            <button
              type="button"
              onClick={() => setStep("credentials")}
              className="text-sm text-slate-500 hover:text-slate-300"
            >
              ← Back to login
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
