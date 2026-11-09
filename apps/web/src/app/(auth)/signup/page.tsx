"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Award,
  Building2,
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  School,
  Briefcase,
  IdCard,
  Clock,
} from "lucide-react";
import { Button, Card, CardContent, Input } from "@stunet/ui";

interface CampusOption {
  id: string;
  name: string;
  city: string;
  state: string;
  emailDomain: string | null;
}

type SignupRole = "STUDENT" | "ALUMNI" | "FACULTY";

type SignupState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "success"; verificationStatus: string; username: string; role: SignupRole }
  | { status: "error"; message: string };

export default function SignupPage(): React.JSX.Element {
  const [role, setRole] = useState<SignupRole>("STUDENT");
  const [campuses, setCampuses] = useState<CampusOption[]>([]);
  const [state, setState] = useState<SignupState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();

  // Common state
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [campusId, setCampusId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [headline, setHeadline] = useState("");

  // Student specific
  const [usn, setUsn] = useState("");
  const [joiningYear, setJoiningYear] = useState(String(new Date().getFullYear()));
  const [currentCourseYear, setCurrentCourseYear] = useState("1");

  // Alumni specific
  const [graduationYear, setGraduationYear] = useState(String(new Date().getFullYear() - 1));

  // Faculty specific
  const [employeeId, setEmployeeId] = useState("");

  // Load campuses
  useEffect(() => {
    async function loadCampuses() {
      try {
        const res = await fetch("/api/campuses");
        if (res.ok) {
          const data = (await res.json()) as { campuses: CampusOption[] };
          if (Array.isArray(data.campuses)) {
            setCampuses(data.campuses);
            if (data.campuses.length > 0 && !campusId && data.campuses[0]?.id) {
              setCampusId(data.campuses[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch campuses", err);
      }
    }
    void loadCampuses();
  }, [campusId]);

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();

    if (password !== confirmPassword) {
      setState({ status: "error", message: "Passwords do not match." });
      return;
    }

    if (!campusId) {
      setState({ status: "error", message: "Please select your campus." });
      return;
    }

    startTransition(async () => {
      setState({ status: "pending" });

      try {
        const payload = {
          role,
          displayName,
          email,
          campusId,
          password,
          headline: headline || undefined,
          joiningYear: joiningYear ? parseInt(joiningYear, 10) : undefined,
          graduationYear:
            role === "ALUMNI" && graduationYear ? parseInt(graduationYear, 10) : undefined,
          currentCourseYear:
            role === "STUDENT" && currentCourseYear ? parseInt(currentCourseYear, 10) : undefined,
          usn: (role === "STUDENT" || role === "ALUMNI") && usn ? usn : undefined,
          employeeId: role === "FACULTY" && employeeId ? employeeId : undefined,
        };

        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = (await res.json()) as {
          error?: string;
          verificationStatus?: string;
          username?: string;
        };

        if (!res.ok) {
          setState({
            status: "error",
            message: data.error ?? "Failed to create account. Please check your information.",
          });
        } else {
          setState({
            status: "success",
            verificationStatus: data.verificationStatus ?? "PENDING",
            username: data.username ?? "",
            role,
          });
        }
      } catch {
        setState({
          status: "error",
          message: "Network error occurred while creating your account.",
        });
      }
    });
  }

  // Success view
  if (state.status === "success") {
    const isVerified = state.verificationStatus === "VERIFIED";

    return (
      <main className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/40">
        <Card className="w-full max-w-md p-6 sm:p-8 text-center space-y-4 border-slate-200/90 shadow-2xl bg-white/95">
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
              isVerified ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
            }`}
          >
            {isVerified ? <CheckCircle2 className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
          </div>

          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {isVerified ? "Account Created & Verified!" : "Registration Submitted!"}
          </h2>

          <div className="space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
            {isVerified ? (
              <p>
                Your institutional email matched campus verification records. Your profile{" "}
                <strong className="text-indigo-600">@{state.username}</strong> is active and ready
                for login!
              </p>
            ) : (
              <p>
                Your registration as a <strong>{state.role}</strong> has been received and queued
                for administrative approval. Once reviewed by your campus admin, you will have
                complete access.
              </p>
            )}
          </div>

          <div className="pt-2">
            <Link href="/login">
              <Button variant="gradient" size="lg" className="w-full">
                <span>Proceed to Sign In</span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4 py-8 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/40">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Join StuNet Community
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Select your affiliation to register your institutional profile
          </p>
        </div>

        {/* 3 Form Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-slate-200/80 rounded-2xl shadow-inner">
          <button
            type="button"
            onClick={() => {
              setRole("STUDENT");
              setState({ status: "idle" });
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              role === "STUDENT"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <GraduationCap className="h-4 w-4 shrink-0" />
            <span>Student</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRole("ALUMNI");
              setState({ status: "idle" });
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              role === "ALUMNI"
                ? "bg-white text-amber-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Award className="h-4 w-4 shrink-0" />
            <span>Alumni</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRole("FACULTY");
              setState({ status: "idle" });
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
              role === "FACULTY"
                ? "bg-white text-purple-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="h-4 w-4 shrink-0" />
            <span>Faculty</span>
          </button>
        </div>

        {/* Main Card */}
        <Card className="border-slate-200/90 shadow-xl shadow-indigo-950/5 bg-white">
          <CardContent className="p-6 sm:p-8 space-y-5">
            {state.status === "error" && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{state.message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Target Campus */}
              <div>
                <label
                  htmlFor="campusId"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Institutional Campus <span className="text-amber-500">*</span>
                </label>
                <select
                  id="campusId"
                  required
                  value={campusId}
                  onChange={(e) => setCampusId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value="">-- Select Your Campus --</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city}, {c.state})
                    </option>
                  ))}
                </select>
              </div>

              {/* Display Name */}
              <div>
                <label
                  htmlFor="displayName"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Full Name <span className="text-amber-500">*</span>
                </label>
                <Input
                  id="displayName"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alice Vance"
                  icon={<User className="h-4 w-4 text-slate-400" />}
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                  {role === "FACULTY"
                    ? "Institutional Email"
                    : role === "ALUMNI"
                      ? "Alumni / Contact Email"
                      : "College Email Address"}{" "}
                  <span className="text-amber-500">*</span>
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@college.edu or name@gmail.com"
                  icon={<Mail className="h-4 w-4 text-slate-400" />}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Tip: Emails matching your campus domain get instantly verified.
                </p>
              </div>

              {/* STUDENT FORM SPECIFICS */}
              {role === "STUDENT" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="usn"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        University Seat No (USN)
                      </label>
                      <Input
                        id="usn"
                        type="text"
                        value={usn}
                        onChange={(e) => setUsn(e.target.value)}
                        placeholder="e.g. 2102508579"
                        icon={<IdCard className="h-4 w-4 text-slate-400" />}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="currentCourseYear"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Academic Year
                      </label>
                      <select
                        id="currentCourseYear"
                        value={currentCourseYear}
                        onChange={(e) => setCurrentCourseYear(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      >
                        <option value="1">1st Year (Freshman)</option>
                        <option value="2">2nd Year (Sophomore)</option>
                        <option value="3">3rd Year (Junior)</option>
                        <option value="4">4th Year (Senior)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="joiningYear"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Year of College Admission
                    </label>
                    <input
                      id="joiningYear"
                      type="number"
                      min={1950}
                      max={2100}
                      value={joiningYear}
                      onChange={(e) => setJoiningYear(e.target.value)}
                      placeholder="e.g. 2023"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                </>
              )}

              {/* ALUMNI FORM SPECIFICS */}
              {role === "ALUMNI" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="graduationYear"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Class of (Graduation Year) <span className="text-amber-500">*</span>
                      </label>
                      <input
                        id="graduationYear"
                        type="number"
                        min={1950}
                        max={2150}
                        required
                        value={graduationYear}
                        onChange={(e) => setGraduationYear(e.target.value)}
                        placeholder="e.g. 2022"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="alumniUsn"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Past USN / Roll No
                      </label>
                      <Input
                        id="alumniUsn"
                        type="text"
                        value={usn}
                        onChange={(e) => setUsn(e.target.value)}
                        placeholder="e.g. 1802508123"
                        icon={<IdCard className="h-4 w-4 text-slate-400" />}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="alumniHeadline"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Current Company & Role
                    </label>
                    <Input
                      id="alumniHeadline"
                      type="text"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="e.g. Software Engineer @ Google"
                      icon={<Briefcase className="h-4 w-4 text-slate-400" />}
                    />
                  </div>
                </>
              )}

              {/* FACULTY FORM SPECIFICS */}
              {role === "FACULTY" && (
                <>
                  <div>
                    <label
                      htmlFor="employeeId"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Faculty / Employee ID <span className="text-amber-500">*</span>
                    </label>
                    <Input
                      id="employeeId"
                      type="text"
                      required
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="e.g. FAC-0492"
                      icon={<IdCard className="h-4 w-4 text-slate-400" />}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="facultyHeadline"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Department & Academic Designation
                    </label>
                    <Input
                      id="facultyHeadline"
                      type="text"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="e.g. Associate Professor, Dept. of Computer Science"
                      icon={<School className="h-4 w-4 text-slate-400" />}
                    />
                  </div>
                </>
              )}

              {/* Password Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Password <span className="text-amber-500">*</span>
                  </label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 chars, 1 num & case"
                    icon={<Lock className="h-4 w-4 text-slate-400" />}
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Confirm Password <span className="text-amber-500">*</span>
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    icon={<Lock className="h-4 w-4 text-slate-400" />}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="gradient"
                size="lg"
                disabled={isPending}
                className="w-full shadow-md shadow-indigo-500/20"
              >
                <span>
                  {isPending
                    ? "Submitting Registration…"
                    : `Create ${role === "FACULTY" ? "Faculty" : role === "ALUMNI" ? "Alumni" : "Student"} Account`}
                </span>
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer links */}
        <div className="text-center text-xs text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
            Sign in here
          </Link>
        </div>
      </div>
    </main>
  );
}
