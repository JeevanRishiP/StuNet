"use client";

import { useState, useTransition } from "react";

type SignupState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "success"; verificationStatus: string }
  | { status: "error"; message: string };

export default function SignupPage(): React.JSX.Element {
  const [state, setState] = useState<SignupState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();

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
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="text-4xl">🎉</div>
          <h2 className="text-xl font-semibold text-slate-800">Account created!</h2>
          {state.verificationStatus === "VERIFIED" ? (
            <p className="text-sm text-slate-600">
              Your campus email was recognised — you are automatically verified and can log in now.
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              Your email domain was not matched to a campus. Your account is pending manual
              verification — you will be notified once approved.
            </p>
          )}
          <a
            href="/login"
            className="inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Go to login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-brand-700">Join StuNet</h1>
          <p className="mt-1 text-sm text-slate-500">
            Use your campus email to get verified instantly
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {state.status === "error" && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {state.message}
            </div>
          )}

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-slate-700">
              Full name
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              required
              minLength={2}
              maxLength={60}
              autoComplete="name"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Campus email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="you@campus.edu.in"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Min 8 chars, upper + lower + number"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60"
          >
            {isPending ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{" "}
          <a href="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
