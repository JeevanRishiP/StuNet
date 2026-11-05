"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ShieldCheck,
  School,
  UserPlus,
  Users,
  Search,
  ExternalLink,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  RefreshCw,
  KeyRound,
  X,
  Building2,
  ChevronRight,
  Info,
} from "lucide-react";
import { SearchableSelect } from "@/components/CreateEditModal";

interface AdminUser {
  id: string;
  displayName: string;
  username: string;
  role: string;
  verificationStatus: string;
  isBanned: boolean;
  avatarUrl: string | null;
  createdAt: string;
  hasPassword: boolean;
  email: string | null;
  hasTotp: boolean;
}

interface CampusAdminRow {
  id: string;
  name: string;
  universityName: string | null;
  slug: string;
  city: string;
  state: string;
  emailDomain: string | null;
  isActive: boolean;
  studentCount: number;
  clubCount: number;
  facultyCount: number;
  alertCount: number;
  admins: AdminUser[];
  hasAdmin: boolean;
}

interface Stats {
  totalCampuses: number;
  assignedCount: number;
  unassignedCount: number;
  totalAdmins: number;
  coveragePercent: number;
}

export default function CampusAdminsPage(): React.JSX.Element {
  const [campuses, setCampuses] = useState<CampusAdminRow[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCampuses: 0,
    assignedCount: 0,
    unassignedCount: 0,
    totalAdmins: 0,
    coveragePercent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ASSIGNED" | "UNASSIGNED">("ALL");

  // Modal states
  const [appointModalOpen, setAppointModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"assign_existing" | "create_new">("create_new");
  const [selectedCampusId, setSelectedCampusId] = useState("");
  const [allUsers, setAllUsers] = useState<
    Array<{
      id: string;
      displayName: string | null;
      username: string | null;
      campus: { name: string } | null;
    }>
  >([]);
  const [selectedUserId, setSelectedUserId] = useState("");

  // New admin form
  const [newAdminForm, setNewAdminForm] = useState({
    displayName: "",
    username: "",
    email: "",
    password: "AdminPass123!",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Test credentials modal
  const [testModalCampus, setTestModalCampus] = useState<CampusAdminRow | null>(null);

  // Load campus admin data
  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/dev/campus-admins");
      const data = (await res.json()) as { campuses: CampusAdminRow[]; stats: Stats };
      if (data.campuses) {
        setCampuses(data.campuses);
        setStats(data.stats);
      }
    } catch {
      setErrorMsg("Failed to load campus administrators.");
    } finally {
      setLoading(false);
    }
  }

  // Load all users for the assign_existing dropdown
  async function loadUsers() {
    try {
      const res = await fetch("/api/dev/users?limit=100");
      const data = (await res.json()) as {
        users: Array<{
          id: string;
          displayName: string | null;
          username: string | null;
          campus: { name: string } | null;
        }>;
      };
      setAllUsers(data.users ?? []);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    void loadData();
    void loadUsers();
  }, []);

  // Filtered campuses
  const filteredCampuses = useMemo(() => {
    return campuses.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.universityName && c.universityName.toLowerCase().includes(q)) ||
        c.city.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        c.admins.some(
          (a) =>
            a.displayName.toLowerCase().includes(q) ||
            a.username.toLowerCase().includes(q) ||
            (a.email && a.email.toLowerCase().includes(q)),
        );

      const matchState =
        stateFilter === "ALL" || c.state.toLowerCase() === stateFilter.toLowerCase();
      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ASSIGNED" && c.hasAdmin) ||
        (statusFilter === "UNASSIGNED" && !c.hasAdmin);

      return matchSearch && matchState && matchStatus;
    });
  }, [campuses, search, stateFilter, statusFilter]);

  // Unique states for filter
  const stateOptions = useMemo(() => {
    const set = new Set(campuses.map((c) => c.state));
    return Array.from(set).sort();
  }, [campuses]);

  // Open Appoint modal
  function handleOpenAppoint(campusId?: string) {
    if (campusId) {
      setSelectedCampusId(campusId);
      const camp = campuses.find((c) => c.id === campusId);
      if (camp) {
        const cleanName = camp.name
          .split(" ")[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        const cleanCity = camp.city.toLowerCase().replace(/[^a-z0-9]/g, "");
        setNewAdminForm({
          displayName: `${camp.name.slice(0, 25)} Admin`,
          username: `admin_${cleanName || cleanCity}`,
          email: `admin@${camp.slug.replace("niat-", "")}.niat.edu.in`,
          password: "AdminPass123!",
        });
      }
    } else {
      setSelectedCampusId(campuses[0]?.id ?? "");
      setNewAdminForm({
        displayName: "",
        username: "",
        email: "",
        password: "AdminPass123!",
      });
    }
    setSelectedUserId("");
    setErrorMsg(null);
    setAppointModalOpen(true);
  }

  // Submit appointment
  async function handleSubmitAppointment(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload =
        modalMode === "assign_existing"
          ? {
              mode: "assign_existing",
              campusId: selectedCampusId,
              userId: selectedUserId,
            }
          : {
              mode: "create_new",
              campusId: selectedCampusId,
              displayName: newAdminForm.displayName,
              username: newAdminForm.username,
              email: newAdminForm.email,
              password: newAdminForm.password,
            };

      const res = await fetch("/api/dev/campus-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { error?: string; detail?: string; message?: string };

      if (!res.ok) {
        setErrorMsg(data.detail ?? data.error ?? "Failed to appoint campus admin");
        return;
      }

      setSuccessMsg(data.message ?? "Campus admin appointed successfully!");
      setAppointModalOpen(false);
      void loadData();
      void loadUsers();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      setErrorMsg("Network error while appointing admin.");
    } finally {
      setSubmitting(false);
    }
  }

  // Revoke admin privileges
  async function handleRevoke(admin: AdminUser, campusName: string) {
    if (
      !confirm(
        `Are you sure you want to revoke Campus Admin privileges from ${admin.displayName} (@${admin.username}) for ${campusName}? Their role will be reverted to STUDENT.`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/dev/campus-admins?userId=${admin.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        alert(data.error ?? "Failed to revoke admin privileges");
        return;
      }
      setSuccessMsg(data.message ?? "Revoked admin privileges");
      void loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {
      alert("Network error while revoking admin.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-amber-400" />
            <span>Campus Administrators</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Institutional Super Admin Console · Appoint, assign, or revoke campus managers across
            all 43 university campuses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadData()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors border border-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => handleOpenAppoint()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all"
          >
            <UserPlus className="h-4 w-4" />
            <span>Appoint Campus Admin</span>
          </button>
        </div>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Total Campuses
          </p>
          <p className="text-2xl font-bold text-white mt-1">{stats.totalCampuses}</p>
          <p className="text-[10px] text-slate-500 mt-1">
            Across {stateOptions.length} states in India
          </p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
            With Campus Admin
          </p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.assignedCount}</p>
          <p className="text-[10px] text-emerald-500/80 mt-1">Fully managed & isolated</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[11px] font-medium text-amber-400 uppercase tracking-wider">
            Needs Admin
          </p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{stats.unassignedCount}</p>
          <p className="text-[10px] text-amber-500/80 mt-1">Available for appointment</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Coverage
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-bold text-white">{stats.coveragePercent}%</p>
            <span className="text-[10px] text-slate-400">({stats.totalAdmins} active admins)</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-emerald-500 h-1.5 rounded-full"
              style={{ width: `${stats.coveragePercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campus, city, university, or admin…"
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="ALL">All States ({stateOptions.length})</option>
            {stateOptions.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ASSIGNED" | "UNASSIGNED")}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ASSIGNED">With Admin Only</option>
            <option value="UNASSIGNED">Unassigned Only</option>
          </select>
        </div>
      </div>

      {/* Campus Admin Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Campus & University</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Students / Clubs</th>
                <th className="py-3 px-4">Assigned Campus Admin</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-amber-500 mb-2" />
                    <span>Loading campus administrators…</span>
                  </td>
                </tr>
              ) : filteredCampuses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <School className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-300">
                      No campuses matched your search
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Try clearing filters or search terms
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCampuses.map((campus) => {
                  const hasAdmin = campus.admins.length > 0;
                  const admin = campus.admins[0];

                  return (
                    <tr
                      key={campus.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        campus.name.toLowerCase().includes("vyasa") ? "bg-amber-500/[0.03]" : ""
                      }`}
                    >
                      {/* Campus Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                            <School className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-white hover:text-amber-400 transition-colors">
                              {campus.name}
                            </p>
                            {campus.universityName && (
                              <p className="text-[11px] text-slate-400">{campus.universityName}</p>
                            )}
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="font-mono text-[10px] text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60">
                                {campus.slug}
                              </span>
                              {campus.emailDomain && (
                                <span className="text-[10px] text-slate-400">
                                  @{campus.emailDomain}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <p className="font-medium text-slate-200">{campus.city}</p>
                        <p className="text-[11px] text-slate-400">{campus.state}</p>
                      </td>

                      {/* Metrics */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3 text-slate-300">
                          <div>
                            <span className="font-bold text-white">{campus.studentCount}</span>
                            <span className="text-[10px] text-slate-500 ml-1">students</span>
                          </div>
                          <span className="text-slate-700">·</span>
                          <div>
                            <span className="font-bold text-white">{campus.clubCount}</span>
                            <span className="text-[10px] text-slate-500 ml-1">clubs</span>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Admin */}
                      <td className="py-3.5 px-4">
                        {hasAdmin && admin ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold flex items-center justify-center text-[10px]">
                                {admin.displayName.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-white">{admin.displayName}</span>
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400 font-mono text-[9px] font-bold">
                                CAMPUS_MANAGER
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 pl-8">
                              <span>@{admin.username}</span>
                              {admin.email && (
                                <>
                                  <span className="text-slate-600">·</span>
                                  <span className="text-slate-300">{admin.email}</span>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium text-[11px]">
                              <AlertTriangle className="h-3 w-3" />
                              <span>No Admin Assigned</span>
                            </span>
                            <button
                              onClick={() => handleOpenAppoint(campus.id)}
                              className="text-[11px] text-amber-400 hover:text-amber-300 underline font-semibold"
                            >
                              + Appoint
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasAdmin && admin ? (
                            <>
                              <button
                                onClick={() => setTestModalCampus(campus)}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-semibold flex items-center gap-1 transition-colors"
                                title="View Admin Portal login details"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span>Portal Info</span>
                              </button>
                              <button
                                onClick={() => handleOpenAppoint(campus.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                                title="Reassign campus manager"
                              >
                                Reassign
                              </button>
                              <button
                                onClick={() => void handleRevoke(admin, campus.name)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Revoke admin privileges"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleOpenAppoint(campus.id)}
                              className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-bold transition-colors flex items-center gap-1"
                            >
                              <UserPlus className="h-3 w-3" />
                              <span>Appoint Admin</span>
                            </button>
                          )}
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

      {/* Appoint / Create Admin Modal */}
      {appointModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Appoint Campus Administrator</h3>
                  <p className="text-[11px] text-slate-400">
                    Designate manager role scoped strictly to target campus
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAppointModalOpen(false)}
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

            {/* Mode Toggle Tabs */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setModalMode("create_new")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  modalMode === "create_new"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Create New Admin Account
              </button>
              <button
                type="button"
                onClick={() => setModalMode("assign_existing")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  modalMode === "assign_existing"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Assign Existing User
              </button>
            </div>

            <form onSubmit={handleSubmitAppointment} className="space-y-4">
              {/* Campus Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Campus <span className="text-amber-400">*</span>
                </label>
                <SearchableSelect
                  value={selectedCampusId}
                  onChange={setSelectedCampusId}
                  options={campuses.map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.city}, ${c.state})`,
                  }))}
                  placeholder="Select campus to manage…"
                />
              </div>

              {modalMode === "create_new" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Display Name <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newAdminForm.displayName}
                        onChange={(e) =>
                          setNewAdminForm((f) => ({ ...f, displayName: e.target.value }))
                        }
                        placeholder="e.g. Dr. Ramesh Kumar"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Username <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newAdminForm.username}
                        onChange={(e) =>
                          setNewAdminForm((f) => ({ ...f, username: e.target.value }))
                        }
                        placeholder="e.g. svyasa_admin"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Admin Email (Login ID) <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={newAdminForm.email}
                      onChange={(e) => setNewAdminForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="e.g. admin@svyasa.niat.edu.in"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Initial Password
                    </label>
                    <input
                      type="text"
                      value={newAdminForm.password}
                      onChange={(e) => setNewAdminForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="AdminPass123!"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Will be securely hashed with Argon2id. MFA dev bypass code is{" "}
                      <code>123456</code>.
                    </p>
                  </div>
                </>
              ) : (
                /* Assign Existing User */
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Select User to Promote <span className="text-amber-400">*</span>
                  </label>
                  <SearchableSelect
                    value={selectedUserId}
                    onChange={setSelectedUserId}
                    options={allUsers.map((u) => ({
                      value: u.id,
                      label: `${u.displayName ?? u.username ?? "User"} (@${u.username}) ${
                        u.campus ? `— ${u.campus.name}` : ""
                      }`,
                    }))}
                    placeholder="Search user to appoint as Campus Manager…"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    The user will be granted <code>CAMPUS_MANAGER</code> role scoped strictly to
                    this campus.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAppointModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="h-3 w-3 animate-spin" />}
                  <span>Confirm Appointment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Portal Info Modal */}
      {testModalCampus && testModalCampus.admins[0] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <ExternalLink className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Campus Admin Credentials</h3>
                  <p className="text-[11px] text-slate-400">{testModalCampus.name}</p>
                </div>
              </div>
              <button
                onClick={() => setTestModalCampus(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 rounded-xl bg-slate-950 p-4 border border-slate-800 font-mono text-xs">
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Admin Portal URL</span>
                <a
                  href="http://localhost:3011/login"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <span>http://localhost:3011/login</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Login Email</span>
                <span className="text-slate-200">
                  {testModalCampus.admins[0].email ?? "carol@niat.edu.in"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">Password</span>
                <span className="text-amber-400">AdminPass123!</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase block">
                  TOTP MFA Code (Dev Bypass)
                </span>
                <span className="text-emerald-400">123456</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-indigo-400" />
              <span>
                When logged into <strong>localhost:3011</strong> as this admin, the portal will be
                strictly scoped to <strong>{testModalCampus.name}</strong>.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setTestModalCampus(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
              <a
                href="http://localhost:3011/login"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
              >
                <span>Open Admin Portal</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
