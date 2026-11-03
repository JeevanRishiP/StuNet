"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { GraduationCap, Mail, Lock, ArrowRight, AlertCircle, KeyRound } from "lucide-react";
import { Button, Card, CardContent, Input } from "@stunet/ui";

export default function LoginPage(): React.JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = ((form.get("email") as string) ?? "").trim().toLowerCase();
    const password = (form.get("password") as string) ?? "";

    startTransition(async () => {
      setError(null);
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error === "TOO_MANY_ATTEMPTS") {
        setError("Too many failed attempts. Please wait 15 minutes before trying again.");
      } else if (result?.error === "ACCOUNT_LOCKED") {
        setError("Your account is temporarily locked due to too many failed login attempts.");
      } else if (result?.error === "ACCOUNT_BANNED") {
        setError(
          "Your account has been suspended. Contact support if you believe this is an error.",
        );
      } else if (result?.error) {
        setError("Invalid email or password.");
      } else {
        window.location.href = "/";
      }
    });
  }

  function fillDemo() {
    const emailInput = document.getElementById("email") as HTMLInputElement;
    const passInput = document.getElementById("password") as HTMLInputElement;
    if (emailInput && passInput) {
      emailInput.value = "alice@niat.edu.in";
      passInput.value = "StudentPass123!";
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/40">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            StuNet
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Sign in to your campus student community
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-200/90 shadow-xl shadow-indigo-950/5">
          <CardContent className="p-6 sm:p-8 space-y-5">
            <form method="post" action="#" onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-700"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional College Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="alice@niat.edu.in"
                  icon={<Mail className="h-4 w-4" />}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  icon={<Lock className="h-4 w-4" />}
                />
              </div>

              <Button
                type="submit"
                variant="gradient"
                size="lg"
                disabled={isPending}
                className="w-full shadow-md shadow-indigo-500/20"
              >
                <span>{isPending ? "Signing in…" : "Sign in to StuNet"}</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </form>

            {/* Demo student account shortcut */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-indigo-900 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-indigo-600 shrink-0" />
                <div>
                  <p className="font-semibold text-indigo-950">Seeded Student Demo</p>
                  <p className="text-[11px] text-indigo-700">alice@niat.edu.in / StudentPass123!</p>
                </div>
              </div>
              <button
                type="button"
                onClick={fillDemo}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline shrink-0"
              >
                Auto-fill
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Footer links */}
        <div className="text-center space-y-2 text-xs text-slate-500">
          <p>
            New student?{" "}
            <Link href="/signup" className="font-semibold text-indigo-600 hover:underline">
              Create an account with campus email
            </Link>
          </p>

          <p className="text-[11px] text-slate-400">
            StuNet protects student privacy · Zero PII shared without consent
          </p>
        </div>
      </div>
    </main>
  );
}
