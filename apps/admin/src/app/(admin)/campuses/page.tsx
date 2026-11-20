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
  CalendarDays,
  Calendar as CalendarIcon,
  Tag,
  AlertCircle,
  CheckCircle2,
  Edit2,
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

interface CalendarEvent {
  id: string;
  campusId: string;
  title: string;
  description: string | null;
  eventDate: string;
  endDate: string | null;
  eventType: string; // "holiday" | "academic" | "exam" | "fest" | "workshop"
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface CampusDetail extends CampusSummary {
  faculties: Faculty[];
  clubs: Club[];
  calendars?: CalendarEvent[];
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
  const [activeTab, setActiveTab] = useState<"INFO" | "FACULTIES" | "CLUBS" | "CALENDAR">("INFO");
  const [isPending, startTransition] = useTransition();

  // Academic Calendar & Holidays State
  const [calendarFilter, setCalendarFilter] = useState<
    "ALL" | "HOLIDAY" | "ACADEMIC" | "EXAM" | "FEST" | "WORKSHOP"
  >("ALL");
  const [calendarSearch, setCalendarSearch] = useState("");
  const [newCalendarEvent, setNewCalendarEvent] = useState({
    title: "",
    eventType: "holiday" as "holiday" | "academic" | "exam" | "fest" | "workshop",
    eventDate: "",
    endDate: "",
    description: "",
    isPublic: true,
  });
  const [editingCalendarEvent, setEditingCalendarEvent] = useState<CalendarEvent | null>(null);
  const [calendarActionError, setCalendarActionError] = useState<string | null>(null);
  const [calendarActionSuccess, setCalendarActionSuccess] = useState<string | null>(null);

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
  const [selectedStudent, setSelectedStudent] = useState<{
    id: string;
    displayName: string;
    username: string;
    section?: string | null;
  } | null>(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [studentSearchResults, setStudentSearchResults] = useState<
    Array<{ id: string; displayName: string; username: string; section?: string | null }>
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

  // Search students for role assignment dynamically when assigningClub is open
  useEffect(() => {
    if (!assigningClub) {
      setStudentSearchQuery("");
      setSelectedStudent(null);
      setSelectedStudentId("");
      setStudentSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setStudentSearchLoading(true);
      try {
        const campusParam = selectedCampusId ? `&campusId=${selectedCampusId}` : "";
        const queryParam = studentSearchQuery.trim()
          ? `&q=${encodeURIComponent(studentSearchQuery.trim())}`
          : "";
        const res = await fetch(`/api/users?role=STUDENT${campusParam}${queryParam}&limit=30`);
        if (res.ok) {
          const data = await res.json();
          const items = data.users || data.items || [];
          setStudentSearchResults(items);
        } else {
          setStudentSearchResults([]);
        }
      } catch (err) {
        console.error("Failed to query students:", err);
        setStudentSearchResults([]);
      } finally {
        setStudentSearchLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [assigningClub, studentSearchQuery, selectedCampusId]);

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
    if (!selectedStudentId) {
      notify("Please search and select a student first.");
      return;
    }
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

  // ── Calendar & Holidays Management Handlers (Strict Database Integration) ──
  function toDateInputFormat(d: string | null | undefined): string {
    if (!d) return "";
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().slice(0, 10);
    } catch {
      return "";
    }
  }

  function formatCalendarDateRange(startStr: string, endStr?: string | null): string {
    try {
      const s = new Date(startStr);
      const sFmt = s.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      if (!endStr) return sFmt;
      const e = new Date(endStr);
      const eFmt = e.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return `${sFmt} – ${eFmt}`;
    } catch {
      return startStr;
    }
  }

  function handleCreateCalendarEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCampusId || !newCalendarEvent.title.trim() || !newCalendarEvent.eventDate) {
      setCalendarActionError("Please provide both an event title and a valid date.");
      return;
    }
    setCalendarActionError(null);
    setCalendarActionSuccess(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/campuses/${selectedCampusId}/calendar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newCalendarEvent),
        });
        const data = await res.json();
        if (!res.ok) {
          setCalendarActionError(data.error || "Failed to create calendar event");
          return;
        }
        setCalendarActionSuccess("✓ Entry created in calendar database successfully!");
        notify("✓ Event added to calendar database!");
        setNewCalendarEvent({
          title: "",
          eventType: "holiday",
          eventDate: "",
          endDate: "",
          description: "",
          isPublic: true,
        });
        await loadCampusDetail(selectedCampusId);
        setTimeout(() => setCalendarActionSuccess(null), 3500);
      } catch {
        setCalendarActionError("Network error while creating calendar event");
      }
    });
  }

  function handleUpdateCalendarEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCampusId || !editingCalendarEvent) return;
    setCalendarActionError(null);
    setCalendarActionSuccess(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/campuses/${selectedCampusId}/calendar`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingCalendarEvent.id,
            title: editingCalendarEvent.title,
            eventType: editingCalendarEvent.eventType,
            eventDate: editingCalendarEvent.eventDate,
            endDate: editingCalendarEvent.endDate || null,
            description: editingCalendarEvent.description || null,
            isPublic: editingCalendarEvent.isPublic,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setCalendarActionError(data.error || "Failed to update calendar event");
          return;
        }
        setCalendarActionSuccess("✓ Calendar entry updated successfully in database!");
        notify("✓ Calendar event updated in database!");
        setEditingCalendarEvent(null);
        await loadCampusDetail(selectedCampusId);
        setTimeout(() => setCalendarActionSuccess(null), 3500);
      } catch {
        setCalendarActionError("Network error while updating calendar entry");
      }
    });
  }

  function handleDeleteCalendarEvent(eventId: string, eventTitle: string) {
    if (!selectedCampusId) return;
    if (
      !window.confirm(
        `Are you sure you want to delete "${eventTitle}" from the calendar database? This will immediately remove it from all student views.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/campuses/${selectedCampusId}/calendar?calendarId=${encodeURIComponent(eventId)}`,
          { method: "DELETE" },
        );
        const data = await res.json();
        if (!res.ok) {
          notify(data.error || "Failed to delete calendar event");
          return;
        }
        notify("✓ Calendar entry deleted from database");
        await loadCampusDetail(selectedCampusId);
      } catch {
        notify("Failed to delete calendar event");
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
                {
                  id: "CALENDAR",
                  label: `Academic Calendar & Holidays (${campusDetail.calendars?.length ?? 0})`,
                  icon: CalendarDays,
                },
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
                              Department{" "}
                              <span className="text-slate-500 text-[10px]">(Optional)</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Computer Science & Engineering"
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

              {/* TAB 4: ACADEMIC CALENDAR & HOLIDAYS (DIRECT DATABASE MANAGEMENT) */}
              {activeTab === "CALENDAR" && (
                <div className="space-y-6">
                  {/* Database Synced Header */}
                  <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/30 p-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            PostgreSQL Synced
                          </span>
                          <span className="text-xs text-slate-400">
                            Campus: <strong className="text-white">{campusDetail.name}</strong>
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-white mt-1 flex items-center gap-2">
                          <CalendarDays className="h-5 w-5 text-indigo-400" />
                          <span>Academic Calendar & Holidays Manager</span>
                        </h3>
                        <p className="text-xs text-slate-400 max-w-2xl">
                          Manage all academic milestones, official holidays, examination dates,
                          cultural fests, and workshops. All entries are stored directly in the
                          PostgreSQL database and immediately reflect on the student portal.
                        </p>
                      </div>
                    </div>

                    {/* Quick Counts */}
                    {(() => {
                      const allEvents = campusDetail.calendars ?? [];
                      const holidayCount = allEvents.filter(
                        (e) => e.eventType === "holiday",
                      ).length;
                      const academicCount = allEvents.filter(
                        (e) => e.eventType === "academic",
                      ).length;
                      const examCount = allEvents.filter((e) => e.eventType === "exam").length;
                      const festCount = allEvents.filter((e) => e.eventType === "fest").length;
                      const workshopCount = allEvents.filter(
                        (e) => e.eventType === "workshop",
                      ).length;

                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2">
                          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                            <span className="text-[11px] text-slate-400 font-medium">
                              Total Entries
                            </span>
                            <p className="text-xl font-black text-white mt-0.5">
                              {allEvents.length}
                            </p>
                          </div>
                          <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-3">
                            <span className="text-[11px] text-rose-400 font-bold flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-rose-500" />
                              Official Holidays
                            </span>
                            <p className="text-xl font-black text-rose-400 mt-0.5">
                              {holidayCount}
                            </p>
                          </div>
                          <div className="rounded-xl border border-indigo-900/60 bg-indigo-950/30 p-3">
                            <span className="text-[11px] text-indigo-300 font-semibold">
                              Academic Milestones
                            </span>
                            <p className="text-xl font-black text-indigo-300 mt-0.5">
                              {academicCount}
                            </p>
                          </div>
                          <div className="rounded-xl border border-purple-900/60 bg-purple-950/30 p-3">
                            <span className="text-[11px] text-purple-300 font-semibold">
                              Examinations
                            </span>
                            <p className="text-xl font-black text-purple-300 mt-0.5">{examCount}</p>
                          </div>
                          <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 p-3 col-span-2 sm:col-span-1">
                            <span className="text-[11px] text-amber-300 font-semibold">
                              Fests & Workshops
                            </span>
                            <p className="text-xl font-black text-amber-300 mt-0.5">
                              {festCount + workshopCount}
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Feedback Alerts */}
                  {calendarActionError && (
                    <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                        <span>{calendarActionError}</span>
                      </div>
                      <button
                        onClick={() => setCalendarActionError(null)}
                        className="text-rose-400 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {calendarActionSuccess && (
                    <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>{calendarActionSuccess}</span>
                      </div>
                      <button
                        onClick={() => setCalendarActionSuccess(null)}
                        className="text-emerald-400 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* FORM: Add New Calendar Event / Holiday */}
                  <form
                    onSubmit={handleCreateCalendarEvent}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                      <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        <span>Add New Calendar Event / Holiday</span>
                      </h4>
                      <span className="text-[11px] text-slate-500">
                        Persisted directly into PostgreSQL table: <code>campus_calendars</code>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Event / Holiday Title <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Independence Day, IA 2 Examination, Ganesh Chaturthi, Odd Semester Commencement"
                          value={newCalendarEvent.title}
                          onChange={(e) =>
                            setNewCalendarEvent({ ...newCalendarEvent, title: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Event Category <span className="text-rose-400">*</span>
                        </label>
                        <select
                          value={newCalendarEvent.eventType}
                          onChange={(e) =>
                            setNewCalendarEvent({
                              ...newCalendarEvent,
                              eventType: e.target.value as typeof newCalendarEvent.eventType,
                            })
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                        >
                          <option value="holiday">Holiday (Official / Government Holiday)</option>
                          <option value="academic">Academic Milestone (Classes, Marks, PTM)</option>
                          <option value="exam">Examination (IA, SEE, Practical Viva)</option>
                          <option value="fest">College Fest & Cultural Event</option>
                          <option value="workshop">Workshop & Tech Hackathon</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Event Date <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={newCalendarEvent.eventDate}
                          onChange={(e) =>
                            setNewCalendarEvent({ ...newCalendarEvent, eventDate: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          End Date <span className="text-slate-500">(Optional for multi-day)</span>
                        </label>
                        <input
                          type="date"
                          value={newCalendarEvent.endDate}
                          onChange={(e) =>
                            setNewCalendarEvent({ ...newCalendarEvent, endDate: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>

                      <div className="flex items-center pt-6">
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                          <input
                            type="checkbox"
                            checked={newCalendarEvent.isPublic}
                            onChange={(e) =>
                              setNewCalendarEvent({
                                ...newCalendarEvent,
                                isPublic: e.target.checked,
                              })
                            }
                            className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                          />
                          <span>Visible to Students on Campus Portal</span>
                        </label>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Description / Venue / Internal Instructions
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Optional details, government holiday circular reference, venue, or instructions..."
                          value={newCalendarEvent.description}
                          onChange={(e) =>
                            setNewCalendarEvent({
                              ...newCalendarEvent,
                              description: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <p className="text-[11px] text-slate-500">
                        {newCalendarEvent.eventType === "holiday" && (
                          <span className="text-rose-400 font-medium">
                            * Holidays are automatically highlighted in bold Red text across student
                            portals.
                          </span>
                        )}
                      </p>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>
                          {isPending ? "Saving to Database…" : "Add to Calendar Database"}
                        </span>
                      </button>
                    </div>
                  </form>

                  {/* List of Existing Calendar Events with Filter Tabs & Search */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { key: "ALL", label: `All (${campusDetail.calendars?.length ?? 0})` },
                          {
                            key: "HOLIDAY",
                            label: `Holidays (${(campusDetail.calendars ?? []).filter((e) => e.eventType === "holiday").length})`,
                            isHolidayTab: true,
                          },
                          {
                            key: "ACADEMIC",
                            label: `Academic (${(campusDetail.calendars ?? []).filter((e) => e.eventType === "academic").length})`,
                          },
                          {
                            key: "EXAM",
                            label: `Exams (${(campusDetail.calendars ?? []).filter((e) => e.eventType === "exam").length})`,
                          },
                          {
                            key: "FEST",
                            label: `Fests (${(campusDetail.calendars ?? []).filter((e) => e.eventType === "fest").length})`,
                          },
                          {
                            key: "WORKSHOP",
                            label: `Workshops (${(campusDetail.calendars ?? []).filter((e) => e.eventType === "workshop").length})`,
                          },
                        ].map((f) => {
                          const active = calendarFilter === f.key;
                          return (
                            <button
                              key={f.key}
                              type="button"
                              onClick={() => setCalendarFilter(f.key as typeof calendarFilter)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                active
                                  ? f.isHolidayTab
                                    ? "bg-rose-950 text-rose-300 border border-rose-800"
                                    : "bg-indigo-600 text-white shadow-sm"
                                  : f.isHolidayTab
                                    ? "text-rose-400 hover:bg-rose-950/40"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                              }`}
                            >
                              {f.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Search Input */}
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={calendarSearch}
                          onChange={(e) => setCalendarSearch(e.target.value)}
                          placeholder="Search events, notes, dates..."
                          className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                        />
                        {calendarSearch && (
                          <button
                            type="button"
                            onClick={() => setCalendarSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Filtered Calendar Records */}
                    {(() => {
                      const allEvents = campusDetail.calendars ?? [];
                      const filtered = allEvents.filter((ev) => {
                        if (calendarFilter !== "ALL") {
                          if (ev.eventType.toUpperCase() !== calendarFilter) return false;
                        }
                        if (calendarSearch.trim()) {
                          const q = calendarSearch.toLowerCase();
                          const matchesTitle = ev.title.toLowerCase().includes(q);
                          const matchesDesc = (ev.description || "").toLowerCase().includes(q);
                          const matchesDate = ev.eventDate.includes(q);
                          if (!matchesTitle && !matchesDesc && !matchesDate) return false;
                        }
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center space-y-2">
                            <CalendarIcon className="h-8 w-8 text-slate-600 mx-auto" />
                            <h4 className="text-sm font-bold text-slate-300">
                              No Calendar Events Found
                            </h4>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">
                              {calendarSearch
                                ? `No database records matched your search query "${calendarSearch}".`
                                : "No entries found in the database under this filter. Add one using the form above."}
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2.5">
                          {filtered.map((ev) => {
                            const isHoliday = ev.eventType === "holiday";
                            const d = new Date(ev.eventDate);
                            const monthShort = d
                              .toLocaleDateString("en-US", { month: "short" })
                              .toUpperCase();
                            const dayNum = d.getDate();

                            return (
                              <div
                                key={ev.id}
                                className={`rounded-xl border p-3.5 flex items-center justify-between gap-4 transition-all ${
                                  isHoliday
                                    ? "border-rose-950/80 bg-rose-950/20 hover:border-rose-800/80"
                                    : "border-slate-800 bg-slate-950 hover:border-slate-700"
                                }`}
                              >
                                {/* Date Block */}
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div
                                    className={`h-12 w-12 rounded-xl flex flex-col items-center justify-center shrink-0 border ${
                                      isHoliday
                                        ? "bg-rose-950/60 border-rose-800 text-rose-300"
                                        : "bg-slate-900 border-slate-800 text-slate-300"
                                    }`}
                                  >
                                    <span className="text-[10px] font-black uppercase tracking-wider leading-none">
                                      {monthShort}
                                    </span>
                                    <span className="text-base font-black leading-tight mt-0.5">
                                      {dayNum}
                                    </span>
                                  </div>

                                  {/* Info */}
                                  <div className="min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h4
                                        className={`text-sm leading-snug truncate ${
                                          isHoliday
                                            ? "text-rose-400 font-bold"
                                            : "text-white font-bold"
                                        }`}
                                      >
                                        {ev.title}
                                      </h4>

                                      {/* Type Badge */}
                                      <span
                                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                                          isHoliday
                                            ? "bg-rose-950 text-rose-300 border border-rose-800"
                                            : ev.eventType === "exam"
                                              ? "bg-purple-950 text-purple-300 border border-purple-800"
                                              : ev.eventType === "fest"
                                                ? "bg-amber-950 text-amber-300 border border-amber-800"
                                                : ev.eventType === "workshop"
                                                  ? "bg-teal-950 text-teal-300 border border-teal-800"
                                                  : "bg-indigo-950 text-indigo-300 border border-indigo-800"
                                        }`}
                                      >
                                        {ev.eventType}
                                      </span>

                                      {/* Visibility Badge */}
                                      {ev.isPublic ? (
                                        <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-1.5 py-0.2 rounded">
                                          Public
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-semibold text-slate-400 bg-slate-900 border border-slate-700 px-1.5 py-0.2 rounded">
                                          Draft
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                                      <span>
                                        {formatCalendarDateRange(ev.eventDate, ev.endDate)}
                                      </span>
                                      {ev.description && (
                                        <>
                                          <span>•</span>
                                          <span className="text-slate-300 truncate max-w-md">
                                            {ev.description}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setEditingCalendarEvent(ev)}
                                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                                    title="Edit Calendar Event"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCalendarEvent(ev.id, ev.title)}
                                    className="p-2 rounded-lg bg-slate-900 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-900 transition-colors cursor-pointer"
                                    title="Delete from Database"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
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
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Search Student (by Name or USN):
                </label>

                {selectedStudent ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-950/60 border border-indigo-700/60 text-white">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-black shrink-0">
                        {selectedStudent.displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">
                          {selectedStudent.displayName}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-indigo-300">
                          <span className="font-mono">USN: {selectedStudent.username}</span>
                          {selectedStudent.section && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-900 border border-indigo-700 font-semibold">
                              {selectedStudent.section}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudent(null);
                        setSelectedStudentId("");
                      }}
                      className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded-lg hover:bg-rose-950/40 font-semibold cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        placeholder="Type USN or name to search students..."
                        className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                        autoFocus
                      />
                      {studentSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setStudentSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 divide-y divide-slate-800/80 scrollbar-thin">
                      {studentSearchLoading ? (
                        <div className="p-3 text-center text-xs text-slate-400">
                          Searching students in database…
                        </div>
                      ) : studentSearchResults.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500">
                          {studentSearchQuery
                            ? `No students found matching "${studentSearchQuery}"`
                            : "Type USN or name above to find students."}
                        </div>
                      ) : (
                        studentSearchResults.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSelectedStudent(s);
                              setSelectedStudentId(s.id);
                            }}
                            className="w-full p-2.5 flex items-center justify-between text-left hover:bg-indigo-950/40 transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="h-7 w-7 rounded-full bg-slate-800 border border-slate-700 group-hover:bg-indigo-600 group-hover:border-indigo-500 flex items-center justify-center text-[10px] font-bold text-slate-200 group-hover:text-white shrink-0 transition-colors">
                                {s.displayName.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-white group-hover:text-indigo-200 truncate">
                                  {s.displayName}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  USN: {s.username}
                                </p>
                              </div>
                            </div>
                            {s.section && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                                {s.section}
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
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
      {/* ──────────────────────────────────────────────────────────── */}
      {/* EDIT CALENDAR EVENT MODAL                                    */}
      {/* ──────────────────────────────────────────────────────────── */}
      {editingCalendarEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-indigo-400" />
                  <span>Edit Calendar Event / Holiday</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update database record for this campus event.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCalendarEvent(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCalendarEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Event Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingCalendarEvent.title}
                  onChange={(e) =>
                    setEditingCalendarEvent({ ...editingCalendarEvent, title: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Event Type <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={editingCalendarEvent.eventType}
                    onChange={(e) =>
                      setEditingCalendarEvent({
                        ...editingCalendarEvent,
                        eventType: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="holiday">Holiday</option>
                    <option value="academic">Academic Milestone</option>
                    <option value="exam">Examination</option>
                    <option value="fest">College Fest & Cultural</option>
                    <option value="workshop">Workshop & Hackathon</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={editingCalendarEvent.isPublic}
                      onChange={(e) =>
                        setEditingCalendarEvent({
                          ...editingCalendarEvent,
                          isPublic: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0"
                    />
                    <span>Visible in Student Portal</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Event Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={toDateInputFormat(editingCalendarEvent.eventDate)}
                    onChange={(e) =>
                      setEditingCalendarEvent({
                        ...editingCalendarEvent,
                        eventDate: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    End Date <span className="text-slate-500">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={toDateInputFormat(editingCalendarEvent.endDate)}
                    onChange={(e) =>
                      setEditingCalendarEvent({
                        ...editingCalendarEvent,
                        endDate: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Location / Notes
                </label>
                <textarea
                  rows={2}
                  value={editingCalendarEvent.description || ""}
                  onChange={(e) =>
                    setEditingCalendarEvent({
                      ...editingCalendarEvent,
                      description: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCalendarEvent(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? "Saving to Database…" : "Save Changes to Database"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
