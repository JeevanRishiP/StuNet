"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  GraduationCap,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  User,
  Lock,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@stunet/ui";

function LoginForm(): React.JSX.Element {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  // Mode: "PASSWORD" (default for returning users) vs "GOOGLE" (first login / recovery)
  const [activeTab, setActiveTab] = useState<"PASSWORD" | "GOOGLE">("PASSWORD");

  // Username + Password state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Google OAuth state (for testing/simulated environments)
  const [googleEmail, setGoogleEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const errParam = searchParams.get("error");
    if (errParam === "ROSTER_NOT_FOUND" || errParam === "AccessDenied") {
      setError("This email isn't on your campus's roster yet — ask your campus admin to add you");
      setActiveTab("GOOGLE");
    } else if (errParam === "ACCOUNT_BANNED") {
      setError("Your account has been suspended by campus administration.");
    } else if (errParam === "ACCOUNT_LOCKED") {
      setError(
        "Account temporarily locked due to repeated failed attempts. Please sign in with Google to recover your account.",
      );
    } else if (errParam === "PASSWORD_NOT_SET") {
      setError(
        "No password has been set for this account yet. Please sign in with Google to set your password for the first time.",
      );
      setActiveTab("GOOGLE");
    }
  }, [searchParams]);

  // Handle Username + Password Login (checks user_credentials with Argon2id + rate limiting)
  function handlePasswordLogin(e?: React.FormEvent): void {
    if (e) e.preventDefault();
    const ident = username.trim();
    const pwd = password;

    if (!ident || !pwd) {
      setError("Please enter your username (USN/Employee ID) and password.");
      return;
    }

    startTransition(async () => {
      setError(null);
      const callbackUrl = searchParams.get("callbackUrl") || "/";
      const result = await signIn("user-credentials", {
        username: ident,
        password: pwd,
        callbackUrl,
        redirect: false,
      });

      if (result?.error === "ACCOUNT_BANNED") {
        setError("Your account has been suspended by campus administration.");
      } else if (result?.error === "ACCOUNT_LOCKED") {
        setError(
          "Account temporarily locked due to multiple failed login attempts. Please sign in with Google to recover your account.",
        );
      } else if (result?.error === "PASSWORD_NOT_SET") {
        setError(
          "No password has been set for this account yet. Please use 'Continue with Google' to sign in and set your password.",
        );
        setActiveTab("GOOGLE");
      } else if (result?.error === "TOO_MANY_ATTEMPTS") {
        setError("Too many login attempts. Please wait a few moments before trying again.");
      } else if (result?.error) {
        setError("Invalid username or password. Please verify your credentials and try again.");
      } else {
        window.location.href = callbackUrl;
      }
    });
  }

  // Handle Google Sign-in (Roster-first provisioning & account recovery)
  function handleGoogleLogin(emailToUse?: string, nameToUse?: string): void {
    const email = (emailToUse || googleEmail).trim().toLowerCase();
    const name = nameToUse || email.split("@")[0] || "User";

    if (!email) {
      setError("Please enter your Google institutional email address.");
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
      } else if (result?.error === "ROSTER_NOT_FOUND" || result?.error === "AccessDenied") {
        setError("This email isn't on your campus's roster yet — ask your campus admin to add you");
      } else if (result?.error === "TOO_MANY_ATTEMPTS") {
        setError("Too many attempts. Please wait a moment before trying again.");
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
    <main className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/50 dark:from-slate-950 dark:via-indigo-950/20 dark:to-slate-950">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 dark:from-indigo-400 dark:via-indigo-300 dark:to-purple-300 bg-clip-text text-transparent">
            StuNet
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Institutional Student & Faculty Community
          </p>
        </div>

        {/* Login Card */}
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

            {/* Tab Selector */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setActiveTab("PASSWORD");
                }}
                className={`py-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "PASSWORD"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Password Login</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setActiveTab("GOOGLE");
                }}
                className={`py-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === "GOOGLE"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Google OAuth</span>
              </button>
            </div>

            {/* OPTION 1: USERNAME + PASSWORD */}
            {activeTab === "PASSWORD" && (
              <form onSubmit={handlePasswordLogin} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="username"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Username (USN or Employee ID)
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-2.5 flex items-center justify-center text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      id="username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. 2102508579 or FAC-0492"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="password"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("GOOGLE");
                        setError(null);
                      }}
                      className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3 top-2.5 flex items-center justify-center text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <span>{isPending ? "Verifying Credentials…" : "Sign In with Password"}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <div className="pt-2 text-center">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    First time logging in? Switch to{" "}
                    <button
                      type="button"
                      onClick={() => setActiveTab("GOOGLE")}
                      className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                    >
                      Continue with Google
                    </button>{" "}
                    to claim your roster account.
                  </p>
                </div>
              </form>
            )}

            {/* OPTION 2: GOOGLE OAUTH (FIRST-LOGIN & ACCOUNT RECOVERY) */}
            {activeTab === "GOOGLE" && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-800">
                    Roster-First Google Authentication
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                    First login verifies your institutional email against the campus roster and
                    directs you to set your password.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleGoogleLogin();
                  }}
                  className="space-y-2.5"
                >
                  <div>
                    <label
                      htmlFor="googleEmail"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
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
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 shadow-sm transition-all hover:border-slate-400 dark:hover:border-slate-600 disabled:opacity-50 cursor-pointer"
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
                    <span>
                      {isPending ? "Verifying with Campus Roster…" : "Continue with Google"}
                    </span>
                  </button>
                </form>

                {/* Account Recovery Note */}
                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-300">
                  <p className="font-semibold flex items-center gap-1.5 mb-0.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Instant Account Recovery</span>
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Forgot your password or locked out? Signing in with your verified Google account
                    will restore access and allow you to set a new password.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Test Accounts (Local / Dev) */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Quick Sign-In (SVYASA SAS Campus Roster):
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setGoogleEmail("2102508579@svyasa-sas.edu.in");
                    handleGoogleLogin("2102508579@svyasa-sas.edu.in", "Jeevan Rishi P");
                  }}
                  className="w-full p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-left text-xs flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div>
                    <p className="font-semibold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                      <span>Jeevan Rishi P (USN: 2102508579)</span>
                      <span className="text-[9px] font-bold bg-emerald-200/80 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                        STUDENT
                      </span>
                    </p>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                      2102508579@svyasa-sas.edu.in
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleGuestLogin}
                  className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left text-xs flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-500" />
                      <span>Explore as Guest</span>
                      <span className="text-[9px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">
                        PUBLIC
                      </span>
                    </p>
                    <p className="text-[10px] text-slate-500">Read-only public preview</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-4 text-xs text-slate-600 dark:text-slate-400 space-y-1 text-center shadow-sm">
          <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Strict Institutional Roster Access</span>
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Only pre-provisioned institutional identities on your campus roster can sign in. If your
            email is not recognized, contact your campus administrator to add you.
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
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
          <div className="text-xs text-slate-500">Loading sign in…</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
