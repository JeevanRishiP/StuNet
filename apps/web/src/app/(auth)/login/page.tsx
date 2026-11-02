"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;

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
        router.push("/");
        router.refresh();
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-brand-700">StuNet</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your campus community</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

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
              autoComplete="current-password"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60"
          >
            {isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          New to StuNet?{" "}
          <a href="/signup" className="font-medium text-brand-600 hover:underline">
            Create an account
          </a>
        </p>
      </div>
    </main>
  );
}
