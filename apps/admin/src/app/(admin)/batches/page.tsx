"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Calendar,
  Plus,
  School,
  CheckCircle2,
  Trash2,
  X,
  RefreshCw,
  UserCheck,
  Pencil,
  User,
} from "lucide-react";
import { useSession } from "next-auth/react";

interface CampusOption {
  id: string;
  name: string;
  city: string;
}

interface Batch {
  id: string;
  campusId: string;
  year: number;
  currentYear?: number | null;
  currentSemester?: number | null;
  numberOfStudents: number | null;
  numberOfSections: number | null;
  sections?: string[];
  degree: string | null;
  successCoachEmployeeId: string | null;
  successCoachName: string | null;
  createdAt: string;
  campus: { id: string; name: string; city: string };
}

export default function BatchesPage(): React.JSX.Element {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const isCampusManager = session?.user?.role === "CAMPUS_MANAGER";

  const [batches, setBatches] = useState<Batch[]>([]);
  const [campuses, setCampuses] = useState<CampusOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [form, setForm] = useState({
    campusId: "",
    year: String(new Date().getFullYear()),
    currentYear: "1",
    currentSemester: "1",
    numberOfStudents: "",
    numberOfSections: "",
    sections: [] as string[],
    degree: "B.Tech Computer Science & AI",
    successCoachEmployeeId: "",
    successCoachName: "",
  });

  // Edit Batch & Change Coach State
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [editForm, setEditForm] = useState({
    degree: "",
    currentYear: "1",
    currentSemester: "1",
    numberOfStudents: "",
    numberOfSections: "",
    sections: [] as string[],
    successCoachEmployeeId: "",
    successCoachName: "",
  });
  const [newSectionName, setNewSectionName] = useState("");
  const [editNewSectionName, setEditNewSectionName] = useState("");
  const [editDetectingCoach, setEditDetectingCoach] = useState(false);
  const [availableFaculties, setAvailableFaculties] = useState<
    Array<{
      id: string;
      name: string;
      employeeId?: string | null;
      category?: string;
      designation?: string;
    }>
  >([]);

  const [detectingCoach, setDetectingCoach] = useState(false);
  const [coachDetected, setCoachDetected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function notify(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  }

  // Load campuses
  useEffect(() => {
    async function loadCampuses() {
      try {
        const res = await fetch("/api/campuses");
        if (res.ok) {
          const data = (await res.json()) as
            CampusOption[] | { campuses?: CampusOption[]; items?: CampusOption[] };
          const list = Array.isArray(data) ? data : data.campuses || data.items || [];
          setCampuses(list);
          if (list.length > 0 && !form.campusId) {
            setForm((f) => ({
              ...f,
              campusId: isCampusManager
                ? (session?.user?.managedCampusId ?? list[0]?.id ?? "")
                : (list[0]?.id ?? ""),
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load campuses", err);
      }
    }
    void loadCampuses();
  }, [form.campusId, isCampusManager, session]);

  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/batches");
      if (res.ok) {
        const data = (await res.json()) as { batches?: Batch[] };
        setBatches(data.batches ?? []);
      }
    } catch {
      setErrorMsg("Failed to load batches.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  // Live Auto-detect Success Coach Name from Employee ID
  async function handleDetectCoach(empId: string) {
    if (!empId.trim()) {
      setForm((f) => ({ ...f, successCoachName: "" }));
      setCoachDetected(false);
      return;
    }

    setDetectingCoach(true);
    try {
      const res = await fetch(
        `/api/faculties/lookup?employeeId=${encodeURIComponent(empId.trim())}`,
      );
      const data = (await res.json()) as { found: boolean; faculty?: { name: string } };
      if (data.found && data.faculty?.name) {
        setForm((f) => ({ ...f, successCoachName: data.faculty?.name ?? "" }));
        setCoachDetected(true);
      } else {
        setCoachDetected(false);
      }
    } catch {
      setCoachDetected(false);
    } finally {
      setDetectingCoach(false);
    }
  }

  function openCreateModal() {
    const curYear = new Date().getFullYear();
    setForm({
      campusId: isCampusManager ? (session?.user?.managedCampusId ?? "") : (campuses[0]?.id ?? ""),
      year: String(curYear),
      currentYear: "1",
      currentSemester: "1",
      numberOfStudents: "",
      numberOfSections: "",
      sections: [],
      degree: "B.Tech Computer Science & AI",
      successCoachEmployeeId: "",
      successCoachName: "",
    });
    setNewSectionName("");
    setCoachDetected(false);
    setErrorMsg(null);
    setShowModal(true);
    void loadAvailableFaculties(isCampusManager ? session?.user?.managedCampusId : campuses[0]?.id);
  }

  async function loadAvailableFaculties(campusId?: string) {
    if (!campusId) return;
    try {
      const res = await fetch(`/api/campuses/${campusId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.campus?.faculties) {
          setAvailableFaculties(data.campus.faculties);
        }
      }
    } catch {
      // fallback silent
    }
  }

  function openEditModal(batch: Batch) {
    setEditingBatch(batch);
    setEditForm({
      degree: batch.degree ?? "B.Tech Computer Science & AI",
      currentYear: batch.currentYear ? String(batch.currentYear) : "1",
      currentSemester: batch.currentSemester ? String(batch.currentSemester) : "1",
      numberOfStudents: batch.numberOfStudents ? String(batch.numberOfStudents) : "",
      numberOfSections: batch.numberOfSections ? String(batch.numberOfSections) : "",
      sections: batch.sections ?? [],
      successCoachEmployeeId: batch.successCoachEmployeeId ?? "",
      successCoachName: batch.successCoachName ?? "",
    });
    setEditNewSectionName("");
    setErrorMsg(null);
    void loadAvailableFaculties(batch.campusId);
  }

  async function handleEditCoachDetect(empId: string) {
    if (!empId.trim()) {
      setEditForm((f) => ({ ...f, successCoachName: "" }));
      return;
    }
    setEditDetectingCoach(true);
    try {
      const res = await fetch(
        `/api/faculties/lookup?employeeId=${encodeURIComponent(empId.trim())}`,
      );
      const data = (await res.json()) as { found: boolean; faculty?: { name: string } };
      if (data.found && data.faculty?.name) {
        setEditForm((f) => ({ ...f, successCoachName: data.faculty?.name ?? "" }));
      }
    } catch {
      // ignore
    } finally {
      setEditDetectingCoach(false);
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingBatch) return;
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/batches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingBatch.id,
          degree: editForm.degree,
          currentYear: editForm.currentYear ? parseInt(editForm.currentYear, 10) : null,
          currentSemester: editForm.currentSemester ? parseInt(editForm.currentSemester, 10) : null,
          numberOfStudents: editForm.numberOfStudents
            ? parseInt(editForm.numberOfStudents, 10)
            : null,
          numberOfSections: editForm.numberOfSections
            ? parseInt(editForm.numberOfSections, 10)
            : null,
          sections: editForm.sections,
          successCoachEmployeeId: editForm.successCoachEmployeeId || null,
          successCoachName: editForm.successCoachName || null,
        }),
      });

      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to update batch");
        return;
      }

      notify(
        `Batch ${editingBatch.year} updated! Standing: Year ${editForm.currentYear || 1}, Sem ${editForm.currentSemester || 1} — Coach: ${editForm.successCoachName || "None"}`,
      );
      setEditingBatch(null);
      void loadBatches();
    } catch {
      setErrorMsg("Network error while updating batch.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const targetCampus = isCampusManager ? session?.user?.managedCampusId : form.campusId;
    if (!targetCampus) {
      setErrorMsg("Please select a campus.");
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        campusId: targetCampus,
        year: parseInt(form.year, 10),
        currentYear: form.currentYear ? parseInt(form.currentYear, 10) : null,
        currentSemester: form.currentSemester ? parseInt(form.currentSemester, 10) : null,
        numberOfStudents: form.numberOfStudents ? parseInt(form.numberOfStudents, 10) : null,
        numberOfSections: form.numberOfSections ? parseInt(form.numberOfSections, 10) : null,
        sections: form.sections,
        degree: form.degree,
        successCoachEmployeeId: form.successCoachEmployeeId || null,
        successCoachName: form.successCoachName || null,
      };

      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to create batch.");
        return;
      }

      notify(`Batch ${form.year} created successfully with assigned Success Coach!`);
      setShowModal(false);
      void loadBatches();
    } catch {
      setErrorMsg("Network error while creating batch.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, year: number) {
    if (!confirm(`Are you sure you want to delete Batch ${year}?`)) return;

    try {
      const res = await fetch(`/api/batches?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        notify(`Batch ${year} deleted.`);
        void loadBatches();
      } else {
        const data = (await res.json()) as { error?: string };
        alert(data.error ?? "Failed to delete batch.");
      }
    } catch {
      alert("Network error.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-indigo-400" />
            <span>Academic Batches</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold uppercase">
              {isSuperAdmin ? "Super Admin Universal" : "Campus Admin Scoped"}
            </span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Manage student batches, sections, and dedicated Success Coaches (1 coach per batch per
            campus).
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all w-fit"
        >
          <Plus className="h-4 w-4" />
          <span>+ New Batch Form</span>
        </button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Batches Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 text-xs">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
          <span>Loading academic batches…</span>
        </div>
      ) : batches.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
          <Calendar className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">No Batches Configured</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Click <strong>+ New Batch Form</strong> above to configure joining years, student
            strength, sections, and dedicated Success Coach.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                      Batch of {b.year}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      Year {b.currentYear ?? 1} • Sem {b.currentSemester ?? 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(b)}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
                      title="Edit Batch / Change Success Coach"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-medium hidden sm:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => void handleDelete(b.id, b.year)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Delete batch"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white mt-2">
                  {b.degree ?? "B.Tech Computer Science & AI"}
                </h3>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <School className="h-3 w-3 text-slate-500" />
                  <span>
                    {b.campus.name} ({b.campus.city})
                  </span>
                </p>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                      Standing
                    </span>
                    <span className="font-bold text-emerald-400">
                      Yr {b.currentYear ?? 1} · S{b.currentSemester ?? 1}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                      Students
                    </span>
                    <span className="font-bold text-slate-200">
                      {b.numberOfStudents ? `${b.numberOfStudents}` : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                      Sections
                    </span>
                    <span className="font-bold text-slate-200">
                      {b.numberOfSections ? `${b.numberOfSections}` : "—"}
                    </span>
                    {b.sections && b.sections.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {b.sections.map((sec) => (
                          <span
                            key={sec}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-950/60 border border-indigo-800 text-indigo-300 font-medium"
                          >
                            {sec}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Success Coach Section */}
                <div className="mt-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Dedicated Success Coach</span>
                    </div>
                    <button
                      onClick={() => openEditModal(b)}
                      className="text-[10px] text-purple-300 hover:text-white underline font-semibold cursor-pointer"
                    >
                      Change Coach
                    </button>
                  </div>
                  {b.successCoachName ? (
                    <div>
                      <p className="text-xs font-bold text-white">{b.successCoachName}</p>
                      {b.successCoachEmployeeId && (
                        <p className="text-[10px] text-purple-300 font-mono">
                          ID: {b.successCoachEmployeeId}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-xs text-slate-500 italic">No Success Coach assigned yet</p>
                      <button
                        onClick={() => openEditModal(b)}
                        className="text-[10px] text-indigo-400 hover:underline font-semibold"
                      >
                        + Assign Coach
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[10px] text-slate-500 text-right pt-2 border-t border-slate-800/60 font-mono">
                Created {new Date(b.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Batch Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-400" />
                  <span>New Batch Form</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Provision joining batch, sections, and assign the dedicated batch Success Coach.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
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

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Campus */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Campus <span className="text-amber-400">*</span>
                </label>
                {isCampusManager ? (
                  <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-400 font-semibold flex items-center gap-2">
                    <School className="h-4 w-4 text-indigo-400" />
                    <span>{session?.user?.managedCampusName ?? "Assigned Campus"}</span>
                  </div>
                ) : (
                  <select
                    required
                    value={form.campusId}
                    onChange={(e) => setForm({ ...form, campusId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  >
                    {campuses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.city})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Year & Degree */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Batch Year (Joining) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="number"
                    min={1950}
                    max={2150}
                    required
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Automatically set to current year.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Degree / Program
                  </label>
                  <input
                    type="text"
                    value={form.degree}
                    onChange={(e) => setForm({ ...form, degree: e.target.value })}
                    placeholder="e.g. B.Tech Computer Science & AI"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Current Academic Standing */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200">
                    Batch Academic Progression
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                    Auto-cascaded to students
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Current Year
                    </label>
                    <select
                      value={form.currentYear}
                      onChange={(e) => {
                        const yr = e.target.value;
                        const sem = String(parseInt(yr, 10) * 2 - 1);
                        setForm({ ...form, currentYear: yr, currentSemester: sem });
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    >
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Current Semester
                    </label>
                    <select
                      value={form.currentSemester}
                      onChange={(e) => setForm({ ...form, currentSemester: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    >
                      <option value="1">Semester 1</option>
                      <option value="2">Semester 2</option>
                      <option value="3">Semester 3</option>
                      <option value="4">Semester 4</option>
                      <option value="5">Semester 5</option>
                      <option value="6">Semester 6</option>
                      <option value="7">Semester 7</option>
                      <option value="8">Semester 8</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Number of Students & Sections */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Number of Students
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.numberOfStudents}
                    onChange={(e) => setForm({ ...form, numberOfStudents: e.target.value })}
                    placeholder="e.g. 240"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Number of Sections
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.numberOfSections}
                    onChange={(e) => {
                      const count = parseInt(e.target.value, 10);
                      const current = [...form.sections];
                      if (!isNaN(count) && count > 0 && current.length === 0) {
                        for (let i = 1; i <= count; i++) current.push(`Sec ${i}`);
                      }
                      setForm({ ...form, numberOfSections: e.target.value, sections: current });
                    }}
                    placeholder="e.g. 4"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Section Names Manager */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200">
                    Batch Sections & Custom Names
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {form.sections.length} section{form.sections.length === 1 ? "" : "s"} defined
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Name the sections for this batch (e.g. &ldquo;Sec 1&rdquo;, &ldquo;Sec 2&rdquo;).
                  These will appear in the New Student form.
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {form.sections.map((sec, idx) => (
                    <span
                      key={`${sec}-${idx}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/70 border border-indigo-700/80 text-xs font-semibold text-indigo-200"
                    >
                      <span>{sec}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            sections: form.sections.filter((_, i) => i !== idx),
                            numberOfSections: String(Math.max(0, form.sections.length - 1)),
                          })
                        }
                        className="text-indigo-400 hover:text-rose-400 text-xs cursor-pointer"
                        title="Remove section"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const trimmed = newSectionName.trim();
                        if (trimmed && !form.sections.includes(trimmed)) {
                          const updated = [...form.sections, trimmed];
                          setForm({
                            ...form,
                            sections: updated,
                            numberOfSections: String(updated.length),
                          });
                          setNewSectionName("");
                        }
                      }
                    }}
                    placeholder="Type section name (e.g. Sec 1) and press Add"
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = newSectionName.trim();
                      if (trimmed && !form.sections.includes(trimmed)) {
                        const updated = [...form.sections, trimmed];
                        setForm({
                          ...form,
                          sections: updated,
                          numberOfSections: String(updated.length),
                        });
                        setNewSectionName("");
                      }
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Success Coach (Non-teaching faculty: One per batch per campus) */}
              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Success Coach (Non-Teaching Faculty)</span>
                  </label>
                  <span className="text-[10px] text-purple-400 font-mono font-semibold">
                    1 coach per batch
                  </span>
                </div>
                <p className="text-[11px] text-purple-200/80">
                  Each batch in each campus has exactly one assigned Success Coach.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Employee ID
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={form.successCoachEmployeeId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm((prev) => ({ ...prev, successCoachEmployeeId: val }));
                          void handleDetectCoach(val);
                        }}
                        placeholder="e.g. FAC-0492"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      {detectingCoach && (
                        <RefreshCw className="h-3 w-3 animate-spin absolute right-2.5 top-2.5 text-purple-400" />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Detected Coach Name
                    </label>
                    <input
                      type="text"
                      value={form.successCoachName}
                      onChange={(e) => setForm({ ...form, successCoachName: e.target.value })}
                      placeholder={coachDetected ? "Auto-detected" : "Auto-detected or enter name"}
                      className={`w-full px-3 py-2 bg-slate-900 border rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 ${
                        coachDetected
                          ? "border-emerald-500/50 text-emerald-300 font-semibold"
                          : "border-slate-700"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="h-3 w-3 animate-spin" />}
                  <span>Save Batch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Batch & Change Success Coach Modal */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-purple-400" />
                  <span>Edit Batch of {editingBatch.year}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Update program details and change the dedicated Success Coach for{" "}
                  {editingBatch.campus.name}.
                </p>
              </div>
              <button
                onClick={() => setEditingBatch(null)}
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

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              {/* Program & Year */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Degree / Program
                </label>
                <input
                  type="text"
                  value={editForm.degree}
                  onChange={(e) => setEditForm({ ...editForm, degree: e.target.value })}
                  placeholder="e.g. B.Tech Computer Science & AI"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* Batch Academic Standing (Year & Semester) - Cascades to all students */}
              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Batch Academic Standing (Year & Semester)</span>
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Cascades to All Students
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Update the academic standing for this whole batch. Saving will automatically
                  update the current year and semester for all enrolled students in this batch
                  across the campus directory and student profiles.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Current Year
                    </label>
                    <select
                      value={editForm.currentYear}
                      onChange={(e) => {
                        const yr = e.target.value;
                        const sem = String(parseInt(yr, 10) * 2 - 1);
                        setEditForm({ ...editForm, currentYear: yr, currentSemester: sem });
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                    >
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Current Semester
                    </label>
                    <select
                      value={editForm.currentSemester}
                      onChange={(e) =>
                        setEditForm({ ...editForm, currentSemester: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-medium"
                    >
                      <option value="1">Semester 1</option>
                      <option value="2">Semester 2</option>
                      <option value="3">Semester 3</option>
                      <option value="4">Semester 4</option>
                      <option value="5">Semester 5</option>
                      <option value="6">Semester 6</option>
                      <option value="7">Semester 7</option>
                      <option value="8">Semester 8</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Number of Students & Sections */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Number of Students Enrolled
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.numberOfStudents}
                    onChange={(e) => setEditForm({ ...editForm, numberOfStudents: e.target.value })}
                    placeholder="e.g. 181"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Number of Sections
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editForm.numberOfSections}
                    onChange={(e) => {
                      const count = parseInt(e.target.value, 10);
                      const current = [...editForm.sections];
                      if (!isNaN(count) && count > 0 && current.length === 0) {
                        for (let i = 1; i <= count; i++) current.push(`Sec ${i}`);
                      }
                      setEditForm({
                        ...editForm,
                        numberOfSections: e.target.value,
                        sections: current,
                      });
                    }}
                    placeholder="e.g. 3"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Section Names Manager */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200">
                    Batch Sections & Custom Names
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {editForm.sections.length} section{editForm.sections.length === 1 ? "" : "s"}{" "}
                    defined
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Update section names for this batch. New student registrations will select from
                  these options.
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {editForm.sections.map((sec, idx) => (
                    <span
                      key={`${sec}-${idx}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/70 border border-purple-700/80 text-xs font-semibold text-purple-200"
                    >
                      <span>{sec}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditForm({
                            ...editForm,
                            sections: editForm.sections.filter((_, i) => i !== idx),
                            numberOfSections: String(Math.max(0, editForm.sections.length - 1)),
                          })
                        }
                        className="text-purple-400 hover:text-rose-400 text-xs cursor-pointer"
                        title="Remove section"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={editNewSectionName}
                    onChange={(e) => setEditNewSectionName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const trimmed = editNewSectionName.trim();
                        if (trimmed && !editForm.sections.includes(trimmed)) {
                          const updated = [...editForm.sections, trimmed];
                          setEditForm({
                            ...editForm,
                            sections: updated,
                            numberOfSections: String(updated.length),
                          });
                          setEditNewSectionName("");
                        }
                      }
                    }}
                    placeholder="Type section name (e.g. Sec 1) and press Add"
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = editNewSectionName.trim();
                      if (trimmed && !editForm.sections.includes(trimmed)) {
                        const updated = [...editForm.sections, trimmed];
                        setEditForm({
                          ...editForm,
                          sections: updated,
                          numberOfSections: String(updated.length),
                        });
                        setEditNewSectionName("");
                      }
                    }}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Dedicated Success Coach Section */}
              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Dedicated Success Coach</span>
                  </label>
                  <span className="text-[10px] text-purple-400 font-mono font-semibold">
                    1 coach per batch
                  </span>
                </div>
                <p className="text-[11px] text-purple-200/80">
                  Select a known campus faculty or enter their Employee ID to assign as the Success
                  Coach.
                </p>

                {/* Quick Picker for Campus Faculties */}
                {availableFaculties.length > 0 && (
                  <div className="pt-1">
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Quick Pick from Campus Faculty
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {availableFaculties.map((fac) => (
                        <button
                          key={fac.id}
                          type="button"
                          onClick={() => {
                            setEditForm((prev) => ({
                              ...prev,
                              successCoachEmployeeId: fac.employeeId || "",
                              successCoachName: fac.name,
                            }));
                          }}
                          className={`px-2 py-1 rounded-lg text-[11px] border transition-colors flex items-center gap-1 ${
                            editForm.successCoachName === fac.name
                              ? "bg-purple-600 text-white border-purple-400 font-semibold"
                              : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                          }`}
                        >
                          <User className="h-3 w-3 text-purple-400" />
                          <span>{fac.name}</span>
                          {fac.employeeId && (
                            <span className="text-[9px] font-mono opacity-70">
                              ({fac.employeeId})
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Employee ID
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editForm.successCoachEmployeeId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditForm((prev) => ({ ...prev, successCoachEmployeeId: val }));
                          void handleEditCoachDetect(val);
                        }}
                        placeholder="e.g. FAC-0492"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      {editDetectingCoach && (
                        <RefreshCw className="h-3 w-3 animate-spin absolute right-2.5 top-2.5 text-purple-400" />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Coach Name
                    </label>
                    <input
                      type="text"
                      value={editForm.successCoachName}
                      onChange={(e) =>
                        setEditForm({ ...editForm, successCoachName: e.target.value })
                      }
                      placeholder="e.g. Dr. R. K. Sharma"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBatch(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/25 transition-all flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="h-3 w-3 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
