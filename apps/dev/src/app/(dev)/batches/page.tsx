"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  Plus,
  Trash2,
  Search,
  School,
  UserCheck,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface CampusOption {
  id: string;
  name: string;
  city: string;
}

interface BatchRecord {
  id: string;
  campusId: string;
  year: number;
  numberOfStudents: number | null;
  numberOfSections: number | null;
  degree: string | null;
  successCoachEmployeeId: string | null;
  successCoachName: string | null;
  createdAt: string;
  campus: {
    id: string;
    name: string;
    city: string;
  };
}

export default function DevBatchesPage() {
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [campuses, setCampuses] = useState<CampusOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampusId, setSelectedCampusId] = useState("");
  const [search, setSearch] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-detect coach state
  const [detectingCoach, setDetectingCoach] = useState(false);
  const [detectedCoachName, setDetectedCoachName] = useState("");

  const currentYear = new Date().getFullYear();
  const yearOptions = [2023, 2024, 2025, 2026, 2027, 2028];

  const [form, setForm] = useState({
    campusId: "",
    year: String(currentYear),
    numberOfStudents: "",
    numberOfSections: "",
    degree: "",
    successCoachEmployeeId: "",
    successCoachName: "",
  });

  // Load campuses
  useEffect(() => {
    async function loadCampuses() {
      try {
        const res = await fetch("/api/dev/campuses");
        const data = (await res.json()) as { campuses: CampusOption[] };
        setCampuses(data.campuses ?? []);
        if (data.campuses?.length > 0 && !form.campusId) {
          setForm((f) => ({ ...f, campusId: data.campuses[0].id }));
        }
      } catch (err) {
        console.error("Failed to load campuses", err);
      }
    }
    void loadCampuses();
  }, []);

  // Load batches
  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCampusId) params.set("campusId", selectedCampusId);
      const res = await fetch(`/api/dev/batches?${params}`);
      const data = (await res.json()) as { batches: BatchRecord[] };
      setBatches(data.batches ?? []);
    } catch (err) {
      console.error("Failed to load batches", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCampusId]);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  // Success Coach Auto Detection by Employee ID
  async function handleCoachLookup(empId: string, campusId: string) {
    if (!empId.trim()) {
      setDetectedCoachName("");
      setForm((f) => ({ ...f, successCoachName: "" }));
      return;
    }

    setDetectingCoach(true);
    try {
      const res = await fetch(
        `/api/dev/faculties/lookup?employeeId=${encodeURIComponent(empId)}&campusId=${encodeURIComponent(campusId)}`,
      );
      const data = (await res.json()) as {
        found: boolean;
        faculty?: { name: string; designation?: string };
      };
      if (data.found && data.faculty?.name) {
        setDetectedCoachName(data.faculty.name);
        setForm((f) => ({ ...f, successCoachName: data.faculty?.name ?? "" }));
      } else {
        setDetectedCoachName("");
      }
    } catch {
      setDetectedCoachName("");
    } finally {
      setDetectingCoach(false);
    }
  }

  async function handleCreateBatch(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/dev/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        setFormError(err.error || "Failed to create batch");
        return;
      }

      setShowModal(false);
      setForm({
        campusId: campuses[0]?.id ?? "",
        year: String(currentYear),
        numberOfStudents: "",
        numberOfSections: "",
        degree: "",
        successCoachEmployeeId: "",
        successCoachName: "",
      });
      setDetectedCoachName("");
      void loadBatches();
    } catch (err) {
      setFormError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteBatch(id: string) {
    if (!confirm("Are you sure you want to delete this batch?")) return;
    try {
      const res = await fetch(`/api/dev/batches?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        void loadBatches();
      }
    } catch (err) {
      alert("Failed to delete: " + String(err));
    }
  }

  const filteredBatches = batches.filter((b) => {
    if (search) {
      const q = search.toLowerCase();
      const matchYear = String(b.year).includes(q);
      const matchCampus = b.campus.name.toLowerCase().includes(q);
      const matchCoach = b.successCoachName?.toLowerCase().includes(q);
      const matchDegree = b.degree?.toLowerCase().includes(q);
      if (!matchYear && !matchCampus && !matchCoach && !matchDegree) return false;
    }
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Calendar className="h-6 w-6 text-amber-500" />
            <span>Campus Batches</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
              Dev Console
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage campus academic cohorts with strictly one Success Coach per batch.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20"
        >
          <Plus className="h-4 w-4" />
          <span>New Batch</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-slate-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search batches by year, degree, coach, or campus…"
            className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <School className="h-4 w-4 text-slate-500" />
          <select
            value={selectedCampusId}
            onChange={(e) => setSelectedCampusId(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">All Campuses</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.city})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => void loadBatches()}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Batches Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading batches…</div>
        ) : filteredBatches.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No batches found. Click &quot;New Batch&quot; above to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Campus</th>
                  <th className="py-3 px-4">Batch Year</th>
                  <th className="py-3 px-4">Degree / Program</th>
                  <th className="py-3 px-4">Students</th>
                  <th className="py-3 px-4">Sections</th>
                  <th className="py-3 px-4">Success Coach</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <School className="h-3.5 w-3.5 text-indigo-400" />
                        <span>{b.campus.name}</span>
                        <span className="text-[10px] text-slate-500">({b.campus.city})</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                      Batch {b.year}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {b.degree || <span className="text-slate-600 italic">Not specified</span>}
                    </td>
                    <td className="py-3.5 px-4 font-mono">{b.numberOfStudents ?? "—"}</td>
                    <td className="py-3.5 px-4 font-mono">{b.numberOfSections ?? "—"}</td>
                    <td className="py-3.5 px-4">
                      {b.successCoachName ? (
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <UserCheck className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-semibold">{b.successCoachName}</span>
                          {b.successCoachEmployeeId && (
                            <span className="text-[10px] font-mono text-slate-500">
                              ({b.successCoachEmployeeId})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteBatch(b.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Batch"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Batch Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-400" />
                  <span>New Batch Form</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Configure batch cohort and assign exactly one Success Coach.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateBatch} className="space-y-3.5">
              {/* Campus */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Campus <span className="text-amber-400">*</span>
                </label>
                <select
                  required
                  value={form.campusId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    setForm({ ...form, campusId: cid });
                    if (form.successCoachEmployeeId) {
                      void handleCoachLookup(form.successCoachEmployeeId, cid);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">-- Select Campus --</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city})
                    </option>
                  ))}
                </select>
              </div>

              {/* Year & Degree */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Batch Year <span className="text-amber-400">*</span>
                  </label>
                  <select
                    required
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
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
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Number of Students & Number of Sections */}
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
                    placeholder="e.g. 180"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Number of Sections
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.numberOfSections}
                    onChange={(e) => setForm({ ...form, numberOfSections: e.target.value })}
                    placeholder="e.g. 3"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Success Coach Section */}
              <div className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-amber-400">
                    Success Coach (Non-Teaching Faculty)
                  </label>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    1 Coach per batch
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Strictly only one Success Coach is designated for each batch in each campus. Type
                  the Employee ID to automatically detect name.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Coach Employee ID
                    </label>
                    <input
                      type="text"
                      value={form.successCoachEmployeeId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm({ ...form, successCoachEmployeeId: val });
                        void handleCoachLookup(val, form.campusId);
                      }}
                      placeholder="e.g. SC-0104"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Detected Coach Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={form.successCoachName}
                        onChange={(e) => setForm({ ...form, successCoachName: e.target.value })}
                        placeholder={detectingCoach ? "Detecting…" : "Auto-detected from ID"}
                        className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-emerald-400 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                      />
                      {detectedCoachName && (
                        <UserCheck className="absolute right-2.5 top-2.5 h-4 w-4 text-emerald-400" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.campusId || !form.year}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20"
                >
                  {submitting ? "Saving Batch…" : "Create Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
