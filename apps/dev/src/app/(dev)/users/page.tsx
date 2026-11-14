"use client";

import { useCallback, useEffect, useState } from "react";
import { EntityTable } from "@/components/EntityTable";
import { CreateEditModal } from "@/components/CreateEditModal";
import { CheckCircle2, XCircle, Ban, Clock, GraduationCap } from "lucide-react";
import { calculateAcademicYear, getJoiningYearOptions, type AcademicYearInfo } from "@stunet/types";

interface User {
  id: string;
  displayName: string | null;
  username: string | null;
  role: string;
  verificationStatus: string;
  isBanned: boolean;
  campusId: string | null;
  managedCampusId?: string | null;
  joiningYear?: number | null;
  section?: string | null;
  academicYear?: AcademicYearInfo | null;
  email?: string | null;
  personalEmail?: string | null;
  professionalEmail?: string | null;
  whatsappNumber?: string | null;
  headline?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  campus: { id: string; name: string; slug: string } | null;
  managedCampus?: { id: string; name: string; slug: string } | null;
  studentAcademicDetails?: {
    usn: string;
    currentCourseYear: number | null;
    joinedYear: number | null;
    graduationYear: number | null;
  } | null;
  facultyDetails?: {
    employeeId: string;
    department: string | null;
    designation: string | null;
    category: string | null;
  } | null;
  alumniDetails?: {
    usn: string | null;
    joinedYear: number | null;
    graduationYear: number;
    degree: string | null;
    company: string | null;
    designation: string | null;
    location: string | null;
  } | null;
  _count: { posts: number; connections: number; achievements: number };
}

const ROLE_OPTS = [
  { value: "STUDENT", label: "STUDENT" },
  { value: "FACULTY", label: "FACULTY" },
  { value: "ALUMNI", label: "ALUMNI" },
  { value: "CAMPUS_MANAGER", label: "CAMPUS_MANAGER" },
  { value: "CLUB_MANAGER", label: "CLUB_MANAGER" },
  { value: "SUPER_ADMIN", label: "SUPER_ADMIN" },
  { value: "GUEST", label: "GUEST" },
];

const STATUS_OPTS = [
  { value: "PENDING", label: "PENDING" },
  { value: "VERIFIED", label: "VERIFIED" },
  { value: "REJECTED", label: "REJECTED" },
];

const ROLE_COLORS: Record<string, string> = {
  STUDENT: "text-slate-300",
  FACULTY: "text-purple-400",
  ALUMNI: "text-emerald-400",
  CLUB_MANAGER: "text-blue-400",
  CAMPUS_MANAGER: "text-amber-400",
  SUPER_ADMIN: "text-rose-400",
  GUEST: "text-slate-500",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [campuses, setCampuses] = useState<{ id: string; name: string; city: string }[]>([]);

  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCampuses() {
      try {
        const res = await fetch("/api/dev/campuses");
        const data = (await res.json()) as {
          campuses: { id: string; name: string; city: string }[];
        };
        setCampuses(data.campuses ?? []);
      } catch {
        // ignore
      }
    }
    void loadCampuses();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (roleFilter) params.set("role", roleFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("q", search);
    const res = await fetch(`/api/dev/users?${params}`);
    const data = (await res.json()) as { users: User[]; total: number };
    setUsers(data.users);
    setTotal(data.total);
    setLoading(false);
  }, [page, roleFilter, statusFilter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({
      displayName: "",
      username: "",
      role: "STUDENT",
      verificationStatus: "VERIFIED",
      campusId: campuses[0]?.id ?? "",
      managedCampusId: "",
      email: "",
      personalEmail: "",
      professionalEmail: "",
      whatsappNumber: "",
      usn: "",
      employeeId: "",
      category: "TEACHING",
      department: "",
      designation: "",
      degree: "",
      company: "",
      location: "",
      currentCourseYear: "1",
      joiningYear: String(new Date().getFullYear()),
      section: "",
      graduationYear: String(new Date().getFullYear() + 4),
      headline: "",
      bio: "",
      avatarUrl: "",
      isBanned: false,
    });
    setSaveError(null);
    setModalOpen(true);
  }

  function openEdit(user: User) {
    const isGuest = user.role === "GUEST" || user.username === "guest";
    setEditing(user);
    setForm({
      displayName: isGuest ? "Guest" : (user.displayName ?? ""),
      username: isGuest ? "guest" : (user.username ?? ""),
      role: user.role,
      verificationStatus: user.verificationStatus,
      campusId: user.campusId ?? "",
      managedCampusId: user.managedCampusId ?? "",
      email: isGuest ? "" : (user.email ?? ""),
      personalEmail: isGuest ? "" : (user.personalEmail ?? ""),
      professionalEmail: isGuest ? "" : (user.professionalEmail ?? ""),
      whatsappNumber: isGuest ? "" : (user.whatsappNumber ?? ""),
      usn: user.studentAcademicDetails?.usn ?? user.alumniDetails?.usn ?? "",
      employeeId: user.facultyDetails?.employeeId ?? "",
      category: user.facultyDetails?.category ?? "TEACHING",
      department: user.facultyDetails?.department ?? "",
      designation: user.facultyDetails?.designation ?? user.alumniDetails?.designation ?? "",
      degree: user.alumniDetails?.degree ?? "",
      company: user.alumniDetails?.company ?? "",
      location: user.alumniDetails?.location ?? "",
      currentCourseYear: user.studentAcademicDetails?.currentCourseYear
        ? String(user.studentAcademicDetails.currentCourseYear)
        : "",
      joiningYear: user.joiningYear ? String(user.joiningYear) : "",
      section: user.section ?? "",
      graduationYear: user.studentAcademicDetails?.graduationYear
        ? String(user.studentAcademicDetails.graduationYear)
        : user.alumniDetails?.graduationYear
          ? String(user.alumniDetails.graduationYear)
          : "",
      headline: user.headline ?? "",
      bio: user.bio ?? "",
      avatarUrl: user.avatarUrl ?? "",
      isBanned: user.isBanned ?? false,
    });
    setSaveError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/dev/users", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { ...form, id: editing.id } : form),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error: string; detail?: string };
        setSaveError(err.detail ?? err.error);
        return;
      }
      setModalOpen(false);
      void load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Delete user "${user.displayName ?? user.username}"? This cannot be undone.`))
      return;
    await fetch(`/api/dev/users?id=${user.id}`, { method: "DELETE" });
    void load();
  }

  async function handleBanToggle(user: User) {
    await fetch("/api/dev/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, isBanned: !user.isBanned }),
    });
    void load();
  }

  const COLUMNS = [
    {
      key: "displayName",
      label: "Name",
      render: (u: User) => (
        <div>
          <p className="text-white font-medium">
            {u.role === "GUEST" ? "Guest" : (u.displayName ?? "—")}
          </p>
          <p className="text-[10px] text-slate-500">
            @{u.role === "GUEST" ? "guest" : (u.username ?? "—")}
          </p>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (u: User) => (
        <span
          className={`font-mono text-[10px] font-bold ${ROLE_COLORS[u.role] ?? "text-slate-400"}`}
        >
          {u.role}
        </span>
      ),
    },
    {
      key: "academicYear",
      label: "Academic Year",
      render: (u: User) => {
        if (!u.joiningYear) return <span className="text-slate-600 text-xs">—</span>;
        const info = u.academicYear ?? calculateAcademicYear(u.joiningYear);
        if (!info) return <span className="text-slate-600 text-xs">—</span>;
        return (
          <div>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                info.isAlumni
                  ? "bg-slate-800 text-slate-400 border border-slate-700"
                  : "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20"
              }`}
            >
              <GraduationCap className="h-3 w-3" />
              <span>{info.label}</span>
            </span>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Joined {u.joiningYear} · Aug–Jul{u.section ? ` · Sec ${u.section}` : ""}
            </p>
          </div>
        );
      },
    },
    {
      key: "verificationStatus",
      label: "Status",
      render: (u: User) => {
        const icons = {
          VERIFIED: <CheckCircle2 className="h-3 w-3 text-emerald-400" />,
          PENDING: <Clock className="h-3 w-3 text-amber-400" />,
          REJECTED: <XCircle className="h-3 w-3 text-rose-400" />,
        };
        return (
          <div className="flex items-center gap-1">
            {icons[u.verificationStatus as keyof typeof icons]}
            <span>{u.verificationStatus}</span>
          </div>
        );
      },
    },
    {
      key: "campus",
      label: "Campus / Scope",
      render: (u: User) => (
        <div>
          <p className="text-slate-300">
            {u.campus?.name ?? <span className="text-slate-600">—</span>}
          </p>
          {u.role === "CAMPUS_MANAGER" && (
            <p className="text-[10px] text-amber-400 font-medium">
              Manages:{" "}
              {u.managedCampus?.name ??
                (u.managedCampusId ? `Campus (${u.managedCampusId.slice(-6)})` : "Unassigned")}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "isBanned",
      label: "Banned",
      render: (u: User) =>
        u.isBanned ? (
          <span className="text-rose-400 font-bold">YES</span>
        ) : (
          <span className="text-slate-600">—</span>
        ),
    },
    {
      key: "_count",
      label: "Activity",
      render: (u: User) => (
        <span className="text-[10px] text-slate-500">
          {u._count.posts}p · {u._count.connections}c · {u._count.achievements}a
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Joined",
      render: (u: User) => new Date(u.createdAt).toLocaleDateString(),
    },
    {
      key: "ban",
      label: "Quick",
      render: (u: User) => (
        <button
          onClick={() => handleBanToggle(u)}
          className={`p-1 rounded-lg text-xs transition-colors ${u.isBanned ? "text-emerald-400 hover:bg-emerald-500/10" : "text-rose-400 hover:bg-rose-500/10"}`}
          title={u.isBanned ? "Unban" : "Ban"}
        >
          <Ban className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];

  const FIELDS = [
    { key: "displayName", label: "Full Name", required: true },
    { key: "username", label: "Username / Handle", required: true },
    { key: "role", label: "Role", type: "select" as const, options: ROLE_OPTS, required: true },
    {
      key: "email",
      label: "Primary / Student / College Email",
      required: true,
      placeholder: "e.g. name@college.edu",
    },
    { key: "personalEmail", label: "Personal Email", placeholder: "e.g. personal@gmail.com" },
    {
      key: "professionalEmail",
      label: "Professional / Work Email",
      placeholder: "e.g. work@company.com",
    },
    { key: "whatsappNumber", label: "WhatsApp Number", placeholder: "+91 9876543210" },
    {
      key: "campusId",
      label: "Campus Affiliation",
      type: "searchable-select" as const,
      placeholder: "Search or select campus…",
      options: campuses.map((c) => ({
        value: c.id,
        label: `${c.name} (${c.city})`,
      })),
    },
    { key: "usn", label: "USN / Roll Number (Student / Alumni)", placeholder: "e.g. 2102508579" },
    { key: "employeeId", label: "Employee ID (Faculty)", placeholder: "e.g. FAC-0104" },
    {
      key: "category",
      label: "Faculty Category (Faculty)",
      type: "select" as const,
      options: [
        { value: "TEACHING", label: "Teaching Faculty" },
        { value: "NON_TEACHING", label: "Non-Teaching / Success Coach" },
        { value: "HOD", label: "HOD" },
        { value: "MENTOR", label: "Mentor" },
      ],
    },
    {
      key: "department",
      label: "Department (Faculty)",
      placeholder: "e.g. Computer Science, AI & Data Science",
    },
    {
      key: "designation",
      label: "Designation (Faculty / Alumni)",
      placeholder: "e.g. Assistant Professor, Senior Engineer",
    },
    {
      key: "degree",
      label: "Degree & Major / Branch (Alumni)",
      placeholder: "e.g. B.Tech Computer Science",
    },
    {
      key: "company",
      label: "Current Company (Alumni)",
      placeholder: "e.g. Google, Microsoft, Startup",
    },
    {
      key: "location",
      label: "Location City, Country (Alumni)",
      placeholder: "e.g. Bengaluru, India",
    },
    {
      key: "currentCourseYear",
      label: "Current Course Year (Student)",
      type: "select" as const,
      options: [
        { value: "", label: "Not Applicable" },
        { value: "1", label: "1st Year" },
        { value: "2", label: "2nd Year" },
        { value: "3", label: "3rd Year" },
        { value: "4", label: "4th Year" },
      ],
    },
    {
      key: "joiningYear",
      label: "Year of Joining (College)",
      type: "select" as const,
      placeholder: "Select joining year…",
      options: [
        { value: "", label: "Not Specified" },
        ...getJoiningYearOptions().map((o) => ({ value: String(o.value), label: o.label })),
      ],
    },
    { key: "section", label: "Section (e.g. Sec 1, Sec 2, A, B)", placeholder: "e.g. Sec 1 or A" },
    { key: "graduationYear", label: "Graduation Year (Class Of)", placeholder: "e.g. 2026" },
    {
      key: "verificationStatus",
      label: "Verification Status",
      type: "select" as const,
      options: STATUS_OPTS,
    },
    {
      key: "managedCampusId",
      label: "Managed Campus (CAMPUS_MANAGER only)",
      type: "searchable-select" as const,
      placeholder: "Search or select managed campus scope…",
      options: campuses.map((c) => ({
        value: c.id,
        label: `${c.name} (${c.city})`,
      })),
    },
    { key: "headline", label: "Headline", placeholder: "e.g. CS @ NIAT" },
    { key: "bio", label: "Bio", type: "textarea" as const },
    { key: "avatarUrl", label: "Avatar URL" },
    { key: "isBanned", label: "Banned", type: "boolean" as const },
  ];

  return (
    <>
      <EntityTable
        title="Users"
        data={users}
        columns={COLUMNS}
        total={total}
        page={page}
        limit={20}
        onPageChange={setPage}
        onEdit={openEdit}
        onDelete={handleDelete}
        onAdd={openCreate}
        addLabel="Add User"
        loading={loading}
        filters={
          <>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name / username…"
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
            >
              <option value="">All Roles</option>
              {ROLE_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </>
        }
      />

      <CreateEditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit: ${editing.displayName ?? editing.username}` : "Create User"}
        fields={FIELDS}
        values={form}
        onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))}
        onSubmit={handleSave}
        loading={saving}
        error={saveError}
        submitLabel={editing ? "Save Changes" : "Create User"}
      />
    </>
  );
}
