"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  UserPlus,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Mail,
  Trash2,
  Sparkles,
  School,
  X,
  RefreshCw,
  Upload,
  GraduationCap,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { calculateAcademicYear, getJoiningYearOptions, type AcademicYearInfo } from "@stunet/types";

interface EnrolledStudent {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  headline: string | null;
  role: string;
  verificationStatus: string;
  campusId: string | null;
  campusName: string;
  campusCity: string;
  joiningYear?: number | null;
  academicYear?: AcademicYearInfo | null;
  email: string | null;
  isActive: boolean;
  isBanned: boolean;
  createdAt: string;
}

export default function DirectoryPage(): React.JSX.Element {
  const { data: session } = useSession();
  const isCampusManager = session?.user?.role === "CAMPUS_MANAGER";

  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const yearOptions = getJoiningYearOptions();

  // Single Enroll Modal
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollForm, setEnrollForm] = useState({
    email: "",
    username: "",
    displayName: "",
    headline: "",
    joiningYear: String(yearOptions[1]?.value ?? new Date().getFullYear()),
  });

  // Bulk Enroll Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function notify(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  }

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      const res = await fetch(`/api/directory/enroll?${params.toString()}`);
      const data = (await res.json()) as { students?: EnrolledStudent[] };
      if (data.students) {
        setStudents(data.students);
      }
    } catch {
      setErrorMsg("Failed to load students.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  // Handle single enrollment submit
  async function handleSingleEnroll(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/directory/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enrollForm),
      });

      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to enroll student.");
        return;
      }

      notify(data.message ?? "Student successfully enrolled!");
      setShowEnrollModal(false);
      setEnrollForm({
        email: "",
        username: "",
        displayName: "",
        headline: "",
        joiningYear: String(yearOptions[1]?.value ?? new Date().getFullYear()),
      });
      void loadStudents();
    } catch {
      setErrorMsg("Network error while enrolling student.");
    } finally {
      setSubmitting(false);
    }
  }

  // Handle bulk enrollment submit
  async function handleBulkEnroll(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const parsedStudents: Array<{
      email: string;
      username: string;
      displayName: string;
      joiningYear?: number;
    }> = [];

    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length >= 3) {
        const jYear = parts[3] ? parseInt(parts[3], 10) : undefined;
        parsedStudents.push({
          email: parts[0] ?? "",
          username: parts[1] ?? "",
          displayName: parts[2] ?? "",
          joiningYear: !isNaN(jYear as number) ? jYear : undefined,
        });
      }
    }

    if (parsedStudents.length === 0) {
      setErrorMsg("Please enter at least one valid line in format: email, username, displayName");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/directory/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: parsedStudents }),
      });

      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to process bulk enrollment.");
        return;
      }

      notify(data.message ?? "Bulk enrollment completed!");
      setShowBulkModal(false);
      setBulkText("");
      void loadStudents();
    } catch {
      setErrorMsg("Network error while submitting bulk enrollment.");
    } finally {
      setSubmitting(false);
    }
  }

  // Handle revoke enrollment
  async function handleRevoke(student: EnrolledStudent) {
    if (
      !confirm(
        `Are you sure you want to revoke campus student access for ${student.displayName} (@${student.username})? They will be reverted to a Guest user.`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/directory/enroll?userId=${student.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        alert(data.error ?? "Failed to revoke student enrollment.");
        return;
      }
      notify(data.message ?? "Revoked student access.");
      void loadStudents();
    } catch {
      alert("Network error while revoking student enrollment.");
    }
  }

  // Filtered students by role tab
  const filteredStudents = students.filter((s) => {
    if (roleFilter === "ALL") return true;
    if (roleFilter === "STUDENT") return s.role === "STUDENT" || s.role === "CLUB_MANAGER";
    if (roleFilter === "GUEST") return s.role === "GUEST";
    return true;
  });

  const enrolledCount = students.filter(
    (s) => s.role === "STUDENT" || s.role === "CLUB_MANAGER",
  ).length;
  const guestCount = students.filter((s) => s.role === "GUEST").length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Campus Student Directory & Whitelist
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Feed and authorize student Google accounts under this campus. When students sign in with
            Google, only enrolled emails are recognized as verified campus students; all other
            Google accounts are treated as Guests.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowBulkModal(true);
              setErrorMsg(null);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Upload className="h-3.5 w-3.5 text-slate-400" />
            <span>Bulk Enroll</span>
          </button>
          <button
            onClick={() => {
              setShowEnrollModal(true);
              setErrorMsg(null);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all"
          >
            <UserPlus className="h-4 w-4" />
            <span>+ Enroll Student</span>
          </button>
        </div>
      </div>

      {/* Success notification */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400 font-medium">Total Registered</p>
          <p className="text-2xl font-black text-white mt-1">{students.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Users in directory</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-emerald-400 font-medium">Enrolled Students</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">{enrolledCount}</p>
          <p className="text-[11px] text-emerald-500/80 mt-1">Google accounts authorized</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-amber-400 font-medium">Guest Users</p>
          <p className="text-2xl font-black text-amber-400 mt-1">{guestCount}</p>
          <p className="text-[11px] text-amber-500/80 mt-1">Pending campus enrollment</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400 font-medium">Authentication</p>
          <p className="text-xl font-bold text-white mt-1 flex items-center gap-1.5">
            <span className="text-indigo-400 font-mono">Google</span>
            <span className="text-xs text-slate-400 font-normal">OAuth</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Strict Email-Whitelisted</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search student name, username, or Google email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-10 pr-4 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRoleFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              roleFilter === "ALL"
                ? "bg-indigo-600 text-white"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            All Accounts ({students.length})
          </button>
          <button
            onClick={() => setRoleFilter("STUDENT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              roleFilter === "STUDENT"
                ? "bg-indigo-600 text-white"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            Enrolled Students ({enrolledCount})
          </button>
          <button
            onClick={() => setRoleFilter("GUEST")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              roleFilter === "GUEST"
                ? "bg-indigo-600 text-white"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            Guests ({guestCount})
          </button>
          <button
            onClick={() => void loadStudents()}
            className="p-2 rounded-lg bg-slate-950 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Student Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="text-left px-5 py-3.5 font-bold">Student Identity</th>
                <th className="text-left px-5 py-3.5 font-bold">Academic Standing</th>
                <th className="text-left px-5 py-3.5 font-bold">Google Auth Email</th>
                <th className="text-left px-5 py-3.5 font-bold">Campus Scope</th>
                <th className="text-left px-5 py-3.5 font-bold">Status & Role</th>
                <th className="text-left px-5 py-3.5 font-bold">Enrolled Date</th>
                <th className="text-right px-5 py-3.5 font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    <span>Loading student directory…</span>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Users className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-300">No students found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Click <strong>+ Enroll Student</strong> to feed student Google accounts for
                      this campus.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((u) => {
                  const isGuest = u.role === "GUEST";
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Identity */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${
                              isGuest
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"
                            }`}
                          >
                            {u.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{u.displayName}</p>
                            <p className="text-slate-400 text-[11px] font-mono">@{u.username}</p>
                            {u.headline && (
                              <p className="text-[10px] text-slate-500 truncate max-w-[200px]">
                                {u.headline}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Academic Standing */}
                      <td className="px-5 py-3.5">
                        {u.joiningYear ? (
                          <div>
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                u.academicYear?.isAlumni
                                  ? "bg-slate-800 text-slate-400 border border-slate-700"
                                  : "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                              }`}
                            >
                              <GraduationCap className="h-3 w-3 text-indigo-400" />
                              <span>{u.academicYear?.label ?? `Joined ${u.joiningYear}`}</span>
                            </span>
                            <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                              Batch {u.joiningYear} · Aug–Jul Cycle
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-600 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* Google Email */}
                      <td className="px-5 py-3.5">
                        {u.email ? (
                          <div className="flex items-center gap-1.5 font-mono text-slate-200">
                            <span className="h-4 w-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold flex items-center justify-center">
                              G
                            </span>
                            <span>{u.email}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 font-mono text-[11px]">
                            No email registered
                          </span>
                        )}
                      </td>

                      {/* Campus */}
                      <td className="px-5 py-3.5">
                        {u.campusId ? (
                          <div>
                            <p className="text-slate-200 font-medium">{u.campusName}</p>
                            {u.campusCity && (
                              <p className="text-[10px] text-slate-500">{u.campusCity}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-amber-400 text-[11px] font-medium">
                            None (Guest User)
                          </span>
                        )}
                      </td>

                      {/* Role & Status */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {isGuest ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                              GUEST
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>ENROLLED STUDENT</span>
                            </span>
                          )}
                          {u.isBanned && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              BANNED
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Enrolled date */}
                      <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {!isGuest && (
                          <button
                            onClick={() => void handleRevoke(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Revoke campus authorization"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Student Enrollment Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Enroll Student</h3>
                  <p className="text-[11px] text-slate-400">
                    Authorize student Google account under this campus
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEnrollModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSingleEnroll} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Student Google Email <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={enrollForm.email}
                    onChange={(e) => setEnrollForm({ ...enrollForm, email: e.target.value })}
                    placeholder="student@gmail.com or college@domain.edu"
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  The student must sign into StuNet with this exact Google account.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Unique Username / Roll No <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={enrollForm.username}
                  onChange={(e) => setEnrollForm({ ...enrollForm, username: e.target.value })}
                  placeholder="e.g. 2102508579 or rohan_s"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Must be globally unique across StuNet.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Student Full Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={enrollForm.displayName}
                  onChange={(e) => setEnrollForm({ ...enrollForm, displayName: e.target.value })}
                  placeholder="e.g. Rohan Sharma"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Year of Joining (College) <span className="text-amber-400">*</span>
                </label>
                <select
                  required
                  value={enrollForm.joiningYear}
                  onChange={(e) => setEnrollForm({ ...enrollForm, joiningYear: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                >
                  {yearOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Academic cycle starts in August and ends in July. Automatically computes 1st, 2nd,
                  3rd, 4th Year or Alumni.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Department / Academic Info (Optional)
                </label>
                <input
                  type="text"
                  value={enrollForm.headline}
                  onChange={(e) => setEnrollForm({ ...enrollForm, headline: e.target.value })}
                  placeholder="e.g. B.Tech Computer Science - Year 3"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="h-3 w-3 animate-spin" />}
                  <span>Authorize & Enroll</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Enrollment Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Upload className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Bulk Enroll Students</h3>
                  <p className="text-[11px] text-slate-400">
                    Paste student records in comma-separated format
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleBulkEnroll} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Student List (one per line):{" "}
                  <code>email, username, full_name, [joiningYear]</code>
                </label>
                <textarea
                  rows={8}
                  required
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`rohan@gmail.com, 2102508579, Rohan Sharma, 2024\npriya@gmail.com, 2102508580, Priya Rao, 2025\nanand@gmail.com, 2102508581, Anand Kumar, 2026`}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Format: <code>email, username, full_name, [joiningYear]</code>. If joiningYear is
                  omitted, current session year is used. Duplicates or already registered accounts
                  will be safely skipped.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="h-3 w-3 animate-spin" />}
                  <span>Enroll All Students</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
