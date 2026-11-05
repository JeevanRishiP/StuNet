"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { Button, Card, CardContent, Input } from "@stunet/ui";
import { getJoiningYearOptions } from "@stunet/types";

type SignupState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "success"; verificationStatus: string }
  | { status: "error"; message: string };

export default function SignupPage(): React.JSX.Element {
  const [state, setState] = useState<SignupState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();
  const yearOptions = getJoiningYearOptions();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    startTransition(async () => {
      setState({ status: "pending" });
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          displayName: form.get("displayName"),
          joiningYear: form.get("joiningYear"),
        }),
      });

      const data = (await res.json()) as { error?: string; verificationStatus?: string };

      if (!res.ok) {
        setState({
          status: "error",
          message:
            data.error === "EMAIL_IN_USE"
              ? "An account with this email already exists."
              : (data.error ?? "Something went wrong. Please try again."),
        });
      } else {
        setState({
          status: "success",
          verificationStatus: data.verificationStatus ?? "PENDING",
        });
      }
    });
  }

  if (state.status === "success") {
    return (
      <main className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/40">
        <Card className="w-full max-w-md p-6 sm:p-8 text-center space-y-4 border-slate-200/90 shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Account Created Successfully!</h2>
          {state.verificationStatus === "VERIFIED" ? (
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Your college email was recognized and automatically verified. You can log in right
              away!
            </p>
          ) : (
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Your account has been registered and is pending verification. Once your campus email
              is approved, you will have full access.
            </p>
          )}
          <div className="pt-2">
            <Link href="/login">
              <Button variant="gradient" size="lg" className="w-full">
                <span>Continue to Login</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </Card>
      </main>
    );
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
            Join StuNet
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Use your college email to get verified instantly
          </p>
        </div>

        {/* Signup Card */}
        <Card className="border-slate-200/90 shadow-xl shadow-indigo-950/5">
          <CardContent className="p-6 sm:p-8 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {state.status === "error" && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-700"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{state.message}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="displayName"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Full Name
                </label>
                <Input
                  id="displayName"
                  name="displayName"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="e.g., Alice Vance"
                  icon={<User className="h-4 w-4" />}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Campus Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="student@niat.edu.in"
                  icon={<Mail className="h-4 w-4" />}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Tip: Emails matching @niat.edu.in are instantly verified.
                </p>
              </div>

              <div>
                <label
                  htmlFor="joiningYear"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Year of Joining (College)
                </label>
                <select
                  id="joiningYear"
                  name="joiningYear"
                  defaultValue={yearOptions[1]?.value ?? new Date().getFullYear()}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  {yearOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Academic year runs Aug–Jul. Used to calculate your current batch & year.
                </p>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Create Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
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
                <span>{isPending ? "Creating Account…" : "Create Student Account"}</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer links */}
        <div className="text-center text-xs text-slate-500">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
            Sign in to your account
          </Link>
        </div>
      </div>
    </main>
  );
}
