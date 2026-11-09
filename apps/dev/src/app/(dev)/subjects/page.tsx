"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Plus,
  Trash2,
  Search,
  School,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Layers,
  GraduationCap,
} from "lucide-react";

interface CampusOption {
  id: string;
  name: string;
  city: string;
}

interface SubjectDraft {
  id: string;
  name: string;
  code: string;
  credits: number;
  type: string;
  handledBy: string;
  hodEmployeeId: string;
  hodName: string;
  teachingFaculties: Array<{ employeeId: string; name: string }>;
  mentorFaculties: Array<{ employeeId: string; name: string }>;
}

interface SemesterSubjectRecord {
  id: string;
  campusId: string;
  batchYear: number;
  semester: number;
  name: string;
  code: string | null;
  credits: number | null;
  type: string;
  handledBy: string;
  hodEmployeeId: string | null;
  hodName: string | null;
  teachingFacultyIds: string[];
  teachingFacultyNames: string[];
  mentorFacultyIds: string[];
  mentorFacultyNames: string[];
  createdAt: string;
  campus: {
    id: string;
    name: string;
    city: string;
  };
}

export default function DevSubjectsPage() {
  const [subjectsList, setSubjectsList] = useState<SemesterSubjectRecord[]>([]);
  const [campuses, setCampuses] = useState<CampusOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampusId, setSelectedCampusId] = useState("");
  const [selectedBatchYear, setSelectedBatchYear] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [search, setSearch] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Dynamic 4-year batch window from 2023 to current year
  const currentYear = new Date().getFullYear();
  const batchYearOptions: number[] = [];
  for (let y = 2023; y <= Math.max(currentYear, 2026); y++) {
    batchYearOptions.push(y);
  }

  // Multi-subject form configuration
  const [modalCampusId, setModalCampusId] = useState("");
  const [modalBatchYear, setModalBatchYear] = useState(String(batchYearOptions[0] ?? 2023));
  const [modalSemester, setModalSemester] = useState("1");
  const [subjectDrafts, setSubjectDrafts] = useState<SubjectDraft[]>([createEmptySubjectDraft()]);

  function createEmptySubjectDraft(): SubjectDraft {
    return {
      id: Math.random().toString(36).substring(2, 9),
      name: "",
      code: "",
      credits: 3,
      type: "Theory",
      handledBy: "University",
      hodEmployeeId: "",
      hodName: "",
      teachingFaculties: [{ employeeId: "", name: "" }],
      mentorFaculties: [{ employeeId: "", name: "" }],
    };
  }

  // Load campuses
  useEffect(() => {
    async function loadCampuses() {
      try {
        const res = await fetch("/api/dev/campuses");
        const data = (await res.json()) as { campuses: CampusOption[] };
        setCampuses(data.campuses ?? []);
        if (data.campuses?.length > 0 && !modalCampusId) {
          setModalCampusId(data.campuses[0].id);
        }
      } catch (err) {
        console.error("Failed to load campuses", err);
      }
    }
    void loadCampuses();
  }, []);

  // Load subjects
  const loadSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCampusId) params.set("campusId", selectedCampusId);
      if (selectedBatchYear) params.set("batchYear", selectedBatchYear);
      if (selectedSemester) params.set("semester", selectedSemester);
      const res = await fetch(`/api/dev/subjects?${params}`);
      const data = (await res.json()) as { subjects: SemesterSubjectRecord[] };
      setSubjectsList(data.subjects ?? []);
    } catch (err) {
      console.error("Failed to load subjects", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCampusId, selectedBatchYear, selectedSemester]);

  useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  // Lookup faculty name by employee ID
  async function lookupFaculty(employeeId: string, campusId: string): Promise<string> {
    if (!employeeId.trim()) return "";
    try {
      const res = await fetch(
        `/api/dev/faculties/lookup?employeeId=${encodeURIComponent(employeeId.trim())}&campusId=${encodeURIComponent(campusId)}`,
      );
      const data = (await res.json()) as { found: boolean; faculty?: { name: string } };
      if (data.found && data.faculty?.name) {
        return data.faculty.name;
      }
    } catch {
      // ignore
    }
    return "";
  }

  // Update draft subject
  function updateSubjectDraft(index: number, patch: Partial<SubjectDraft>) {
    setSubjectDrafts((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  }

  // Add a new blank subject card
  function addSubjectCard() {
    setSubjectDrafts((prev) => [...prev, createEmptySubjectDraft()]);
  }

  // Remove a subject card
  function removeSubjectCard(index: number) {
    if (subjectDrafts.length <= 1) return;
    setSubjectDrafts((prev) => prev.filter((_, i) => i !== index));
  }

  // Add Teaching Faculty
  function addTeachingFaculty(subjectIdx: number) {
    setSubjectDrafts((prev) => {
      const copy = [...prev];
      copy[subjectIdx].teachingFaculties.push({ employeeId: "", name: "" });
      return copy;
    });
  }

  // Remove Teaching Faculty
  function removeTeachingFaculty(subjectIdx: number, facultyIdx: number) {
    setSubjectDrafts((prev) => {
      const copy = [...prev];
      copy[subjectIdx].teachingFaculties = copy[subjectIdx].teachingFaculties.filter(
        (_, i) => i !== facultyIdx,
      );
      return copy;
    });
  }

  // Add Mentor Faculty
  function addMentorFaculty(subjectIdx: number) {
    setSubjectDrafts((prev) => {
      const copy = [...prev];
      copy[subjectIdx].mentorFaculties.push({ employeeId: "", name: "" });
      return copy;
    });
  }

  // Remove Mentor Faculty
  function removeMentorFaculty(subjectIdx: number, mentorIdx: number) {
    setSubjectDrafts((prev) => {
      const copy = [...prev];
      copy[subjectIdx].mentorFaculties = copy[subjectIdx].mentorFaculties.filter(
        (_, i) => i !== mentorIdx,
      );
      return copy;
    });
  }

  // Handle submit multi-subject
  async function handleSaveSubjects(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    // Validate
    for (let i = 0; i < subjectDrafts.length; i++) {
      if (!subjectDrafts[i].name.trim()) {
        setFormError(`Subject #${i + 1} must have a Name`);
        setSubmitting(false);
        return;
      }
    }

    try {
      const payload = {
        campusId: modalCampusId,
        batchYear: Number(modalBatchYear),
        semester: Number(modalSemester),
        subjects: subjectDrafts.map((s) => ({
          name: s.name.trim(),
          code: s.code.trim() || undefined,
          credits: Number(s.credits) || 3,
          type: s.type,
          handledBy: s.handledBy,
          hodEmployeeId: s.hodEmployeeId.trim() || undefined,
          hodName: s.hodName.trim() || undefined,
          teachingFacultyIds: s.teachingFaculties.map((f) => f.employeeId.trim()).filter(Boolean),
          teachingFacultyNames: s.teachingFaculties.map((f) => f.name.trim()).filter(Boolean),
          mentorFacultyIds: s.mentorFaculties.map((m) => m.employeeId.trim()).filter(Boolean),
          mentorFacultyNames: s.mentorFaculties.map((m) => m.name.trim()).filter(Boolean),
        })),
      };

      const res = await fetch("/api/dev/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        setFormError(err.error || "Failed to save subjects");
        return;
      }

      setShowModal(false);
      setSubjectDrafts([createEmptySubjectDraft()]);
      void loadSubjects();
    } catch (err) {
      setFormError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  // Delete subject
  async function handleDeleteSubject(id: string) {
    if (!confirm("Are you sure you want to delete this subject?")) return;
    try {
      const res = await fetch(`/api/dev/subjects?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        void loadSubjects();
      }
    } catch (err) {
      alert("Failed to delete subject: " + String(err));
    }
  }

  const filteredSubjects = subjectsList.filter((s) => {
    if (search) {
      const q = search.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchCode = s.code?.toLowerCase().includes(q);
      const matchHod = s.hodName?.toLowerCase().includes(q);
      const matchCampus = s.campus.name.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchHod && !matchCampus) return false;
    }
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <BookOpen className="h-6 w-6 text-amber-500" />
            <span>Semester Subjects & Faculty Mapping</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
              Dev Console
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Map academic subjects to HODs, teaching faculties, and mentors across semesters (1–8)
            and batches (2023–{Math.max(currentYear, 2026)}).
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
          <span>New Semester Subjects Form</span>
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
            placeholder="Search by subject name, code, HOD or campus…"
            className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
          />
        </div>

        {/* Campus Filter */}
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

        {/* Batch Filter */}
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-slate-500" />
          <select
            value={selectedBatchYear}
            onChange={(e) => setSelectedBatchYear(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
          >
            <option value="">All Batches</option>
            {batchYearOptions.map((y) => (
              <option key={y} value={y}>
                Batch {y}
              </option>
            ))}
          </select>
        </div>

        {/* Semester Filter */}
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-slate-500" />
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
          >
            <option value="">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>
                Sem {s}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => void loadSubjects()}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Subjects Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading subjects…</div>
        ) : filteredSubjects.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No subjects found. Click &quot;New Semester Subjects Form&quot; above to create one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Subject & Code</th>
                  <th className="py-3 px-4">Campus</th>
                  <th className="py-3 px-4">Batch & Sem</th>
                  <th className="py-3 px-4">Type / Credits</th>
                  <th className="py-3 px-4">Handled By</th>
                  <th className="py-3 px-4">HOD</th>
                  <th className="py-3 px-4">Teaching Faculty</th>
                  <th className="py-3 px-4">Mentors</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredSubjects.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{s.name}</div>
                      {s.code && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {s.code}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div>{s.campus.name}</div>
                      <div className="text-[10px] text-slate-500">{s.campus.city}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-amber-400 font-bold">
                        Batch {s.batchYear}
                      </span>{" "}
                      • <span className="text-indigo-400 font-semibold">Sem {s.semester}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-300">{s.type}</span>{" "}
                      <span className="text-slate-500 font-mono">({s.credits ?? 3} Cr)</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          s.handledBy === "NIAT"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}
                      >
                        {s.handledBy}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {s.hodName ? (
                        <div>
                          <span className="font-semibold text-slate-200">{s.hodName}</span>
                          {s.hodEmployeeId && (
                            <span className="text-[10px] font-mono text-slate-500 block">
                              {s.hodEmployeeId}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 italic">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {s.teachingFacultyNames.length > 0 ? (
                        <div className="space-y-0.5">
                          {s.teachingFacultyNames.map((name, i) => (
                            <div key={i} className="text-emerald-400 text-[11px] font-medium">
                              • {name}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-600 italic">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {s.mentorFacultyNames.length > 0 ? (
                        <div className="space-y-0.5">
                          {s.mentorFacultyNames.map((name, i) => (
                            <div key={i} className="text-purple-400 text-[11px] font-medium">
                              • {name}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-600 italic">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteSubject(s.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Subject"
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

      {/* New Semester Subjects Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 p-5 shrink-0">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-amber-500" />
                  <span>New Semester Subjects Form</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Register curriculum subjects with auto-detected HODs, teaching faculties, and
                  mentors.
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
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 shrink-0">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveSubjects} className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Top Controls: Campus, Semester, Batch */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Campus <span className="text-amber-400">*</span>
                  </label>
                  <select
                    required
                    value={modalCampusId}
                    onChange={(e) => setModalCampusId(e.target.value)}
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

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Semester (1 to 8) <span className="text-amber-400">*</span>
                  </label>
                  <select
                    required
                    value={modalSemester}
                    onChange={(e) => setModalSemester(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Batch Year <span className="text-amber-400">*</span>
                  </label>
                  <select
                    required
                    value={modalBatchYear}
                    onChange={(e) => setModalBatchYear(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                  >
                    {batchYearOptions.map((y) => (
                      <option key={y} value={y}>
                        Batch {y} (Starts from 2023)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Subjects List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Subjects ({subjectDrafts.length})
                  </h4>
                  <button
                    type="button"
                    onClick={addSubjectCard}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 font-bold text-xs transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Add Subject</span>
                  </button>
                </div>

                {subjectDrafts.map((draft, sIdx) => (
                  <div
                    key={draft.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-4 relative"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-amber-400">Subject #{sIdx + 1}</span>
                      {subjectDrafts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSubjectCard(sIdx)}
                          className="text-slate-500 hover:text-rose-400 text-xs flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    {/* Basic Subject Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Subject Name <span className="text-amber-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={draft.name}
                          onChange={(e) => updateSubjectDraft(sIdx, { name: e.target.value })}
                          placeholder="e.g. Data Structures & Algorithms"
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Subject Code
                        </label>
                        <input
                          type="text"
                          value={draft.code}
                          onChange={(e) => updateSubjectDraft(sIdx, { code: e.target.value })}
                          placeholder="e.g. CS201"
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Credits
                        </label>
                        <select
                          value={draft.credits}
                          onChange={(e) =>
                            updateSubjectDraft(sIdx, { credits: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                        >
                          {[1, 2, 3, 4, 5, 6].map((c) => (
                            <option key={c} value={c}>
                              {c} Credit{c > 1 ? "s" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Type
                        </label>
                        <select
                          value={draft.type}
                          onChange={(e) => updateSubjectDraft(sIdx, { type: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="Theory">Theory</option>
                          <option value="Practical">Practical / Lab</option>
                          <option value="Theory + Practical">Theory + Practical</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Subject Handled by
                        </label>
                        <select
                          value={draft.handledBy}
                          onChange={(e) => updateSubjectDraft(sIdx, { handledBy: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="University">University</option>
                          <option value="NIAT">NIAT</option>
                        </select>
                      </div>
                    </div>

                    {/* HOD Auto-Detection */}
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 space-y-2">
                      <div className="text-[11px] font-bold text-slate-300">
                        HOD (Head of Department)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">
                            HOD Employee ID
                          </label>
                          <input
                            type="text"
                            value={draft.hodEmployeeId}
                            onChange={async (e) => {
                              const empId = e.target.value;
                              updateSubjectDraft(sIdx, { hodEmployeeId: empId });
                              const name = await lookupFaculty(empId, modalCampusId);
                              if (name) updateSubjectDraft(sIdx, { hodName: name });
                            }}
                            placeholder="e.g. HOD-CS01"
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 mb-1">
                            HOD Name (Auto-Detected)
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={draft.hodName}
                              onChange={(e) =>
                                updateSubjectDraft(sIdx, { hodName: e.target.value })
                              }
                              placeholder="Auto-detected from ID"
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-emerald-400 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                            />
                            {draft.hodName && (
                              <UserCheck className="absolute right-2.5 top-2.5 h-4 w-4 text-emerald-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Teaching Faculty (Dynamic) */}
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-bold text-slate-300">Teaching Faculty</div>
                        <button
                          type="button"
                          onClick={() => addTeachingFaculty(sIdx)}
                          className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          <span>+ Add Teaching Faculty</span>
                        </button>
                      </div>

                      {draft.teachingFaculties.map((tf, fIdx) => (
                        <div
                          key={fIdx}
                          className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center"
                        >
                          <div>
                            <input
                              type="text"
                              value={tf.employeeId}
                              onChange={async (e) => {
                                const empId = e.target.value;
                                const copy = [...draft.teachingFaculties];
                                copy[fIdx].employeeId = empId;
                                const name = await lookupFaculty(empId, modalCampusId);
                                if (name) copy[fIdx].name = name;
                                updateSubjectDraft(sIdx, { teachingFaculties: copy });
                              }}
                              placeholder="Faculty Employee ID"
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={tf.name}
                              onChange={(e) => {
                                const copy = [...draft.teachingFaculties];
                                copy[fIdx].name = e.target.value;
                                updateSubjectDraft(sIdx, { teachingFaculties: copy });
                              }}
                              placeholder="Faculty Name (Auto-detected)"
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-emerald-400 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                            />
                            {draft.teachingFaculties.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTeachingFaculty(sIdx, fIdx)}
                                className="text-slate-500 hover:text-rose-400 p-1"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Mentoring Faculty (Dynamic) */}
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-bold text-slate-300">
                          Mentoring Faculty
                        </div>
                        <button
                          type="button"
                          onClick={() => addMentorFaculty(sIdx)}
                          className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          <span>+ Add Mentoring Faculty</span>
                        </button>
                      </div>

                      {draft.mentorFaculties.map((mf, mIdx) => (
                        <div
                          key={mIdx}
                          className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center"
                        >
                          <div>
                            <input
                              type="text"
                              value={mf.employeeId}
                              onChange={async (e) => {
                                const empId = e.target.value;
                                const copy = [...draft.mentorFaculties];
                                copy[mIdx].employeeId = empId;
                                const name = await lookupFaculty(empId, modalCampusId);
                                if (name) copy[mIdx].name = name;
                                updateSubjectDraft(sIdx, { mentorFaculties: copy });
                              }}
                              placeholder="Mentor Employee ID"
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={mf.name}
                              onChange={(e) => {
                                const copy = [...draft.mentorFaculties];
                                copy[mIdx].name = e.target.value;
                                updateSubjectDraft(sIdx, { mentorFaculties: copy });
                              }}
                              placeholder="Mentor Name (Auto-detected)"
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-purple-400 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                            />
                            {draft.mentorFaculties.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeMentorFaculty(sIdx, mIdx)}
                                className="text-slate-500 hover:text-rose-400 p-1"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={addSubjectCard}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Add Another Subject</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !modalCampusId}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20"
                  >
                    {submitting ? "Saving Subjects…" : `Save ${subjectDrafts.length} Subject(s)`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
