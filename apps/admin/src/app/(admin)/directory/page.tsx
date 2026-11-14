"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Search,
  Users,
  CheckCircle2,
  Mail,
  Trash2,
  Pencil,
  School,
  X,
  RefreshCw,
  Upload,
  GraduationCap,
  Award,
  Building2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Phone,
  Globe,
} from "lucide-react";
import { useSession } from "next-auth/react";
import type { AcademicYearInfo } from "@stunet/types";

interface EnrolledMember {
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
  section?: string | null;
  academicYear?: AcademicYearInfo | null;
  usn?: string | null;
  currentCourseYear?: number | null;
  graduationYear?: number | null;
  degree?: string | null;
  company?: string | null;
  designation?: string | null;
  location?: string | null;
  employeeId?: string | null;
  department?: string | null;
  category?: string | null;
  email: string | null;
  personalEmail?: string | null;
  professionalEmail?: string | null;
  whatsappNumber?: string | null;
  isActive: boolean;
  isBanned: boolean;
  createdAt: string;
}

interface CampusOption {
  id: string;
  name: string;
  city: string;
  slug?: string;
}

type MemberRoleType = "STUDENT" | "ALUMNI" | "FACULTY";

export default function DirectoryPage(): React.JSX.Element {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const isCampusManager = session?.user?.role === "CAMPUS_MANAGER";

  const [members, setMembers] = useState<EnrolledMember[]>([]);
  const [campuses, setCampuses] = useState<CampusOption[]>([]);
  const [totalCounts, setTotalCounts] = useState<{
    total: number;
    students: number;
    alumni: number;
    faculty: number;
    guest: number;
  }>({ total: 0, students: 0, alumni: 0, faculty: 0, guest: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Member Modal State
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MemberRoleType>("STUDENT");
  const [showLinksAccordion, setShowLinksAccordion] = useState(false);

  // UNPREFILLED FORM: All fields start blank for Superadmin and Campus Admin
  const [memberForm, setMemberForm] = useState({
    displayName: "",
    username: "",
    email: "",
    personalEmail: "",
    professionalEmail: "",
    whatsappNumber: "",
    campusId: "",
    headline: "",
    joiningYear: "",
    section: "",
    usn: "",
    currentCourseYear: "",
    graduationYear: "",
    degree: "",
    company: "",
    designation: "",
    location: "",
    employeeId: "",
    department: "",
    category: "TEACHING",
    // 13 Profile Links
    linktree: "",
    portfolio: "",
    instagram: "",
    youtube: "",
    twitter: "",
    threads: "",
    linkedin: "",
    github: "",
    huggingface: "",
    leetcode: "",
    hackerrank: "",
    codeforces: "",
    kaggle: "",
  });

  // Bulk Enroll Modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRole, setBulkRole] = useState<MemberRoleType>("STUDENT");
  const [bulkCampusId, setBulkCampusId] = useState("");
  const [bulkText, setBulkText] = useState("");

  // Batches for dynamic section lookup
  const [batches, setBatches] = useState<
    Array<{ id: string; campusId: string; year: number; sections?: string[] }>
  >([]);

  useEffect(() => {
    async function loadBatches() {
      try {
        const res = await fetch("/api/batches");
        if (res.ok) {
          const data = await res.json();
          setBatches(data.batches || []);
        }
      } catch {
        // ignore
      }
    }
    void loadBatches();
  }, []);

  const availableBatchSections = useMemo(() => {
    const targetCampus = isCampusManager ? session?.user?.managedCampusId : memberForm.campusId;
    const yearNum = memberForm.joiningYear ? parseInt(memberForm.joiningYear, 10) : null;
    const campusBatches = batches.filter((b) => !targetCampus || b.campusId === targetCampus);
    if (yearNum) {
      const match = campusBatches.find((b) => b.year === yearNum);
      if (match?.sections && match.sections.length > 0) return match.sections;
    }
    const set = new Set<string>();
    for (const b of campusBatches) {
      if (b.sections) {
        for (const s of b.sections) set.add(s);
      }
    }
    return Array.from(set);
  }, [batches, isCampusManager, memberForm.campusId, memberForm.joiningYear, session]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function notify(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 5000);
  }

  function openNewModal(role: MemberRoleType) {
    setEditingMemberId(null);
    setActiveTab(role);
    setMemberForm({
      displayName: "",
      username: "",
      email: "",
      personalEmail: "",
      professionalEmail: "",
      whatsappNumber: "",
      campusId: isCampusManager ? (session?.user?.managedCampusId ?? "") : "",
      headline: "",
      joiningYear: "",
      section: "",
      usn: "",
      currentCourseYear: "",
      graduationYear: "",
      degree: "",
      company: "",
      designation: "",
      location: "",
      employeeId: "",
      department: "",
      category: "TEACHING",
      linktree: "",
      portfolio: "",
      instagram: "",
      youtube: "",
      twitter: "",
      threads: "",
      linkedin: "",
      github: "",
      huggingface: "",
      leetcode: "",
      hackerrank: "",
      codeforces: "",
      kaggle: "",
    });
    setErrorMsg(null);
    setShowLinksAccordion(false);
    setShowMemberModal(true);
  }

  function handleOpenEdit(member: EnrolledMember) {
    setEditingMemberId(member.id);
    setActiveTab(
      member.role === "FACULTY" ? "FACULTY" : member.role === "ALUMNI" ? "ALUMNI" : "STUDENT",
    );
    setMemberForm({
      displayName: member.displayName || "",
      username: member.username || "",
      email: member.email || "",
      personalEmail: member.personalEmail || "",
      professionalEmail: member.professionalEmail || "",
      whatsappNumber: member.whatsappNumber || "",
      campusId: member.campusId || "",
      headline: member.headline || "",
      joiningYear: member.joiningYear ? String(member.joiningYear) : "",
      section: member.section || "",
      usn: member.usn || "",
      currentCourseYear: member.currentCourseYear ? String(member.currentCourseYear) : "",
      graduationYear: member.graduationYear ? String(member.graduationYear) : "",
      degree: member.degree || "",
      company: member.company || "",
      designation: member.designation || "",
      location: member.location || "",
      employeeId: member.employeeId || "",
      department: member.department || "",
      category: member.category || "TEACHING",
      linktree: "",
      portfolio: "",
      instagram: "",
      youtube: "",
      twitter: "",
      threads: "",
      linkedin: "",
      github: "",
      huggingface: "",
      leetcode: "",
      hackerrank: "",
      codeforces: "",
      kaggle: "",
    });
    setErrorMsg(null);
    setShowLinksAccordion(false);
    setShowMemberModal(true);
  }

  // Load campuses for Super Admin selection
  useEffect(() => {
    async function loadCampuses() {
      try {
        const res = await fetch("/api/campuses");
        if (res.ok) {
          const data = (await res.json()) as
            CampusOption[] | { campuses?: CampusOption[]; items?: CampusOption[] };
          const list = Array.isArray(data) ? data : data.campuses || data.items || [];
          setCampuses(list);
        }
      } catch (err) {
        console.error("Failed to load campuses", err);
      }
    }
    void loadCampuses();
  }, []);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      const res = await fetch(`/api/directory/enroll?${params.toString()}`);
      const data = (await res.json()) as {
        students?: EnrolledMember[];
        counts?: {
          total: number;
          students: number;
          alumni: number;
          faculty: number;
          guest: number;
        };
      };
      if (data.students) {
        setMembers(data.students);
      }
      if (data.counts) {
        setTotalCounts(data.counts);
      }
    } catch {
      setErrorMsg("Failed to load directory.");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  // Handle single enrollment submit
  async function handleSingleEnroll(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const targetCampus = isCampusManager ? session?.user?.managedCampusId : memberForm.campusId;

    if (!targetCampus) {
      setErrorMsg("Please select a target campus.");
      setSubmitting(false);
      return;
    }

    try {
      const profileLinks: Record<string, string> = {};
      if (memberForm.linktree) profileLinks.linktree = memberForm.linktree;
      if (memberForm.portfolio) profileLinks.portfolio = memberForm.portfolio;
      if (memberForm.instagram) profileLinks.instagram = memberForm.instagram;
      if (memberForm.youtube) profileLinks.youtube = memberForm.youtube;
      if (memberForm.twitter) profileLinks.twitter = memberForm.twitter;
      if (memberForm.threads) profileLinks.threads = memberForm.threads;
      if (memberForm.linkedin) profileLinks.linkedin = memberForm.linkedin;
      if (memberForm.github) profileLinks.github = memberForm.github;
      if (memberForm.huggingface) profileLinks.huggingface = memberForm.huggingface;
      if (memberForm.leetcode) profileLinks.leetcode = memberForm.leetcode;
      if (memberForm.hackerrank) profileLinks.hackerrank = memberForm.hackerrank;
      if (memberForm.codeforces) profileLinks.codeforces = memberForm.codeforces;
      if (memberForm.kaggle) profileLinks.kaggle = memberForm.kaggle;

      const payload = {
        role: activeTab,
        displayName: memberForm.displayName,
        username: memberForm.username,
        email: memberForm.email,
        personalEmail: memberForm.personalEmail || undefined,
        professionalEmail: memberForm.professionalEmail || undefined,
        whatsappNumber: memberForm.whatsappNumber || undefined,
        campusId: targetCampus,
        headline: memberForm.headline || undefined,
        joiningYear: memberForm.joiningYear ? parseInt(memberForm.joiningYear, 10) : undefined,
        section: memberForm.section || undefined,
        usn: memberForm.usn || undefined,
        currentCourseYear: memberForm.currentCourseYear
          ? parseInt(memberForm.currentCourseYear, 10)
          : undefined,
        graduationYear: memberForm.graduationYear
          ? parseInt(memberForm.graduationYear, 10)
          : undefined,
        degree: memberForm.degree || undefined,
        company: memberForm.company || undefined,
        designation: memberForm.designation || undefined,
        location: memberForm.location || undefined,
        employeeId: memberForm.employeeId || undefined,
        department: memberForm.department || undefined,
        category: memberForm.category || "TEACHING",
        profileLinks: Object.keys(profileLinks).length > 0 ? profileLinks : undefined,
      };

      if (editingMemberId) {
        const res = await fetch("/api/directory/enroll", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, id: editingMemberId, role: activeTab }),
        });

        const data = (await res.json()) as { error?: string; message?: string };
        if (!res.ok) {
          setErrorMsg(data.error ?? "Failed to update member.");
          return;
        }

        notify(data.message ?? `Member @${payload.username} updated successfully!`);
        setShowMemberModal(false);
        setEditingMemberId(null);
        await loadMembers();
        return;
      }

      const res = await fetch("/api/directory/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to enroll member.");
        return;
      }

      notify(data.message ?? `${activeTab} enrolled and verified successfully!`);
      setShowMemberModal(false);
      setMemberForm({
        displayName: "",
        username: "",
        email: "",
        personalEmail: "",
        professionalEmail: "",
        whatsappNumber: "",
        campusId: isCampusManager ? (session?.user?.managedCampusId ?? "") : "",
        headline: "",
        joiningYear: "",
        section: "",
        usn: "",
        currentCourseYear: "",
        graduationYear: "",
        degree: "",
        company: "",
        designation: "",
        location: "",
        employeeId: "",
        department: "",
        category: "TEACHING",
        linktree: "",
        portfolio: "",
        instagram: "",
        youtube: "",
        twitter: "",
        threads: "",
        linkedin: "",
        github: "",
        huggingface: "",
        leetcode: "",
        hackerrank: "",
        codeforces: "",
        kaggle: "",
      });
      void loadMembers();
    } catch {
      setErrorMsg("Network error while enrolling member.");
    } finally {
      setSubmitting(false);
    }
  }

  // Handle bulk enrollment submit
  async function handleBulkEnroll(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const targetCampus = isCampusManager ? session?.user?.managedCampusId : bulkCampusId;

    if (!targetCampus) {
      setErrorMsg("Please select a target campus.");
      setSubmitting(false);
      return;
    }

    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const parsedList: Array<{
      role: MemberRoleType;
      email: string;
      username: string;
      displayName: string;
      joiningYear?: number;
      graduationYear?: number;
      usn?: string;
      employeeId?: string;
    }> = [];

    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length >= 3) {
        const jYear = parts[3] ? parseInt(parts[3], 10) : undefined;
        const extraId = parts[4] ?? undefined;
        parsedList.push({
          role: bulkRole,
          email: parts[0] ?? "",
          username: parts[1] ?? "",
          displayName: parts[2] ?? "",
          joiningYear: !isNaN(jYear as number) ? jYear : undefined,
          usn: bulkRole !== "FACULTY" ? extraId : undefined,
          employeeId: bulkRole === "FACULTY" ? extraId : undefined,
        });
      }
    }

    if (parsedList.length === 0) {
      setErrorMsg(
        "Please enter at least one valid line in format: email, username, displayName, [joiningYear]",
      );
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/directory/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: bulkRole,
          campusId: targetCampus,
          students: parsedList,
        }),
      });

      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to process bulk enrollment.");
        return;
      }

      notify(data.message ?? "Bulk enrollment completed!");
      setShowBulkModal(false);
      setBulkText("");
      void loadMembers();
    } catch {
      setErrorMsg("Network error while submitting bulk enrollment.");
    } finally {
      setSubmitting(false);
    }
  }

  // Handle revoke enrollment
  async function handleRevoke(member: EnrolledMember) {
    if (
      !confirm(
        `Are you sure you want to revoke campus access for ${member.displayName} (@${member.username})? They will be converted to a Guest user.`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/directory/enroll?userId=${member.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        alert(data.error ?? "Failed to revoke authorization.");
        return;
      }
      notify(data.message ?? "Privileges revoked.");
      void loadMembers();
    } catch {
      alert("Network error.");
    }
  }

  const studentCount = search
    ? members.filter((m) => m.role === "STUDENT" || m.role === "CLUB_MANAGER").length
    : totalCounts.students ||
      members.filter((m) => m.role === "STUDENT" || m.role === "CLUB_MANAGER").length;
  const alumniCount = search
    ? members.filter((m) => m.role === "ALUMNI").length
    : totalCounts.alumni;
  const facultyCount = search
    ? members.filter((m) => m.role === "FACULTY").length
    : totalCounts.faculty || members.filter((m) => m.role === "FACULTY").length;
  const guestCount = search ? members.filter((m) => m.role === "GUEST").length : totalCounts.guest;
  const totalCount = search
    ? members.length
    : totalCounts.total || studentCount + alumniCount + facultyCount + guestCount;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Directory & Member Provisioning</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold uppercase">
              {isSuperAdmin ? "Super Admin Universal" : "Campus Admin Scoped"}
            </span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            {isSuperAdmin
              ? "Add and verify new students, alumni, and faculty across all campuses with immediate verified standing."
              : "Provision and instantly verify student, alumni, and faculty accounts for your campus."}
          </p>
        </div>

        {/* 3 Explicit Action Buttons for Superadmin & Campus Admin */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setBulkRole("STUDENT");
              setShowBulkModal(true);
              setErrorMsg(null);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Upload className="h-3.5 w-3.5 text-slate-400" />
            <span>Bulk CSV</span>
          </button>

          {/* New User (Student) */}
          <button
            onClick={() => openNewModal("STUDENT")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
          >
            <GraduationCap className="h-4 w-4" />
            <span>+ New User (Student)</span>
          </button>

          {/* New Alumni */}
          <button
            onClick={() => openNewModal("ALUMNI")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all"
          >
            <Award className="h-4 w-4" />
            <span>+ New Alumni</span>
          </button>

          {/* New Faculty */}
          <button
            onClick={() => openNewModal("FACULTY")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all"
          >
            <Building2 className="h-4 w-4" />
            <span>+ New Faculty</span>
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
          <p className="text-xs text-indigo-400 font-medium flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Active Students</span>
          </p>
          <p className="text-2xl font-black text-white mt-1">{studentCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Enrolled & Verified</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
            <Award className="h-3.5 w-3.5" />
            <span>Alumni Network</span>
          </p>
          <p className="text-2xl font-black text-amber-400 mt-1">{alumniCount}</p>
          <p className="text-[11px] text-amber-500/80 mt-1">Graduated Batches</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-purple-400 font-medium flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            <span>Faculty Members</span>
          </p>
          <p className="text-2xl font-black text-purple-400 mt-1">{facultyCount}</p>
          <p className="text-[11px] text-purple-500/80 mt-1">Verified Educators</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Admin Authority</span>
          </p>
          <p className="text-xl font-bold text-emerald-400 mt-1">Instant Verified</p>
          <p className="text-[11px] text-slate-500 mt-1">All admin inputs verified</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search member name, username, email, USN, or Employee ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-10 pr-4 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setRoleFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              roleFilter === "ALL"
                ? "bg-indigo-600 text-white"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setRoleFilter("STUDENT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              roleFilter === "STUDENT"
                ? "bg-indigo-600 text-white"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            Students ({studentCount})
          </button>
          <button
            onClick={() => setRoleFilter("ALUMNI")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              roleFilter === "ALUMNI"
                ? "bg-amber-600 text-white"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            Alumni ({alumniCount})
          </button>
          <button
            onClick={() => setRoleFilter("FACULTY")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              roleFilter === "FACULTY"
                ? "bg-purple-600 text-white"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            Faculty ({facultyCount})
          </button>
          {guestCount > 0 && (
            <button
              onClick={() => setRoleFilter("GUEST")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                roleFilter === "GUEST"
                  ? "bg-slate-700 text-white"
                  : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              Guests ({guestCount})
            </button>
          )}
          <button
            onClick={() => void loadMembers()}
            className="p-2 rounded-lg bg-slate-950 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            title="Refresh Directory"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="text-left px-5 py-3.5 font-bold">Member Identity</th>
                <th className="text-left px-5 py-3.5 font-bold">Role & Standing</th>
                <th className="text-left px-5 py-3.5 font-bold">Identifiers</th>
                <th className="text-left px-5 py-3.5 font-bold">Email</th>
                <th className="text-left px-5 py-3.5 font-bold">Campus</th>
                <th className="text-left px-5 py-3.5 font-bold">Verification</th>
                <th className="text-right px-5 py-3.5 font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    <span>Loading directory…</span>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Users className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-300">No members found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Use the <strong>+ New User</strong>, <strong>+ New Alumni</strong>, or{" "}
                      <strong>+ New Faculty</strong> buttons above to provision verified accounts.
                    </p>
                  </td>
                </tr>
              ) : (
                members.map((u) => {
                  const isClubLeader = u.role === "CLUB_MANAGER";
                  const isStudent = u.role === "STUDENT" || isClubLeader;
                  const isAlumni = u.role === "ALUMNI";
                  const isFaculty = u.role === "FACULTY";

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Identity */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${
                              isFaculty
                                ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                                : isAlumni
                                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                  : isStudent
                                    ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                                    : "bg-slate-700 text-slate-400"
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

                      {/* Role & Standing */}
                      <td className="px-5 py-3.5">
                        <div className="space-y-1">
                          {isFaculty && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                              <Building2 className="h-3 w-3" />
                              <span>FACULTY</span>
                            </span>
                          )}
                          {isAlumni && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Award className="h-3 w-3" />
                              <span>ALUMNI</span>
                            </span>
                          )}
                          {isStudent && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              <GraduationCap className="h-3 w-3" />
                              <span>STUDENT</span>
                              {isClubLeader && (
                                <span className="bg-indigo-500/30 text-indigo-200 text-[9px] px-1 rounded ml-1">
                                  PRESIDENT
                                </span>
                              )}
                            </span>
                          )}
                          {!isFaculty && !isAlumni && !isStudent && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              {u.role}
                            </span>
                          )}

                          {u.academicYear && (
                            <p className="text-[10px] text-slate-400 font-mono">
                              {u.academicYear.label}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Identifiers (USN / Employee ID) */}
                      <td className="px-5 py-3.5">
                        {isFaculty && u.employeeId && (
                          <div className="font-mono text-slate-300">
                            <span className="text-[10px] text-purple-400 block font-semibold">
                              Emp ID:
                            </span>
                            <span>{u.employeeId}</span>
                          </div>
                        )}
                        {(isStudent || isAlumni) && u.usn && (
                          <div className="font-mono text-slate-300">
                            <span className="text-[10px] text-indigo-400 block font-semibold">
                              USN:
                            </span>
                            <span>{u.usn}</span>
                          </div>
                        )}
                        {isAlumni && u.graduationYear && (
                          <p className="text-[10px] text-amber-400 font-mono">
                            Class of {u.graduationYear}
                          </p>
                        )}
                        {!u.employeeId && !u.usn && (
                          <span className="text-slate-600 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="px-5 py-3.5">
                        {u.email ? (
                          <span className="font-mono text-slate-300">{u.email}</span>
                        ) : (
                          <span className="text-slate-600 font-mono text-[11px]">—</span>
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
                          <span className="text-slate-500 text-[11px]">Universal</span>
                        )}
                      </td>

                      {/* Verification Status */}
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>VERIFIED</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                            title="Edit User Details"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => void handleRevoke(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Revoke access"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member Enrollment Modal (New User / New Alumni / New Faculty) */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <span>{editingMemberId ? "Edit Member Details" : "Provision New Member"}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase">
                    Admin Verified
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {editingMemberId
                    ? "Update and save profile, academic details, and contact information."
                    : isSuperAdmin
                      ? "Super Admin provisioning: No prefilled fields. Created directly with VERIFIED status."
                      : "Campus Admin provisioning: No prefilled fields. Created directly with VERIFIED status."}
                </p>
              </div>
              <button
                onClick={() => setShowMemberModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 3 Role Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab("STUDENT")}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === "STUDENT"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <GraduationCap className="h-3.5 w-3.5" />
                <span>New Student</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ALUMNI")}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === "ALUMNI"
                    ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Award className="h-3.5 w-3.5" />
                <span>New Alumni</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("FACULTY")}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === "FACULTY"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>New Faculty</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form
              onSubmit={handleSingleEnroll}
              className="space-y-3.5 max-h-[65vh] overflow-y-auto pr-1"
            >
              {/* Campus Selector (Dropdown for Super Admin, fixed badge for Campus Manager) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Campus <span className="text-amber-400">*</span>
                </label>
                {isCampusManager ? (
                  <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-400 font-semibold flex items-center gap-2">
                    <School className="h-4 w-4 text-indigo-400" />
                    <span>{session?.user?.managedCampusName ?? "Assigned Campus"}</span>
                  </div>
                ) : (
                  <select
                    required
                    value={memberForm.campusId}
                    onChange={(e) => setMemberForm({ ...memberForm, campusId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  >
                    <option value="">-- Select Campus --</option>
                    {campuses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.city})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Common Field: Display Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={memberForm.displayName}
                  onChange={(e) => setMemberForm({ ...memberForm, displayName: e.target.value })}
                  placeholder="Enter member's full name"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Common Field: Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Unique Username <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={memberForm.username}
                  onChange={(e) => setMemberForm({ ...memberForm, username: e.target.value })}
                  placeholder="e.g. rohan_s or USN"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              {/* Email & Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Student / Primary Email <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={memberForm.email}
                      onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                      placeholder="e.g. member@college.edu or member@gmail.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Personal Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      value={memberForm.personalEmail}
                      onChange={(e) =>
                        setMemberForm({ ...memberForm, personalEmail: e.target.value })
                      }
                      placeholder="e.g. personal@gmail.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Professional / Work Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      value={memberForm.professionalEmail}
                      onChange={(e) =>
                        setMemberForm({ ...memberForm, professionalEmail: e.target.value })
                      }
                      placeholder="e.g. member@company.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    WhatsApp Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      value={memberForm.whatsappNumber}
                      onChange={(e) =>
                        setMemberForm({ ...memberForm, whatsappNumber: e.target.value })
                      }
                      placeholder="+91 9876543210"
                      className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Role-Specific Fields: STUDENT */}
              {activeTab === "STUDENT" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      University Seat No (USN)
                    </label>
                    <input
                      type="text"
                      value={memberForm.usn}
                      onChange={(e) => setMemberForm({ ...memberForm, usn: e.target.value })}
                      placeholder="e.g. 2102508579"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Joining Year
                      </label>
                      <input
                        type="number"
                        min={1950}
                        max={2100}
                        value={memberForm.joiningYear}
                        onChange={(e) =>
                          setMemberForm({ ...memberForm, joiningYear: e.target.value })
                        }
                        placeholder="e.g. 2023"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Expected Graduation
                      </label>
                      <input
                        type="number"
                        min={1950}
                        max={2150}
                        value={memberForm.graduationYear}
                        onChange={(e) =>
                          setMemberForm({ ...memberForm, graduationYear: e.target.value })
                        }
                        placeholder="e.g. 2027"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Section (From Campus Batch Details)
                    </label>
                    <select
                      value={memberForm.section}
                      onChange={(e) => setMemberForm({ ...memberForm, section: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- Select Section --</option>
                      {availableBatchSections.map((sec) => (
                        <option key={sec} value={sec}>
                          {sec}
                        </option>
                      ))}
                    </select>
                    {availableBatchSections.length === 0 ? (
                      <p className="text-[10px] text-amber-400 mt-1">
                        No sections found for this batch year. You can create sections in the Campus
                        Batches portal.
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-1">
                        Selected section will be assigned to this student and displayed as
                        &ldquo;Year | Section&rdquo;.
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Role-Specific Fields: ALUMNI */}
              {activeTab === "ALUMNI" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        USN / Roll Number
                      </label>
                      <input
                        type="text"
                        value={memberForm.usn}
                        onChange={(e) => setMemberForm({ ...memberForm, usn: e.target.value })}
                        placeholder="e.g. 1802508123"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Graduation Year (Class Of) <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="number"
                        min={1950}
                        max={2150}
                        required
                        value={memberForm.graduationYear}
                        onChange={(e) =>
                          setMemberForm({ ...memberForm, graduationYear: e.target.value })
                        }
                        placeholder="e.g. 2022"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Joining Year
                      </label>
                      <input
                        type="number"
                        min={1950}
                        max={2100}
                        value={memberForm.joiningYear}
                        onChange={(e) =>
                          setMemberForm({ ...memberForm, joiningYear: e.target.value })
                        }
                        placeholder="e.g. 2018"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Degree & Major / Branch
                      </label>
                      <input
                        type="text"
                        value={memberForm.degree}
                        onChange={(e) => setMemberForm({ ...memberForm, degree: e.target.value })}
                        placeholder="e.g. B.Tech Computer Science"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Current Company / Organization
                      </label>
                      <input
                        type="text"
                        value={memberForm.company}
                        onChange={(e) => setMemberForm({ ...memberForm, company: e.target.value })}
                        placeholder="e.g. Google, Microsoft, Startup"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Current Designation / Position
                      </label>
                      <input
                        type="text"
                        value={memberForm.designation}
                        onChange={(e) =>
                          setMemberForm({ ...memberForm, designation: e.target.value })
                        }
                        placeholder="e.g. Senior Software Engineer"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Location (City, Country)
                    </label>
                    <input
                      type="text"
                      value={memberForm.location}
                      onChange={(e) => setMemberForm({ ...memberForm, location: e.target.value })}
                      placeholder="e.g. Bengaluru, India"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </>
              )}

              {/* Role-Specific Fields: FACULTY */}
              {activeTab === "FACULTY" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        NxtWave Employee ID <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={memberForm.employeeId}
                        onChange={(e) =>
                          setMemberForm({ ...memberForm, employeeId: e.target.value })
                        }
                        placeholder="e.g. FAC-0492"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Faculty Category <span className="text-amber-400">*</span>
                      </label>
                      <select
                        value={memberForm.category}
                        onChange={(e) => setMemberForm({ ...memberForm, category: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="TEACHING">Teaching Faculty</option>
                        <option value="NON_TEACHING">Non-Teaching Faculty / Success Coach</option>
                        <option value="HOD">HOD</option>
                        <option value="MENTOR">Mentor</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        value={memberForm.department}
                        onChange={(e) =>
                          setMemberForm({ ...memberForm, department: e.target.value })
                        }
                        placeholder="e.g. Computer Science, AI & Data Science"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Academic Designation / Title
                      </label>
                      <input
                        type="text"
                        value={memberForm.designation}
                        onChange={(e) =>
                          setMemberForm({ ...memberForm, designation: e.target.value })
                        }
                        placeholder="e.g. Assistant Professor, Professor, Success Coach"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Joining Year
                    </label>
                    <input
                      type="number"
                      min={1950}
                      max={2100}
                      value={memberForm.joiningYear}
                      onChange={(e) =>
                        setMemberForm({ ...memberForm, joiningYear: e.target.value })
                      }
                      placeholder="e.g. 2021"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </>
              )}

              {/* Profile Links Collapsible Section */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowLinksAccordion((prev) => !prev)}
                  className="w-full flex items-center justify-between p-3 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-indigo-400" />
                    <span>Profile Links (13 Platforms)</span>
                  </div>
                  {showLinksAccordion ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>

                {showLinksAccordion && (
                  <div className="p-3 pt-0 border-t border-slate-800/60 space-y-2.5">
                    <p className="text-[10px] text-slate-500">
                      Add social and competitive coding profiles. All links are optional.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        { key: "linktree", label: "LinkTree", ph: "https://linktr.ee/..." },
                        {
                          key: "portfolio",
                          label: "Portfolio Website",
                          ph: "https://myportfolio.dev",
                        },
                        { key: "linkedin", label: "LinkedIn", ph: "https://linkedin.com/in/..." },
                        { key: "github", label: "GitHub", ph: "https://github.com/..." },
                        { key: "twitter", label: "Twitter / X", ph: "https://x.com/..." },
                        { key: "threads", label: "Threads", ph: "https://threads.net/@..." },
                        { key: "instagram", label: "Instagram", ph: "https://instagram.com/..." },
                        { key: "youtube", label: "YouTube", ph: "https://youtube.com/@..." },
                        { key: "leetcode", label: "LeetCode", ph: "https://leetcode.com/..." },
                        {
                          key: "hackerrank",
                          label: "HackerRank",
                          ph: "https://hackerrank.com/...",
                        },
                        {
                          key: "codeforces",
                          label: "CodeForces",
                          ph: "https://codeforces.com/profile/...",
                        },
                        { key: "kaggle", label: "Kaggle", ph: "https://kaggle.com/..." },
                        {
                          key: "huggingface",
                          label: "Hugging Face",
                          ph: "https://huggingface.co/...",
                        },
                      ].map((item) => (
                        <div key={item.key}>
                          <label className="block text-[10px] font-medium text-slate-400 mb-0.5">
                            {item.label}
                          </label>
                          <input
                            type="url"
                            value={memberForm[item.key as keyof typeof memberForm]}
                            onChange={(e) =>
                              setMemberForm({ ...memberForm, [item.key]: e.target.value })
                            }
                            placeholder={item.ph}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Common Field: Headline / Bio */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Headline / Designation / Bio (Optional)
                </label>
                <input
                  type="text"
                  value={memberForm.headline}
                  onChange={(e) => setMemberForm({ ...memberForm, headline: e.target.value })}
                  placeholder={
                    activeTab === "FACULTY"
                      ? "e.g. Associate Professor, Dept. of Computer Science"
                      : activeTab === "ALUMNI"
                        ? "e.g. Software Engineer @ Google · Class of 2022"
                        : "e.g. B.Tech Computer Science · 3rd Year"
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 ${
                    activeTab === "FACULTY"
                      ? "bg-purple-600 hover:bg-purple-500 shadow-purple-600/25"
                      : activeTab === "ALUMNI"
                        ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/25"
                        : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25"
                  }`}
                >
                  {submitting && <RefreshCw className="h-3 w-3 animate-spin" />}
                  <span>
                    {editingMemberId
                      ? submitting
                        ? "Saving Changes…"
                        : "Save Changes"
                      : submitting
                        ? "Provisioning…"
                        : `Enroll & Verify ${
                            activeTab === "FACULTY"
                              ? "Faculty"
                              : activeTab === "ALUMNI"
                                ? "Alumni"
                                : "Student"
                          }`}
                  </span>
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
                  <h3 className="font-bold text-white text-base">Bulk Enroll Members</h3>
                  <p className="text-[11px] text-slate-400">
                    Paste member records in comma-separated format
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

            {/* Role selector for bulk */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Bulk Role:</span>
              {(["STUDENT", "ALUMNI", "FACULTY"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setBulkRole(r)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    bulkRole === r
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Campus selector if super admin */}
            {isSuperAdmin && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Campus <span className="text-amber-400">*</span>
                </label>
                <select
                  required
                  value={bulkCampusId}
                  onChange={(e) => setBulkCampusId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                >
                  <option value="">-- Select Campus --</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleBulkEnroll} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Records (one per line):{" "}
                  <code>email, username, full_name, [year], [identifier]</code>
                </label>
                <textarea
                  rows={8}
                  required
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`rohan@college.edu, 2102508579, Rohan Sharma, 2023, USN_12345\npriya@college.edu, 2102508580, Priya Rao, 2024, USN_12346`}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
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
                  <span>Enroll All</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
