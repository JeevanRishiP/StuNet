"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  GraduationCap,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Building2,
  Award,
  UserPlus,
  User,
} from "lucide-react";
import { Card, CardContent } from "@stunet/ui";

function LoginForm(): React.JSX.Element {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleName] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const errParam = searchParams.get("error");
    if (errParam === "ROSTER_NOT_FOUND" || errParam === "AccessDenied") {
      setError("This email isn't on your campus's roster yet — ask your campus admin to add you");
    } else if (errParam === "ACCOUNT_BANNED") {
      setError("Your account has been suspended by campus administration.");
    }
  }, [searchParams]);

  // Handle Google Sign-in (Roster-first provisioning)
  function handleGoogleLogin(emailToUse?: string, nameToUse?: string): void {
    const email = (emailToUse || googleEmail).trim().toLowerCase();
    const name = nameToUse || googleName || email.split("@")[0] || "User";

    if (!email) {
      setError("Please enter your Google account email address.");
      return;
    }

    startTransition(async () => {
      setError(null);
      const callbackUrl = searchParams.get("callbackUrl") || "/";
      const result = await signIn("google-auth", {
        googleEmail: email,
        googleName: name,
        callbackUrl,
        redirect: false,
      });

      if (result?.error === "ACCOUNT_BANNED") {
        setError("Your account has been suspended by campus administration.");
      } else if (result?.error) {
        setError("This email isn't on your campus's roster yet — ask your campus admin to add you");
      } else {
        window.location.href = callbackUrl;
      }
    });
  }

  // Handle Guest Sign-in (No email required)
  function handleGuestLogin(): void {
    startTransition(async () => {
      setError(null);
      const callbackUrl = searchParams.get("callbackUrl") || "/";
      const result = await signIn("guest-auth", {
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        setError("Guest login failed. Please try again.");
      } else {
        window.location.href = callbackUrl;
      }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/50">
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
            Institutional Portal · Sign in with Google
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-200/90 shadow-xl shadow-indigo-950/5 bg-white/95 backdrop-blur-sm">
          <CardContent className="p-6 sm:p-8 space-y-5">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-800 leading-relaxed shadow-xs"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Google Authentication Box */}
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                  Roster-First Google Authentication
                </span>
                <p className="text-xs text-slate-500 pt-1">
                  Access is granted to students and faculty whose verified institutional email is on
                  their campus roster.
                </p>
              </div>

              {/* Google Email Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleGoogleLogin();
                }}
                className="space-y-2"
              >
                <div>
                  <label
                    htmlFor="googleEmail"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Google Account / Institutional Email
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-2.5 flex items-center justify-center">
                      <svg className="h-4 w-4" width="16" height="16" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    </div>
                    <input
                      id="googleEmail"
                      type="email"
                      value={googleEmail}
                      onChange={(e) => setGoogleEmail(e.target.value)}
                      placeholder="e.g. rohan.student@svyasa-sas.edu.in"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 shadow-sm transition-all hover:border-slate-400 disabled:opacity-50"
                >
                  <svg className="h-4 w-4 shrink-0" width="16" height="16" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{isPending ? "Verifying with Campus Roster…" : "Sign In with Google"}</span>
                </button>
              </form>

              {/* Roster-based Quick Test Accounts */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Quick Sign-In (SVYASA SAS Campus):
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleEmail("2102508579@svyasa-sas.edu.in");
                      handleGoogleLogin("2102508579@svyasa-sas.edu.in", "Jeevan Rishi P");
                    }}
                    className="w-full p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-left text-xs flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-emerald-950 flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5 text-emerald-700" />
                        <span>Jeevan Rishi P (USN: 2102508579)</span>
                        <span className="text-[9px] font-bold bg-emerald-200/80 text-emerald-800 px-1.5 py-0.5 rounded">
                          STUDENT
                        </span>
                      </p>
                      <p className="text-[10px] text-emerald-700 font-mono">
                        2102508579@svyasa-sas.edu.in
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setGoogleEmail("2102508576@svyasa-sas.edu.in");
                      handleGoogleLogin("2102508576@svyasa-sas.edu.in", "Harshitha Shree Raj");
                    }}
                    className="w-full p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 text-left text-xs flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-indigo-950 flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5 text-indigo-700" />
                        <span>Harshitha Shree Raj (NSGC President)</span>
                        <span className="text-[9px] font-bold bg-indigo-200/80 text-indigo-800 px-1.5 py-0.5 rounded">
                          PRESIDENT
                        </span>
                      </p>
                      <p className="text-[10px] text-indigo-700 font-mono">
                        2102508576@svyasa-sas.edu.in (USN: 2102508576)
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleGuestLogin}
                    className="w-full p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-left text-xs flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-amber-950 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-amber-700" />
                        <span>Guest</span>
                        <span className="text-[9px] font-bold bg-amber-200/80 text-amber-800 px-1.5 py-0.5 rounded">
                          GUEST
                        </span>
                      </p>
                      <p className="text-[10px] text-amber-700">Explore StuNet in Guest Mode</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registration CTA */}
        <div className="rounded-2xl border border-indigo-200/80 bg-white/90 p-4 text-center space-y-2 shadow-sm">
          <p className="text-xs font-semibold text-slate-800">Don&apos;t have an account yet?</p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all w-full"
          >
            <UserPlus className="h-4 w-4" />
            <span>Register as Student, Alumni, or Faculty</span>
            <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
          </Link>
          <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500 pt-1">
            <span className="flex items-center gap-1">
              <GraduationCap className="h-3 w-3 text-indigo-600" /> Student
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Award className="h-3 w-3 text-amber-600" /> Alumni
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3 text-purple-600" /> Faculty
            </span>
          </div>
        </div>

        {/* Info Explainer */}
        <div className="rounded-2xl border border-slate-200 bg-white/60 p-4 text-xs text-slate-600 space-y-1 text-center shadow-sm">
          <p className="font-semibold text-slate-800 flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <span>Campus Verified Access</span>
          </p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Accounts matching official campus domains or pre-approved institutional rosters are
            verified automatically.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-xs text-slate-500">Loading sign in…</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
