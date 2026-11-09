"use client";

import { useEffect, useState, useCallback } from "react";
import { BookOpen, Plus, CheckCircle2, Trash2, X, RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";

interface CampusOption {
  id: string;
  name: string;
  city: string;
}

interface FacultyField {
  employeeId: string;
  name: string;
}

interface SubjectDraft {
  id: string;
  name: string;
  code: string;
  credits: number;
  type: "Theory" | "Practical";
  handledBy: "University" | "NIAT";
  hodEmployeeId: string;
  hodName: string;
  teachingFaculties: FacultyField[];
  mentors: FacultyField[];
}

interface SavedSubject {
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
  campus: { name: string; city: string };
}

function createEmptySubject(): SubjectDraft {
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
    mentors: [{ employeeId: "", name: "" }],
  };
}

export default function SubjectsPage(): React.JSX.Element {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const isCampusManager = session?.user?.role === "CAMPUS_MANAGER";

  const [subjectsList, setSubjectsList] = useState<SavedSubject[]>([]);
  const [campuses, setCampuses] = useState<CampusOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Filter state for viewing
  const [viewSemester, setViewSemester] = useState<string>("ALL");
  const [viewBatch, setViewBatch] = useState<string>("ALL");

  // Dynamic 4-year batch calculation starting from 2023
  const currentYear = new Date().getFullYear();
  const batchYears: number[] = [];
  for (let y = 2023; y <= currentYear; y++) {
    batchYears.push(y);
  }

  // Form State
  const [formCampusId, setFormCampusId] = useState("");
  const [formSemester, setFormSemester] = useState<number>(1);
  const [formBatchYear, setFormBatchYear] = useState<number>(
    batchYears[batchYears.length - 1] ?? 2026,
  );
  const [subjects, setSubjects] = useState<SubjectDraft[]>([createEmptySubject()]);

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
          if (list.length > 0 && !formCampusId) {
            setFormCampusId(
              isCampusManager
                ? (session?.user?.managedCampusId ?? list[0]?.id ?? "")
                : (list[0]?.id ?? ""),
            );
          }
        }
      } catch (err) {
        console.error("Failed to load campuses", err);
      }
    }
    void loadCampuses();
  }, [formCampusId, isCampusManager, session]);

  const loadSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (viewSemester !== "ALL") params.set("semester", viewSemester);
      if (viewBatch !== "ALL") params.set("batchYear", viewBatch);

      const res = await fetch(`/api/subjects?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as { subjects?: SavedSubject[] };
        setSubjectsList(data.subjects ?? []);
      }
    } catch {
      setErrorMsg("Failed to load subjects.");
    } finally {
      setLoading(false);
    }
  }, [viewSemester, viewBatch]);

  useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  // Live Auto-detect Faculty Name by Employee ID
  async function detectFacultyName(employeeId: string): Promise<string> {
    if (!employeeId.trim()) return "";
    try {
      const res = await fetch(
        `/api/faculties/lookup?employeeId=${encodeURIComponent(employeeId.trim())}`,
      );
      const data = (await res.json()) as { found: boolean; faculty?: { name: string } };
      return data.found && data.faculty?.name ? data.faculty.name : "";
    } catch {
      return "";
    }
  }

  // Subject builder helpers
  function updateSubject(idx: number, patch: Partial<SubjectDraft>) {
    setSubjects((prev) => {
      const copy = [...prev];
      const current = copy[idx];
      if (!current) return copy;
      copy[idx] = { ...current, ...patch };
      return copy;
    });
  }

  async function handleHodChange(idx: number, empId: string) {
    updateSubject(idx, { hodEmployeeId: empId });
    const detected = await detectFacultyName(empId);
    updateSubject(idx, { hodName: detected });
  }

  async function handleTeachingFacultyChange(subIdx: number, fIdx: number, empId: string) {
    setSubjects((prev) => {
      const copy = [...prev];
      const current = copy[subIdx];
      if (!current) return copy;
      const tf = [...current.teachingFaculties];
      tf[fIdx] = { employeeId: empId, name: tf[fIdx]?.name ?? "" };
      copy[subIdx] = { ...current, teachingFaculties: tf };
      return copy;
    });

    const detected = await detectFacultyName(empId);
    setSubjects((prev) => {
      const copy = [...prev];
      const current = copy[subIdx];
      if (!current) return copy;
      const tf = [...current.teachingFaculties];
      tf[fIdx] = { employeeId: empId, name: detected };
      copy[subIdx] = { ...current, teachingFaculties: tf };
      return copy;
    });
  }

  function addTeachingFaculty(subIdx: number) {
    setSubjects((prev) => {
      const copy = [...prev];
      const current = copy[subIdx];
      if (!current) return copy;
      copy[subIdx] = {
        ...current,
        teachingFaculties: [...current.teachingFaculties, { employeeId: "", name: "" }],
      };
      return copy;
    });
  }

  function removeTeachingFaculty(subIdx: number, fIdx: number) {
    setSubjects((prev) => {
      const copy = [...prev];
      const current = copy[subIdx];
      if (!current) return copy;
      const tf = current.teachingFaculties.filter((_, i) => i !== fIdx);
      copy[subIdx] = {
        ...current,
        teachingFaculties: tf.length > 0 ? tf : [{ employeeId: "", name: "" }],
      };
      return copy;
    });
  }

  async function handleMentorChange(subIdx: number, mIdx: number, empId: string) {
    setSubjects((prev) => {
      const copy = [...prev];
      const current = copy[subIdx];
      if (!current) return copy;
      const mf = [...current.mentors];
      mf[mIdx] = { employeeId: empId, name: mf[mIdx]?.name ?? "" };
      copy[subIdx] = { ...current, mentors: mf };
      return copy;
    });

    const detected = await detectFacultyName(empId);
    setSubjects((prev) => {
      const copy = [...prev];
      const current = copy[subIdx];
      if (!current) return copy;
      const mf = [...current.mentors];
      mf[mIdx] = { employeeId: empId, name: detected };
      copy[subIdx] = { ...current, mentors: mf };
      return copy;
    });
  }

  function addMentor(subIdx: number) {
    setSubjects((prev) => {
      const copy = [...prev];
      const current = copy[subIdx];
      if (!current) return copy;
      copy[subIdx] = {
        ...current,
        mentors: [...current.mentors, { employeeId: "", name: "" }],
      };
      return copy;
    });
  }

  function removeMentor(subIdx: number, mIdx: number) {
    setSubjects((prev) => {
      const copy = [...prev];
      const current = copy[subIdx];
      if (!current) return copy;
      const mf = current.mentors.filter((_, i) => i !== mIdx);
      copy[subIdx] = { ...current, mentors: mf.length > 0 ? mf : [{ employeeId: "", name: "" }] };
      return copy;
    });
  }

  function addSubjectRow() {
    setSubjects((prev) => [...prev, createEmptySubject()]);
  }

  function removeSubjectRow(idx: number) {
    setSubjects((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  function openCreateModal() {
    setSubjects([createEmptySubject()]);
    setErrorMsg(null);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const targetCampus = isCampusManager ? session?.user?.managedCampusId : formCampusId;
    if (!targetCampus) {
      setErrorMsg("Please select a target campus.");
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        campusId: targetCampus,
        batchYear: formBatchYear,
        semester: formSemester,
        subjects: subjects.map((s) => ({
          name: s.name,
          code: s.code || null,
          credits: s.credits,
          type: s.type,
          handledBy: s.handledBy,
          hodEmployeeId: s.hodEmployeeId || null,
          hodName: s.hodName || null,
          teachingFacultyIds: s.teachingFaculties.map((f) => f.employeeId).filter(Boolean),
          teachingFacultyNames: s.teachingFaculties.map((f) => f.name).filter(Boolean),
          mentorFacultyIds: s.mentors.map((m) => m.employeeId).filter(Boolean),
          mentorFacultyNames: s.mentors.map((m) => m.name).filter(Boolean),
        })),
      };

      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to save subjects.");
        return;
      }

      notify(data.message ?? "Semester subjects saved successfully!");
      setShowModal(false);
      void loadSubjects();
    } catch {
      setErrorMsg("Network error while saving semester subjects.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to remove "${name}"?`)) return;

    try {
      const res = await fetch(`/api/subjects?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        notify(`Subject "${name}" removed.`);
        void loadSubjects();
      } else {
        const data = (await res.json()) as { error?: string };
        alert(data.error ?? "Failed to delete subject.");
      }
    } catch {
      alert("Network error.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-400" />
            <span>Semester Subjects & Faculty Allocation</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold uppercase">
              {isSuperAdmin ? "Super Admin Universal" : "Campus Admin Scoped"}
            </span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Map semester subjects (Sem 1–8), credits, HODs, teaching faculties, and mentors for
            student batches.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all w-fit"
        >
          <Plus className="h-4 w-4" />
          <span>+ New Semester Subjects Form</span>
        </button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Semester:</span>
          <select
            value={viewSemester}
            onChange={(e) => setViewSemester(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Batch Year:</span>
          <select
            value={viewBatch}
            onChange={(e) => setViewBatch(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Batches</option>
            {batchYears.map((y) => (
              <option key={y} value={y}>
                Batch of {y}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => void loadSubjects()}
          className="p-2 ml-auto rounded-lg bg-slate-950 text-slate-400 hover:text-white border border-slate-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Subjects Listing Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="text-left px-5 py-3.5 font-bold">Subject & Code</th>
                <th className="text-left px-5 py-3.5 font-bold">Batch & Semester</th>
                <th className="text-left px-5 py-3.5 font-bold">Credits & Type</th>
                <th className="text-left px-5 py-3.5 font-bold">Handled By</th>
                <th className="text-left px-5 py-3.5 font-bold">HOD</th>
                <th className="text-left px-5 py-3.5 font-bold">Teaching Faculty</th>
                <th className="text-left px-5 py-3.5 font-bold">Mentors</th>
                <th className="text-right px-5 py-3.5 font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    <span>Loading subjects…</span>
                  </td>
                </tr>
              ) : subjectsList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <BookOpen className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-300">
                      No semester subjects mapped yet
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Click <strong>+ New Semester Subjects Form</strong> above to enroll subjects
                      with HOD, Teaching Faculties, and Mentors.
                    </p>
                  </td>
                </tr>
              ) : (
                subjectsList.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Subject & Code */}
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-white text-sm">{s.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-slate-400">
                        {s.code && (
                          <span className="font-mono text-indigo-400 font-semibold">{s.code}</span>
                        )}
                        <span>·</span>
                        <span className="text-[11px] text-slate-500">{s.campus.name}</span>
                      </div>
                    </td>

                    {/* Batch & Semester */}
                    <td className="px-5 py-3.5">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                        Semester {s.semester}
                      </span>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">
                        Batch {s.batchYear}
                      </p>
                    </td>

                    {/* Credits & Type */}
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-slate-200">{s.credits} Credits</span>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">
                        {s.type}
                      </p>
                    </td>

                    {/* Handled By */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          s.handledBy === "NIAT"
                            ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                        }`}
                      >
                        {s.handledBy}
                      </span>
                    </td>

                    {/* HOD */}
                    <td className="px-5 py-3.5">
                      {s.hodName ? (
                        <div>
                          <p className="font-semibold text-white">{s.hodName}</p>
                          {s.hodEmployeeId && (
                            <p className="text-[10px] text-purple-400 font-mono">
                              {s.hodEmployeeId}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 font-mono text-[11px]">—</span>
                      )}
                    </td>

                    {/* Teaching Faculty */}
                    <td className="px-5 py-3.5">
                      {s.teachingFacultyNames.length > 0 ? (
                        <div className="space-y-1">
                          {s.teachingFacultyNames.map((name, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-200">{name}</span>
                              {s.teachingFacultyIds[i] && (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  ({s.teachingFacultyIds[i]})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-600 font-mono text-[11px]">—</span>
                      )}
                    </td>

                    {/* Mentors */}
                    <td className="px-5 py-3.5">
                      {s.mentorFacultyNames.length > 0 ? (
                        <div className="space-y-1">
                          {s.mentorFacultyNames.map((name, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <span className="font-semibold text-amber-300">{name}</span>
                              {s.mentorFacultyIds[i] && (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  ({s.mentorFacultyIds[i]})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-600 font-mono text-[11px]">—</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => void handleDelete(s.id, s.name)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete subject"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Semester Subjects Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-400" />
                  <span>New Semester Subjects Form</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Select campus, semester (1–8), and batch year (4 years from 2023), then add
                  subjects with auto-detected faculties.
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
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs shrink-0">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Top Configuration: Campus, Semester, Batch */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                {/* Campus */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Campus <span className="text-amber-400">*</span>
                  </label>
                  {isCampusManager ? (
                    <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-indigo-400 font-semibold truncate">
                      {session?.user?.managedCampusName ?? "Assigned Campus"}
                    </div>
                  ) : (
                    <select
                      required
                      value={formCampusId}
                      onChange={(e) => setFormCampusId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    >
                      {campuses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.city})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Semester 1 to 8 */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Semester <span className="text-amber-400">*</span>
                  </label>
                  <select
                    value={formSemester}
                    onChange={(e) => setFormSemester(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Batch: 2023 to current year */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Batch (Joining Year) <span className="text-amber-400">*</span>
                  </label>
                  <select
                    value={formBatchYear}
                    onChange={(e) => setFormBatchYear(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold font-mono"
                  >
                    {batchYears.map((y) => (
                      <option key={y} value={y}>
                        Batch of {y} ({y}–{y + 4})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Subject Blocks */}
              <div className="space-y-4">
                {subjects.map((sub, sIdx) => (
                  <div
                    key={sub.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3 relative"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        <span>Subject {sIdx + 1}</span>
                      </span>
                      {subjects.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSubjectRow(sIdx)}
                          className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    {/* Subject Name, Code, Credits */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Subject Name <span className="text-amber-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={sub.name}
                          onChange={(e) => updateSubject(sIdx, { name: e.target.value })}
                          placeholder="e.g. Data Structures & Algorithms"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Subject Code
                        </label>
                        <input
                          type="text"
                          value={sub.code}
                          onChange={(e) => updateSubject(sIdx, { code: e.target.value })}
                          placeholder="e.g. CS301"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Credits
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={sub.credits}
                          onChange={(e) =>
                            updateSubject(sIdx, { credits: parseInt(e.target.value, 10) || 3 })
                          }
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Type & Handled By */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Subject Type
                        </label>
                        <select
                          value={sub.type}
                          onChange={(e) =>
                            updateSubject(sIdx, { type: e.target.value as "Theory" | "Practical" })
                          }
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="Theory">Theory</option>
                          <option value="Practical">Practical / Lab</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Subject Handled by
                        </label>
                        <select
                          value={sub.handledBy}
                          onChange={(e) =>
                            updateSubject(sIdx, {
                              handledBy: e.target.value as "University" | "NIAT",
                            })
                          }
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="University">University</option>
                          <option value="NIAT">NIAT</option>
                        </select>
                      </div>
                    </div>

                    {/* HOD Field with Auto-Detection */}
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1.5">
                      <label className="block text-xs font-bold text-purple-300">
                        HOD Allocation (Auto-Detected)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <input
                            type="text"
                            value={sub.hodEmployeeId}
                            onChange={(e) => void handleHodChange(sIdx, e.target.value)}
                            placeholder="HOD Employee ID (e.g. FAC-001)"
                            className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            readOnly
                            value={sub.hodName}
                            placeholder="HOD Name (automatically detected)"
                            className="w-full px-3 py-1.5 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-purple-300 font-semibold focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Teaching Faculties List with Auto-Detection & Add Button */}
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-indigo-300">
                          Teaching Faculties (Auto-Detected)
                        </label>
                        <button
                          type="button"
                          onClick={() => addTeachingFaculty(sIdx)}
                          className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add Teaching Faculty Button</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {sub.teachingFaculties.map((tf, fIdx) => (
                          <div
                            key={fIdx}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-2 relative"
                          >
                            <input
                              type="text"
                              value={tf.employeeId}
                              onChange={(e) =>
                                void handleTeachingFacultyChange(sIdx, fIdx, e.target.value)
                              }
                              placeholder={`Faculty ${fIdx + 1} Employee ID (e.g. FAC-0492)`}
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                readOnly
                                value={tf.name}
                                placeholder="Teaching Faculty Name (auto-detected)"
                                className="w-full px-3 py-1.5 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-indigo-300 font-semibold focus:outline-none"
                              />
                              {sub.teachingFaculties.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeTeachingFaculty(sIdx, fIdx)}
                                  className="p-1 text-slate-500 hover:text-rose-400"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Mentors List with Auto-Detection & Add Button */}
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-amber-300">
                          Mentors (Auto-Detected)
                        </label>
                        <button
                          type="button"
                          onClick={() => addMentor(sIdx)}
                          className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add Mentoring Faculty Button</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {sub.mentors.map((m, mIdx) => (
                          <div
                            key={mIdx}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-2 relative"
                          >
                            <input
                              type="text"
                              value={m.employeeId}
                              onChange={(e) => void handleMentorChange(sIdx, mIdx, e.target.value)}
                              placeholder={`Mentor ${mIdx + 1} Employee ID (e.g. FAC-0318)`}
                              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                readOnly
                                value={m.name}
                                placeholder="Mentor Name (auto-detected)"
                                className="w-full px-3 py-1.5 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-amber-300 font-semibold focus:outline-none"
                              />
                              {sub.mentors.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeMentor(sIdx, mIdx)}
                                  className="p-1 text-slate-500 hover:text-rose-400"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Subject Button */}
              <button
                type="button"
                onClick={addSubjectRow}
                className="w-full py-2.5 px-4 rounded-xl border border-dashed border-indigo-500/40 hover:border-indigo-500 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Add Subject Button</span>
              </button>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 shrink-0">
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
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Save All Semester Subjects</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
