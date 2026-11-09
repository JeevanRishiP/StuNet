"use client";

import { useState, useEffect, useTransition } from "react";
import { useSession } from "next-auth/react";
import {
  School,
  Plus,
  Search,
  Building2,
  Award,
  BookOpen,
  Bell,
  Trash2,
  ExternalLink,
  X,
  Sparkles,
} from "lucide-react";

interface CampusSummary {
  id: string;
  name: string;
  universityName: string | null;
  slug: string;
  city: string;
  state: string;
  emailDomain: string | null;
  websiteUrl: string | null;
  address: string | null;
  facilities: string[];
  isActive: boolean;
  _count: {
    clubs: number;
    faculties: number;
    userIdentities: number;
  };
}

interface Faculty {
  id: string;
  name: string;
  designation: string;
  department: string;
  category?: string;
  employeeId?: string | null;
  email: string | null;
  phone: string | null;
  officeRoom: string | null;
}

interface ClubMember {
  id: string;
  role: string;
  user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    headline: string | null;
  };
}

interface Club {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  instagramUrl: string | null;
  members: ClubMember[];
}

interface CampusDetail extends CampusSummary {
  faculties: Faculty[];
  clubs: Club[];
  liveAlerts: Array<{ id: string; title: string; body: string; createdAt: string }>;
  ciaSchedules: Array<{
    id: string;
    subject: string;
    component: string;
    scheduledAt: string;
    venue: string | null;
  }>;
  iaExams: Array<{
    id: string;
    subject: string;
    examType: string;
    scheduledAt: string;
    venue: string | null;
  }>;
}

const CORE_ROLES = [
  { key: "PRESIDENT", label: "President", icon: "⭐" },
  { key: "VICE_PRESIDENT", label: "Vice President", icon: "🎖️" },
  { key: "OPERATIONAL_HEAD", label: "Operational Head", icon: "⚙️" },
  { key: "OUTREACH_HEAD", label: "Outreach Head", icon: "📢" },
  { key: "FINANCE_HEAD", label: "Finance Head", icon: "💰" },
  { key: "CREATIVE_DESIGN_HEAD", label: "Creative & Design Head", icon: "🎨" },
  { key: "SOCIAL_MEDIA_HEAD", label: "Social Media Head", icon: "📱" },
];

export default function CampusesManagerPage(): React.JSX.Element {
  const { data: session } = useSession();
  const isCampusManager = session?.user?.role === "CAMPUS_MANAGER";

  const [campuses, setCampuses] = useState<CampusSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("ALL");
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);
  const [campusDetail, setCampusDetail] = useState<CampusDetail | null>(null);
  const [activeTab, setActiveTab] = useState<"INFO" | "FACULTIES" | "CLUBS" | "ACADEMIC">("INFO");
  const [isPending, startTransition] = useTransition();

  // New Campus Modal state (UNPREFILLED for Superadmin & Campus Admin)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCampus, setNewCampus] = useState({
    name: "",
    universityName: "",
    city: "",
    state: "",
    address: "",
    emailDomain: "",
    websiteUrl: "",
    facilities: "",
  });

  // New Faculty Form state (UNPREFILLED for Superadmin & Campus Admin)
  const [newFaculty, setNewFaculty] = useState({
    name: "",
    designation: "",
    department: "",
    category: "TEACHING",
    employeeId: "",
    email: "",
    phone: "",
    officeRoom: "",
  });

  // Filter faculties by role/category
  const [facultyRoleFilter, setFacultyRoleFilter] = useState<
    "ALL" | "TEACHING" | "NON_TEACHING" | "COACH_MENTOR"
  >("ALL");

  // Assign Role Form state
  const [assigningClub, setAssigningClub] = useState<{
    clubId: string;
    clubName: string;
    role: string;
  } | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [studentOptions, setStudentOptions] = useState<
    Array<{ id: string; displayName: string; username: string }>
  >([]);

  // Academic Broadcast form state
  const [newAlert, setNewAlert] = useState({
    type: "ALERT" as "ALERT" | "CIA" | "IA",
    title: "",
    body: "",
    component: "CIA 1",
    scheduledAt: "",
    venue: "",
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function notify(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }

  // Load Campuses
  async function loadCampuses() {
    try {
      const res = await fetch("/api/campuses");
      const data = await res.json();
      if (data.campuses) {
        setCampuses(data.campuses);
        if (session?.user?.managedCampusId) {
          setSelectedCampusId(session.user.managedCampusId);
        } else if (data.campuses.length > 0 && session?.user?.role === "CAMPUS_MANAGER") {
          setSelectedCampusId(data.campuses[0].id);
        }
      }
    } catch {
      notify("Failed to load campuses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampuses();
  }, [session?.user?.managedCampusId]);

  useEffect(() => {
    if (session?.user?.managedCampusId && !selectedCampusId) {
      setSelectedCampusId(session.user.managedCampusId);
    }
  }, [session?.user?.managedCampusId, selectedCampusId]);

  // Load Selected Campus Details
  async function loadCampusDetail(id: string) {
    try {
      const res = await fetch(`/api/campuses/${id}`);
      const data = await res.json();
      if (data.campus) {
        setCampusDetail(data.campus);
      }
    } catch {
      notify("Failed to load campus details");
    }
  }

  useEffect(() => {
    if (selectedCampusId) {
      loadCampusDetail(selectedCampusId);
    } else {
      setCampusDetail(null);
    }
  }, [selectedCampusId]);

  // Load Students for Role Assignment
  useEffect(() => {
    async function loadStudents() {
      try {
        const res = await fetch("/api/users?role=STUDENT&limit=50");
        const data = await res.json();
        const items = data.users || data.items || [];
        setStudentOptions(items);
        if (items.length > 0) setSelectedStudentId(items[0].id);
      } catch {
        // Fallback default demo students
        setStudentOptions([
          {
            id: "cmw6jxe6g00azcuyrc2fbrre9",
            displayName: "Harshitha Shree Raj",
            username: "2102508576",
          },
          {
            id: "cmw6jxeel00mlcuyrqek2z882",
            displayName: "Sankirth R Bhat",
            username: "2102508646",
          },
          { id: "cmw6jxe7i00cfcuyrbrt0gdsw", displayName: "Karan Raj K R", username: "2102508585" },
        ]);
        setSelectedStudentId("cmw6jxe6g00azcuyrc2fbrre9");
      }
    }
    loadStudents();
  }, []);

  // Filtered campuses
  const filteredCampuses = campuses.filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.universityName && c.universityName.toLowerCase().includes(search.toLowerCase())) ||
      c.city.toLowerCase().includes(search.toLowerCase()) ||
      c.state.toLowerCase().includes(search.toLowerCase());

    const matchesState =
      stateFilter === "ALL" || c.state.toLowerCase() === stateFilter.toLowerCase();
    return matchesSearch && matchesState;
  });

  const uniqueStates = Array.from(new Set(campuses.map((c) => c.state))).sort();

  // Create Campus
  function handleCreateCampus(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const facilitiesArray = newCampus.facilities
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        const res = await fetch("/api/campuses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...newCampus,
            facilities: facilitiesArray,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          notify(`✓ ${data.message || "Campus created successfully!"}`);
          setShowAddModal(false);
          loadCampuses();
          setNewCampus({
            name: "",
            universityName: "",
            city: "",
            state: "",
            address: "",
            emailDomain: "",
            websiteUrl: "",
            facilities: "",
          });
        } else {
          notify(`Error: ${data.error || "Failed to create campus"}`);
        }
      } catch {
        notify("Network error while creating campus");
      }
    });
  }

  // Update Campus Info
  function handleUpdateCampus(e: React.FormEvent) {
    e.preventDefault();
    if (!campusDetail) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/campuses/${campusDetail.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: campusDetail.name,
            universityName: campusDetail.universityName,
            city: campusDetail.city,
            state: campusDetail.state,
            address: campusDetail.address,
            emailDomain: campusDetail.emailDomain,
            websiteUrl: campusDetail.websiteUrl,
            facilities: campusDetail.facilities,
          }),
        });
        if (res.ok) {
          notify("✓ Campus details updated!");
          loadCampuses();
        } else {
          notify("Failed to update campus details");
        }
      } catch {
        notify("Network error");
      }
    });
  }

  // Add Faculty
  function handleAddFaculty(e: React.FormEvent) {
    e.preventDefault();
    if (!campusDetail) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/campuses/${campusDetail.id}/faculties`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newFaculty),
        });
        if (res.ok) {
          notify("✓ Faculty member added!");
          setNewFaculty({
            name: "",
            designation: "",
            department: "",
            category: "TEACHING",
            employeeId: "",
            email: "",
            phone: "",
            officeRoom: "",
          });
          loadCampusDetail(campusDetail.id);
        } else {
          notify("Failed to add faculty");
        }
      } catch {
        notify("Network error adding faculty");
      }
    });
  }

  // Delete Faculty
  function handleDeleteFaculty(facultyId: string) {
    if (!campusDetail) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/campuses/${campusDetail.id}/faculties/${facultyId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          notify("Faculty member removed");
          loadCampusDetail(campusDetail.id);
        }
      } catch {
        notify("Error deleting faculty");
      }
    });
  }

  // Assign Club Role
  function handleAssignRole(e: React.FormEvent) {
    e.preventDefault();
    if (!campusDetail || !assigningClub) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/campuses/${campusDetail.id}/clubs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clubId: assigningClub.clubId,
            userId: selectedStudentId,
            role: assigningClub.role,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          notify(`✓ ${data.message || "Role assigned successfully!"}`);
          setAssigningClub(null);
          loadCampusDetail(campusDetail.id);
        } else {
          notify(`Error: ${data.error}`);
        }
      } catch {
        notify("Failed to assign role");
      }
    });
  }

  // Revoke Club Role
  function handleRevokeRole(clubId: string, userId: string) {
    if (!campusDetail) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/campuses/${campusDetail.id}/clubs`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clubId, userId }),
        });
        if (res.ok) {
          notify("Club role revoked");
          loadCampusDetail(campusDetail.id);
        }
      } catch {
        notify("Failed to revoke role");
      }
    });
  }

  // Add Academic Alert / Schedule
  function handleAddAcademic(e: React.FormEvent) {
    e.preventDefault();
    if (!campusDetail) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/campuses/${campusDetail.id}/academic`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newAlert),
        });
        if (res.ok) {
          notify("✓ Academic announcement / deadline published!");
          setNewAlert({
            type: "ALERT",
            title: "",
            body: "",
            component: "CIA 1",
            scheduledAt: "",
            venue: "",
          });
          loadCampusDetail(campusDetail.id);
        }
      } catch {
        notify("Failed to publish academic update");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <School className="h-6 w-6 text-indigo-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {isCampusManager
                ? "Campus Infrastructure & Operations"
                : "Campus Infrastructure & Hub"}
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isCampusManager
              ? "Institutional administration, official clubs leadership, faculty directory, and academic schedules for your campus."
              : "Manage all 43 NIAT partner institutions, campus faculties, 7 official clubs, core leadership roster, and academic schedules."}
          </p>
        </div>

        {!isCampusManager && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Campus</span>
          </button>
        )}
      </div>

      {/* For Campus Manager loading state */}
      {isCampusManager && loading && (
        <div className="text-center py-20 text-slate-500 text-sm">
          <School className="h-8 w-8 mx-auto text-indigo-400 animate-pulse mb-3" />
          <span>Loading your campus workspace…</span>
        </div>
      )}

      {/* Super Admin All-Campuses Browser */}
      {!isCampusManager && (
        <>
          {/* Stats Bento Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-400 font-medium">Total Campuses</p>
              <p className="text-2xl font-black text-white mt-1">{campuses.length}</p>
              <p className="text-[11px] text-emerald-400 mt-1">Across 10 Indian States</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-400 font-medium">Clubs Active</p>
              <p className="text-2xl font-black text-white mt-1">{campuses.length * 7}</p>
              <p className="text-[11px] text-indigo-400 mt-1">7 Official Clubs / Campus</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-400 font-medium">Leadership Slots</p>
              <p className="text-2xl font-black text-white mt-1">{campuses.length * 7 * 7}</p>
              <p className="text-[11px] text-amber-400 mt-1">7 Core Roles / Club</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-400 font-medium">System Status</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">100% Live</p>
              <p className="text-[11px] text-slate-400 mt-1">Role-Isolated DB Grants</p>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search campus by name, university, city, or facilities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setStateFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  stateFilter === "ALL"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                All States ({campuses.length})
              </button>
              {uniqueStates.map((st) => {
                const count = campuses.filter((c) => c.state === st).length;
                return (
                  <button
                    key={st}
                    onClick={() => setStateFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      stateFilter === st
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    {st} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campuses Cards Grid */}
          {loading ? (
            <div className="text-center py-16 text-slate-500 text-sm">
              Loading campuses from database...
            </div>
          ) : filteredCampuses.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm">
              No campuses match your filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCampuses.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-slate-800/90 bg-slate-900/70 p-5 hover:border-slate-700 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-800/50">
                          <School className="h-4 w-4" />
                        </span>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                            {c.state} • {c.city}
                          </span>
                          <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                            {c.name}
                          </h3>
                        </div>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-emerald-950/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-800/50">
                        Active
                      </span>
                    </div>

                    {c.universityName && (
                      <p className="text-xs text-slate-400 line-clamp-1 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span>{c.universityName}</span>
                      </p>
                    )}

                    {/* Facilities Tags */}
                    {c.facilities && c.facilities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {c.facilities.slice(0, 3).map((f, i) => (
                          <span
                            key={i}
                            className="rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-300 border border-slate-700/50"
                          >
                            {f}
                          </span>
                        ))}
                        {c.facilities.length > 3 && (
                          <span className="rounded-md bg-slate-800/50 px-1.5 py-0.5 text-[10px] text-slate-500">
                            +{c.facilities.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom Meta & Action */}
                  <div className="border-t border-slate-800/80 mt-4 pt-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Award className="h-3.5 w-3.5 text-indigo-400" />
                        <span>7 Clubs</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
                        <span>{c._count.faculties} Faculties</span>
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedCampusId(c.id)}
                      className="rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white font-semibold px-3 py-1.5 text-xs shadow-sm transition-colors"
                    >
                      Manage Campus →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* CAMPUS DETAIL WORKSPACE (INLINE FOR MANAGER, MODAL FOR SUPER ADMIN) */}
      {/* ──────────────────────────────────────────────────────────── */}
      {campusDetail && (
        <div
          className={
            isCampusManager
              ? "w-full flex flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden mt-2"
              : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
          }
        >
          <div
            className={
              isCampusManager
                ? "w-full flex flex-col"
                : "w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden"
            }
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/50">
                    {campusDetail.state} • {campusDetail.city}
                  </span>
                  <span className="text-xs text-slate-400">
                    Slug: <code className="text-slate-300 font-mono">{campusDetail.slug}</code>
                  </span>
                  {isCampusManager && (
                    <span className="text-xs font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      ✓ Dedicated Campus Console
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white">{campusDetail.name}</h2>
                <p className="text-xs text-slate-400">
                  {campusDetail.universityName || "NIAT Partner Institution"}
                </p>
              </div>

              {!isCampusManager && (
                <button
                  onClick={() => setSelectedCampusId(null)}
                  className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Sub-nav Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 gap-2">
              {[
                { id: "INFO", label: "Campus Stuffs & Info", icon: Building2 },
                {
                  id: "FACULTIES",
                  label: `Faculties (${campusDetail.faculties?.length ?? 0})`,
                  icon: BookOpen,
                },
                {
                  id: "CLUBS",
                  label: `7 Official Clubs (${campusDetail.clubs?.length ?? 7})`,
                  icon: Award,
                },
                { id: "ACADEMIC", label: "Academic Hub & Alerts", icon: Bell },
              ].map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as typeof activeTab)}
                    className={`flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-semibold transition-all ${
                      active
                        ? "border-indigo-500 text-indigo-400"
                        : "border-transparent text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: INFO & CAMPUS STUFFS */}
              {activeTab === "INFO" && (
                <form onSubmit={handleUpdateCampus} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Campus Name
                      </label>
                      <input
                        type="text"
                        value={campusDetail.name}
                        onChange={(e) => setCampusDetail({ ...campusDetail, name: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        University Name
                      </label>
                      <input
                        type="text"
                        value={campusDetail.universityName ?? ""}
                        onChange={(e) =>
                          setCampusDetail({ ...campusDetail, universityName: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={campusDetail.city}
                        onChange={(e) => setCampusDetail({ ...campusDetail, city: e.target.value })}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={campusDetail.state}
                        onChange={(e) =>
                          setCampusDetail({ ...campusDetail, state: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Campus Address
                      </label>
                      <input
                        type="text"
                        value={campusDetail.address ?? ""}
                        onChange={(e) =>
                          setCampusDetail({ ...campusDetail, address: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Facilities & Stuffs (Comma-separated)
                      </label>
                      <input
                        type="text"
                        value={campusDetail.facilities ? campusDetail.facilities.join(", ") : ""}
                        onChange={(e) =>
                          setCampusDetail({
                            ...campusDetail,
                            facilities: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="#Cipher Coding Zone, iHACK Lab, Hostel, Transport, Sports Arena"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Email Domain
                      </label>
                      <input
                        type="text"
                        value={campusDetail.emailDomain ?? ""}
                        onChange={(e) =>
                          setCampusDetail({ ...campusDetail, emailDomain: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Website URL
                      </label>
                      <input
                        type="url"
                        value={campusDetail.websiteUrl ?? ""}
                        onChange={(e) =>
                          setCampusDetail({ ...campusDetail, websiteUrl: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
                    >
                      {isPending ? "Saving Changes…" : "Save Campus Stuffs & Info"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: FACULTY DIRECTORY */}
              {activeTab === "FACULTIES" &&
                (() => {
                  const allFaculties = campusDetail.faculties ?? [];
                  const teachingList = allFaculties.filter(
                    (f) => !f.category || f.category === "TEACHING" || f.category === "HOD",
                  );
                  const nonTeachingList = allFaculties.filter((f) => f.category === "NON_TEACHING");
                  const coachMentorList = allFaculties.filter(
                    (f) => f.category === "SUCCESS_COACH" || f.category === "MENTOR",
                  );

                  const displayedFaculties =
                    facultyRoleFilter === "TEACHING"
                      ? teachingList
                      : facultyRoleFilter === "NON_TEACHING"
                        ? nonTeachingList
                        : facultyRoleFilter === "COACH_MENTOR"
                          ? coachMentorList
                          : allFaculties;

                  return (
                    <div className="space-y-6">
                      {/* Add Faculty Form */}
                      <form
                        onSubmit={handleAddFaculty}
                        className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3"
                      >
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Faculty, Coach, or Mentor to this Campus</span>
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">
                              Role / Category <span className="text-indigo-400">*</span>
                            </label>
                            <select
                              value={newFaculty.category}
                              onChange={(e) =>
                                setNewFaculty({ ...newFaculty, category: e.target.value })
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                            >
                              <option value="TEACHING">Teaching Faculty</option>
                              <option value="NON_TEACHING">Non-Teaching Staff</option>
                              <option value="SUCCESS_COACH">Dedicated Success Coach</option>
                              <option value="MENTOR">Academic Mentor</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">
                              Employee ID
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. FBSYT003 or FAC-0492"
                              value={newFaculty.employeeId}
                              onChange={(e) =>
                                setNewFaculty({ ...newFaculty, employeeId: e.target.value })
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">
                              Faculty Name <span className="text-indigo-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Dr. Ramesh Kumar"
                              value={newFaculty.name}
                              onChange={(e) =>
                                setNewFaculty({ ...newFaculty, name: e.target.value })
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">
                              Designation <span className="text-indigo-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Assistant Professor / Coach"
                              value={newFaculty.designation}
                              onChange={(e) =>
                                setNewFaculty({ ...newFaculty, designation: e.target.value })
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">
                              Department
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Computer Science & Engineering"
                              value={newFaculty.department}
                              onChange={(e) =>
                                setNewFaculty({ ...newFaculty, department: e.target.value })
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">Email</label>
                            <input
                              type="email"
                              placeholder="faculty@niat.edu.in"
                              value={newFaculty.email}
                              onChange={(e) =>
                                setNewFaculty({ ...newFaculty, email: e.target.value })
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">Phone</label>
                            <input
                              type="text"
                              placeholder="+91 98401 23456"
                              value={newFaculty.phone}
                              onChange={(e) =>
                                setNewFaculty({ ...newFaculty, phone: e.target.value })
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">
                              Office Room / Cabin
                            </label>
                            <input
                              type="text"
                              placeholder="Tech Block A - Room 302"
                              value={newFaculty.officeRoom}
                              onChange={(e) =>
                                setNewFaculty({ ...newFaculty, officeRoom: e.target.value })
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="submit"
                            disabled={isPending}
                            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 transition-colors disabled:opacity-50"
                          >
                            {isPending ? "Adding…" : "Add Faculty Member"}
                          </button>
                        </div>
                      </form>

                      {/* Faculties List Table with Role Tabs */}
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
                          <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                              <span>Campus Faculty Directory</span>
                              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                {allFaculties.length} Total
                              </span>
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Filter and view campus educators, administrative staff, and student
                              mentors by role.
                            </p>
                          </div>

                          {/* Category Filter Buttons */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setFacultyRoleFilter("ALL")}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                facultyRoleFilter === "ALL"
                                  ? "bg-indigo-600 text-white shadow-sm"
                                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                              }`}
                            >
                              All ({allFaculties.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setFacultyRoleFilter("TEACHING")}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                facultyRoleFilter === "TEACHING"
                                  ? "bg-emerald-600 text-white shadow-sm"
                                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                              }`}
                            >
                              Teaching ({teachingList.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setFacultyRoleFilter("NON_TEACHING")}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                facultyRoleFilter === "NON_TEACHING"
                                  ? "bg-amber-600 text-white shadow-sm"
                                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                              }`}
                            >
                              Non-Teaching ({nonTeachingList.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setFacultyRoleFilter("COACH_MENTOR")}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                facultyRoleFilter === "COACH_MENTOR"
                                  ? "bg-purple-600 text-white shadow-sm"
                                  : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                              }`}
                            >
                              Coaches & Mentors ({coachMentorList.length})
                            </button>
                          </div>
                        </div>

                        {displayedFaculties.length === 0 ? (
                          <div className="rounded-xl border border-slate-800 bg-slate-950 p-8 text-center">
                            <p className="text-xs text-slate-400">
                              No faculty members found in this category.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {displayedFaculties.map((fac) => {
                              const isCoach = fac.category === "SUCCESS_COACH";
                              const isMentor = fac.category === "MENTOR";
                              const isNonTeaching = fac.category === "NON_TEACHING";

                              return (
                                <div
                                  key={fac.id}
                                  className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 flex flex-col justify-between gap-3 hover:border-slate-700 transition-all"
                                >
                                  <div className="space-y-1.5">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {isCoach ? (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                            🌟 Success Coach
                                          </span>
                                        ) : isMentor ? (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                            💡 Academic Mentor
                                          </span>
                                        ) : isNonTeaching ? (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                            📋 Non-Teaching
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                            🎓 Teaching Faculty
                                          </span>
                                        )}

                                        {fac.employeeId && (
                                          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                            {fac.employeeId}
                                          </span>
                                        )}
                                      </div>

                                      <button
                                        onClick={() => handleDeleteFaculty(fac.id)}
                                        className="rounded-lg p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                                        title="Delete faculty"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>

                                    <h5 className="text-sm font-bold text-white mt-1">
                                      {fac.name}
                                    </h5>
                                    <p className="text-[11px] font-semibold text-indigo-400">
                                      {fac.designation}
                                    </p>
                                    <p className="text-[11px] text-slate-400">{fac.department}</p>

                                    <div className="pt-2 text-[10px] text-slate-500 space-y-1 border-t border-slate-900">
                                      {fac.email && <p className="truncate">✉️ {fac.email}</p>}
                                      {fac.phone && <p>📞 {fac.phone}</p>}
                                      {fac.officeRoom && <p>📍 {fac.officeRoom}</p>}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

              {/* TAB 3: 7 OFFICIAL CLUBS & CORE MEMBERS */}
              {activeTab === "CLUBS" && (
                <div className="space-y-6">
                  <div className="rounded-xl bg-indigo-950/40 border border-indigo-800/60 p-3 text-xs text-indigo-200">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-indigo-400" />
                      <span>7 Official NIAT Clubs Active for this Campus</span>
                    </p>
                    <p className="text-[11px] text-indigo-300/80 mt-0.5">
                      Only Admins can assign the 7 core leadership slots. Assigning a student
                      auto-promotes them to Club Manager and activates the purple & gold Leadership
                      badge on their profile header.
                    </p>
                  </div>

                  <div className="space-y-5">
                    {campusDetail.clubs?.map((club) => {
                      return (
                        <div
                          key={club.id}
                          className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-white">{club.name}</h4>
                                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                                  {club.category}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-1">{club.description}</p>
                            </div>
                            {club.instagramUrl && (
                              <a
                                href={club.instagramUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-[11px] text-indigo-400 hover:underline shrink-0"
                              >
                                <span>Instagram</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>

                          {/* 7 Core Leadership Slots Grid */}
                          <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                              Core Leadership Slots (7 Positions)
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {CORE_ROLES.map((roleDef) => {
                                const assignedMember = club.members?.find(
                                  (m) => m.role === roleDef.key,
                                );

                                return (
                                  <div
                                    key={roleDef.key}
                                    className={`rounded-lg border p-2.5 flex items-center justify-between text-xs transition-colors ${
                                      assignedMember
                                        ? "border-indigo-800/80 bg-indigo-950/30"
                                        : "border-slate-800/80 bg-slate-900/40"
                                    }`}
                                  >
                                    <div className="space-y-0.5 min-w-0">
                                      <p className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                                        <span>{roleDef.icon}</span>
                                        <span>{roleDef.label}</span>
                                      </p>
                                      {assignedMember ? (
                                        <p className="font-bold text-white truncate text-xs">
                                          {assignedMember.user.displayName} (
                                          <code className="text-indigo-300 font-mono text-[10px]">
                                            @{assignedMember.user.username}
                                          </code>
                                          )
                                        </p>
                                      ) : (
                                        <p className="text-[11px] text-slate-500 italic">Vacant</p>
                                      )}
                                    </div>

                                    {assignedMember ? (
                                      <button
                                        onClick={() =>
                                          handleRevokeRole(club.id, assignedMember.user.id)
                                        }
                                        className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold underline shrink-0 ml-2"
                                      >
                                        Revoke
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() =>
                                          setAssigningClub({
                                            clubId: club.id,
                                            clubName: club.name,
                                            role: roleDef.key,
                                          })
                                        }
                                        className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-2 py-1 rounded shrink-0 ml-2"
                                      >
                                        Assign
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: ACADEMIC HUB & LIVE ALERTS */}
              {activeTab === "ACADEMIC" && (
                <div className="space-y-6">
                  {/* Broadcast Form */}
                  <form
                    onSubmit={handleAddAcademic}
                    className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3"
                  >
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Bell className="h-3.5 w-3.5" />
                      <span>Broadcast Live Alert or Publish CIA/IA Schedule</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Type</label>
                        <select
                          value={newAlert.type}
                          onChange={(e) =>
                            setNewAlert({
                              ...newAlert,
                              type: e.target.value as "ALERT" | "CIA" | "IA",
                            })
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                        >
                          <option value="ALERT">Live Urgent News Banner</option>
                          <option value="CIA">CIA Schedule (Continuous Assessment)</option>
                          <option value="IA">IA Exam Hub (Internal Assessment)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-slate-400 mb-1">
                          {newAlert.type === "ALERT"
                            ? "Alert Title (e.g. CIA 2 English Date Extended)"
                            : "Subject / Course"}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder={
                            newAlert.type === "ALERT"
                              ? "CIA 2 English - Submission Date Extended by 1 day"
                              : "Data Structures & Algorithms"
                          }
                          value={newAlert.title}
                          onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })}
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                        />
                      </div>

                      {newAlert.type === "ALERT" ? (
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Full Announcement Details
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Full details of the deadline change or campus announcement..."
                            value={newAlert.body}
                            onChange={(e) => setNewAlert({ ...newAlert, body: e.target.value })}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">
                              Component / Slot
                            </label>
                            <input
                              type="text"
                              placeholder="CIA 1 or CIA 2 or IA 1"
                              value={newAlert.component}
                              onChange={(e) =>
                                setNewAlert({ ...newAlert, component: e.target.value })
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">
                              Submission / Exam Date
                            </label>
                            <input
                              type="datetime-local"
                              value={newAlert.scheduledAt}
                              onChange={(e) =>
                                setNewAlert({ ...newAlert, scheduledAt: e.target.value })
                              }
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">
                              Venue / Online Link
                            </label>
                            <input
                              type="text"
                              placeholder="Computer Lab 4 or StuNet Portal"
                              value={newAlert.venue}
                              onChange={(e) => setNewAlert({ ...newAlert, venue: e.target.value })}
                              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={isPending}
                        className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 transition-colors disabled:opacity-50"
                      >
                        {isPending ? "Publishing…" : "Publish to Student Portal"}
                      </button>
                    </div>
                  </form>

                  {/* Active Alerts */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Live News & Countdown Tickers
                    </h4>
                    {campusDetail.liveAlerts?.length === 0 ? (
                      <p className="text-xs text-slate-500">No active alerts published.</p>
                    ) : (
                      <div className="space-y-2">
                        {campusDetail.liveAlerts?.map((a) => (
                          <div
                            key={a.id}
                            className="rounded-lg border border-slate-800 bg-slate-950 p-3"
                          >
                            <p className="text-xs font-bold text-white">{a.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{a.body}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ADD CAMPUS MODAL                                             */}
      {/* ──────────────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-400" />
                <span>Add New Campus</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampus} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Campus Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SRM Institute of Science and Technology"
                  value={newCampus.name}
                  onChange={(e) => setNewCampus({ ...newCampus, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  University / Parent Body
                </label>
                <input
                  type="text"
                  placeholder="e.g. SRM (Deemed to be University)"
                  value={newCampus.universityName}
                  onChange={(e) => setNewCampus({ ...newCampus, universityName: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    required
                    placeholder="Chennai"
                    value={newCampus.city}
                    onChange={(e) => setNewCampus({ ...newCampus, city: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">State</label>
                  <input
                    type="text"
                    required
                    placeholder="Tamil Nadu"
                    value={newCampus.state}
                    onChange={(e) => setNewCampus({ ...newCampus, state: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Facilities / Stuffs (Comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="#Cipher Coding Zone, iHACK Lab, Hostel, Transport, Sports Arena"
                  value={newCampus.facilities}
                  onChange={(e) => setNewCampus({ ...newCampus, facilities: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="rounded-xl bg-indigo-950/40 border border-indigo-800/60 p-3 text-xs text-indigo-300">
                ⭐ <strong>Auto-Initialization:</strong> Creating this campus will automatically
                provision all <strong>7 official NIAT clubs</strong> and assign a default HOD
                faculty member!
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {isPending ? "Creating Campus…" : "Create Campus"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* ASSIGN ROLE MODAL                                            */}
      {/* ──────────────────────────────────────────────────────────── */}
      {assigningClub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Assign Club Leadership</h3>
                <p className="text-xs text-indigo-400 mt-0.5">
                  {assigningClub.clubName} • Role: {assigningClub.role}
                </p>
              </div>
              <button
                onClick={() => setAssigningClub(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAssignRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Student to Assign:
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                >
                  {studentOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.displayName} (@{s.username})
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl bg-indigo-950/40 border border-indigo-800/60 p-3 text-xs text-indigo-300">
                Granting this role automatically promotes the student to{" "}
                <strong>Club Manager</strong> and displays the{" "}
                <strong>⭐ {assigningClub.role}</strong> badge on their profile header.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssigningClub(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {isPending ? "Assigning…" : "Confirm Role Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
