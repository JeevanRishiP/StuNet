"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Plus,
  BookOpen,
  Link2,
  X,
  FileText,
  Sparkles,
  Award,
  GraduationCap,
  Bell,
  RefreshCw,
} from "lucide-react";

interface CiaEntry {
  id: string;
  subject: string;
  code?: string | null;
  component: string;
  scheduledAt: string;
  venue: string | null;
  topic?: string | null;
  status?: string | null;
  notes: string | null;
  campus?: { name: string };
}

interface IaEntry {
  id: string;
  subject: string;
  code?: string | null;
  examType: string;
  scheduledAt: string;
  durationMins: number | null;
  venue: string | null;
  syllabus?: string | null;
  syllabusUrl: string | null;
  questionBankUrl?: string | null;
  isTentative?: boolean;
  notes: string | null;
  campus?: { name: string };
}

const DEFAULT_CCBP_QB_URL =
  "https://learning.ccbp.in/course?c_id=897b679e-6c05-4450-a439-ec1cb2ea3f62";

const NIAT_CORE_SUBJECTS = [
  { name: "Core Data Structure and Intermediate Algorithms", code: "BTNX331", credits: 4 },
  { name: "Applied Communication English", code: "BTNX313", credits: 3 },
  { name: "Backend Development", code: "BTNX333", credits: 4 },
  { name: "Fundamentals of Probability and Statistics", code: "BTNX311", credits: 3 },
  { name: "AI for Finance", code: "BTNX314", credits: 3 },
  { name: "Logical Reasoning", code: "BTNX312", credits: 2 },
];

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalDatetimeInput(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${mins}`;
}

export default function SchedulesPage() {
  const [cia, setCia] = useState<CiaEntry[]>([]);
  const [ia, setIa] = useState<IaEntry[]>([]);
  const [sa, setSa] = useState<IaEntry[]>([]);
  const [see, setSee] = useState<IaEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter tab for tables: cia | sa | ia | see
  const [activeViewTab, setActiveViewTab] = useState<"cia" | "sa" | "ia" | "see">("ia");

  // Database subjects loaded from /api/subjects
  const [availableSubjects, setAvailableSubjects] = useState<
    Array<{
      id: string;
      name: string;
      code: string | null;
      credits: number;
      questionBankUrl?: string | null;
    }>
  >([]);
  const [isCustomSubject, setIsCustomSubject] = useState(false);

  // Create Form category: cia | sa | ia | see
  const [entryType, setEntryType] = useState<"cia" | "sa" | "ia" | "see">("ia");

  // Common single-entry state
  const [subject, setSubject] = useState("");
  const [code, setCode] = useState("");
  const [component, setComponent] = useState("CIA-1");
  const [examType, setExamType] = useState("IA-1");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMins, setDurationMins] = useState("60");
  const [venue, setVenue] = useState("");
  const [syllabus, setSyllabus] = useState("");
  const [syllabusUrl, setSyllabusUrl] = useState("");
  const [questionBankUrl, setQuestionBankUrl] = useState("");
  const [isTentative, setIsTentative] = useState(false);
  const [topic, setTopic] = useState("");
  const [ciaStatus, setCiaStatus] = useState("PENDING");
  const [notes, setNotes] = useState("");

  // Skill Assessment dedicated state (Single Day for all 6 NIAT core modules)
  const [saCycle, setSaCycle] = useState<"SKILL-ASSESSMENT-2" | "SKILL-ASSESSMENT-1">(
    "SKILL-ASSESSMENT-2",
  );
  const [saDate, setSaDate] = useState("");
  const [saIsTentative, setSaIsTentative] = useState(false);
  const [saVenue, setSaVenue] = useState("CCBP Exam Lab / Computer Center");
  const [saNotes, setSaNotes] = useState(
    "Single-day comprehensive assessment across all 6 NIAT core modules",
  );
  const [saSubjects, setSaSubjects] = useState(
    NIAT_CORE_SUBJECTS.map((s) => ({
      name: s.name,
      code: s.code,
      credits: s.credits,
      syllabus: "",
      questionBankUrl: DEFAULT_CCBP_QB_URL,
    })),
  );

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit Modal state
  const [editingEntry, setEditingEntry] = useState<IaEntry | null>(null);
  const [editingCia, setEditingCia] = useState<CiaEntry | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setFormError(null);
    try {
      const [schedRes, subRes] = await Promise.all([
        fetch("/api/schedules", { cache: "no-store" }),
        fetch("/api/subjects", { cache: "no-store" }),
      ]);

      if (schedRes.ok) {
        const d = await schedRes.json();
        setCia(d.cia ?? []);
        setIa(d.ia ?? []);
        setSa(d.sa ?? []);
        setSee(d.see ?? []);
      } else {
        const d = await schedRes.json().catch(() => ({}));
        setFormError(d.error || `Failed to fetch schedules (Status: ${schedRes.status})`);
      }

      if (subRes.ok) {
        const sd = await subRes.json();
        if (Array.isArray(sd.subjects)) {
          setAvailableSubjects(sd.subjects);
        }
      }
    } catch {
      setFormError("Failed to fetch schedule data from database.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Update syllabus for specific SA subject in the form
  function updateSaSubjectSyllabus(index: number, syllabusVal: string) {
    setSaSubjects((prev) => {
      const copy = [...prev];
      if (copy[index]) copy[index] = { ...copy[index], syllabus: syllabusVal };
      return copy;
    });
  }

  // Update QB url for specific SA subject in the form
  function updateSaSubjectQbUrl(index: number, qbUrl: string) {
    setSaSubjects((prev) => {
      const copy = [...prev];
      if (copy[index]) copy[index] = { ...copy[index], questionBankUrl: qbUrl };
      return copy;
    });
  }

  // ── Handle Skill Assessment (SA) Batch Submit ──
  async function handleCreateSkillAssessment(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sa",
          examType: saCycle,
          scheduledAt: saDate ? new Date(saDate).toISOString() : new Date().toISOString(),
          isTentative: saIsTentative,
          venue: saVenue.trim() || undefined,
          notes: saNotes.trim() || undefined,
          subjects: saSubjects.map((s) => ({
            name: s.name,
            code: s.code,
            syllabus: s.syllabus.trim() || undefined,
            questionBankUrl: s.questionBankUrl.trim() || undefined,
          })),
        }),
      });

      if (res.ok) {
        setSuccessMsg(
          "Successfully published Single-Day Skill Assessment for all 6 NIAT core modules and notified campus students.",
        );
        await load();
      } else {
        const d = await res.json();
        setFormError(d.error || "Failed to publish skill assessment.");
      }
    } catch {
      setFormError("Network error while publishing skill assessment.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Handle Standard Single Submit (CIA, IA, SEE) ──
  async function handleCreateSingle(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    if (!subject.trim() || !scheduledAt) {
      setFormError("Subject name and scheduled date & time are required.");
      return;
    }

    setSubmitting(true);
    const payload: Record<string, unknown> = {
      type: entryType,
      subject: subject.trim(),
      code: code.trim() || undefined,
      scheduledAt: new Date(scheduledAt).toISOString(),
      venue: venue.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (entryType === "cia") {
      payload.component = component.trim();
      payload.topic = topic.trim() || undefined;
      payload.status = ciaStatus;
    } else {
      payload.examType = examType.trim();
      if (durationMins) payload.durationMins = parseInt(durationMins, 10);
      if (syllabus.trim()) payload.syllabus = syllabus.trim();
      if (syllabusUrl.trim()) payload.syllabusUrl = syllabusUrl.trim();
      if (questionBankUrl.trim()) payload.questionBankUrl = questionBankUrl.trim();
      payload.isTentative = isTentative;
    }

    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccessMsg(
          `Successfully saved ${entryType.toUpperCase()} entry for "${subject.trim()}".`,
        );
        setSubject("");
        setCode("");
        setScheduledAt("");
        setVenue("");
        setSyllabus("");
        setSyllabusUrl("");
        setQuestionBankUrl("");
        setTopic("");
        setNotes("");
        setIsTentative(false);
        await load();
      } else {
        const d = await res.json();
        setFormError(d.error ?? "Failed to add entry.");
      }
    } catch {
      setFormError("Network error while creating entry.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateExam(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEntry) return;
    setEditError(null);
    setEditSubmitting(true);

    try {
      const res = await fetch("/api/schedules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "ia",
          id: editingEntry.id,
          subject: editingEntry.subject,
          code: editingEntry.code || null,
          examType: editingEntry.examType,
          scheduledAt: new Date(editingEntry.scheduledAt).toISOString(),
          durationMins: editingEntry.durationMins,
          venue: editingEntry.venue,
          syllabus: editingEntry.syllabus,
          syllabusUrl: editingEntry.syllabusUrl,
          questionBankUrl: editingEntry.questionBankUrl || null,
          isTentative: editingEntry.isTentative,
          notes: editingEntry.notes,
        }),
      });

      if (res.ok) {
        setSuccessMsg(`Updated examination entry for "${editingEntry.subject}".`);
        setEditingEntry(null);
        await load();
      } else {
        const d = await res.json();
        setEditError(d.error || "Failed to update entry.");
      }
    } catch {
      setEditError("Network error while updating.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleUpdateCia(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCia) return;
    setEditError(null);
    setEditSubmitting(true);

    try {
      const res = await fetch("/api/schedules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "cia",
          id: editingCia.id,
          subject: editingCia.subject,
          code: editingCia.code || null,
          component: editingCia.component,
          scheduledAt: new Date(editingCia.scheduledAt).toISOString(),
          venue: editingCia.venue,
          topic: editingCia.topic,
          status: editingCia.status,
          notes: editingCia.notes,
        }),
      });

      if (res.ok) {
        setSuccessMsg(`Updated CIA entry for "${editingCia.subject}".`);
        setEditingCia(null);
        await load();
      } else {
        const d = await res.json();
        setEditError(d.error || "Failed to update CIA entry.");
      }
    } catch {
      setEditError("Network error while updating.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleDelete(id: string, type: "ia" | "cia", name: string) {
    if (!confirm(`Are you sure you want to delete "${name}" from the database?`)) return;
    try {
      const res = await fetch(`/api/schedules?id=${id}&type=${type}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSuccessMsg(`Deleted entry "${name}".`);
        await load();
      } else {
        alert("Failed to delete entry.");
      }
    } catch {
      alert("Network error.");
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Calendar className="h-6 w-6 text-indigo-400" />
            <span>Academic Examinations & Assessment Schedules</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold uppercase">
              Database Synced
            </span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Configure CIA (1-3), NIAT Skill Assessments, IA (1-2), and Semester End Examinations
            (SEE).
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── Add Entry Form Section ── */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-400" />
              <span>Add New Examination or Assessment</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Select one of the 4 official evaluation categories to create or update schedules.
            </p>
          </div>

          {/* 4 Category Toggle Pills */}
          <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-slate-800 self-start sm:self-auto flex-wrap gap-1">
            <button
              type="button"
              onClick={() => {
                setEntryType("cia");
                setComponent("CIA-1");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                entryType === "cia"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              CIA (Continuous Assessment)
            </button>
            <button
              type="button"
              onClick={() => setEntryType("sa")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                entryType === "sa"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Skill Assessment (SA)
            </button>
            <button
              type="button"
              onClick={() => {
                setEntryType("ia");
                setExamType("IA-1");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                entryType === "ia"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Internal Assessment (IA)
            </button>
            <button
              type="button"
              onClick={() => {
                setEntryType("see");
                setExamType("SEE Theory Exam");
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                entryType === "see"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Semester End Exam (SEE)
            </button>
          </div>
        </div>

        {/* ── SKILL ASSESSMENT FORM (All 6 NIAT Core Subjects in One Form) ── */}
        {entryType === "sa" ? (
          <form onSubmit={handleCreateSkillAssessment} className="space-y-5">
            <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/20 space-y-2">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                <Sparkles className="h-4 w-4" />
                <span>NIAT 6-Subject Single-Day Skill Assessment</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Applies exclusively to the 6 NIAT-provided core courses (Yoga/University course
                excluded). All subjects are conducted on a single scheduled date. Configure date
                once for all subjects below.
              </p>
            </div>

            {/* Unified Schedule Controls */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Skill Assessment Cycle <span className="text-rose-400">*</span>
                </label>
                <select
                  value={saCycle}
                  onChange={(e) => setSaCycle(e.target.value as typeof saCycle)}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="SKILL-ASSESSMENT-2">Skill Assessment 2 (Active Evaluation)</option>
                  <option value="SKILL-ASSESSMENT-1">
                    Skill Assessment 1 (Archived / Completed)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Single-Day Evaluation Date & Time
                </label>
                <input
                  type="datetime-local"
                  disabled={saIsTentative}
                  value={saDate}
                  onChange={(e) => setSaDate(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  required={!saIsTentative}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Venue / Lab Details
                </label>
                <input
                  type="text"
                  value={saVenue}
                  onChange={(e) => setSaVenue(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. CCBP Exam Lab / Computer Center"
                />
              </div>

              <div className="flex flex-col justify-center">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Assessment Status
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-amber-300 font-medium mt-1">
                  <input
                    type="checkbox"
                    checked={saIsTentative}
                    onChange={(e) => setSaIsTentative(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500 h-4 w-4"
                  />
                  <span>Date Unknown / Tentative (To Be Announced)</span>
                </label>
              </div>
            </div>

            {/* Subjects List & Syllabus Coverage */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                <span>6 NIAT Core Subjects (Syllabus & Question Banks)</span>
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                {saSubjects.map((sub, idx) => (
                  <div
                    key={sub.code}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mr-2">
                          {sub.code}
                        </span>
                        <span className="text-xs font-bold text-white">{sub.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {sub.credits} Credits
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Syllabus & Practical Topics Covered:
                      </label>
                      <textarea
                        rows={2}
                        value={sub.syllabus}
                        onChange={(e) => updateSaSubjectSyllabus(idx, e.target.value)}
                        placeholder={`Topics & coverage for ${sub.name}...`}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                        Question Bank URL:
                      </label>
                      <input
                        type="url"
                        value={sub.questionBankUrl}
                        onChange={(e) => updateSaSubjectQbUrl(idx, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all flex items-center gap-2"
              >
                {submitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                <span>Publish 6-Subject Skill Assessment & Broadcast Notification</span>
              </button>
            </div>
          </form>
        ) : (
          /* ── STANDARD FORM (CIA, IA, SEE) ── */
          <form onSubmit={handleCreateSingle} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Subject Selection (Selectable Dropdown + Custom Fallback) */}
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Subject Name <span className="text-rose-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomSubject(!isCustomSubject);
                      if (!isCustomSubject) {
                        setSubject("");
                        setCode("");
                      }
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium"
                  >
                    {isCustomSubject
                      ? "← Choose from Curriculum Dropdown"
                      : "+ Enter Custom Subject"}
                  </button>
                </div>

                {!isCustomSubject ? (
                  <select
                    value={
                      availableSubjects.some((s) => s.name === subject && (s.code || "") === code)
                        ? `${subject}|||${code}`
                        : ""
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setSubject("");
                        setCode("");
                        return;
                      }
                      if (val === "CUSTOM") {
                        setIsCustomSubject(true);
                        setSubject("");
                        setCode("");
                        return;
                      }
                      const [subName, subCode] = val.split("|||");
                      setSubject(subName);
                      setCode(subCode || "");
                      const match = availableSubjects.find((s) => s.name === subName);
                      if (match?.questionBankUrl) {
                        setQuestionBankUrl(match.questionBankUrl);
                      }
                    }}
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    required={!isCustomSubject}
                  >
                    <option value="">-- Select Subject from Database Curriculum --</option>
                    {availableSubjects.map((s) => (
                      <option key={s.id} value={`${s.name}|||${s.code || ""}`}>
                        {s.name} {s.code ? `(${s.code})` : ""} • {s.credits} Credits
                      </option>
                    ))}
                    <option value="CUSTOM">✏️ Other / Custom Subject (Type Manually)</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    maxLength={200}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Enter custom subject name..."
                    required
                  />
                )}
              </div>

              {/* Subject Code (Auto-populated from selected Subject, editable) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Subject Code
                </label>
                <input
                  type="text"
                  maxLength={50}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. BTNX331 or SVY301"
                />
              </div>

              {/* Component (CIA) / Exam Type (IA, SEE) */}
              {entryType === "cia" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    CIA Component <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={component}
                    onChange={(e) => setComponent(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  >
                    <option value="CIA-1">CIA 1</option>
                    <option value="CIA-2">CIA 2</option>
                    <option value="CIA-3">CIA 3</option>
                  </select>
                </div>
              ) : entryType === "ia" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    IA Exam Type <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  >
                    <option value="IA-1">IA 1 (Internal Assessment 1)</option>
                    <option value="IA-2">IA 2 (Internal Assessment 2)</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Semester End Exam Type <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  >
                    <option value="SEE Theory Exam">SEE Theory Examination</option>
                    <option value="SEE Practical Lab Exam">SEE Practical Lab Exam</option>
                  </select>
                </div>
              )}

              {/* Date & Time */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Date & Time <span className="text-rose-400">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Duration (Exams only) */}
              {entryType !== "cia" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={300}
                    value={durationMins}
                    onChange={(e) => setDurationMins(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. 60"
                  />
                </div>
              )}

              {/* Venue */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Venue / Location
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder={
                    entryType === "cia" ? "e.g. LMS Portal" : "e.g. Main Academic Block Exam Hall 1"
                  }
                />
              </div>

              {/* Status */}
              {entryType !== "cia" ? (
                <div className="flex flex-col justify-center">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Schedule Status
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-medium mt-1">
                    <input
                      type="checkbox"
                      checked={isTentative}
                      onChange={(e) => setIsTentative(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500 h-4 w-4"
                    />
                    <span>Mark as Tentative (subject to revision)</span>
                  </label>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Submission Status
                  </label>
                  <select
                    value={ciaStatus}
                    onChange={(e) => setCiaStatus(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="SUBMITTED">SUBMITTED</option>
                    <option value="EXTENDED">EXTENDED</option>
                  </select>
                </div>
              )}
            </div>

            {/* Extra Fields for Exams: Question Bank & Syllabus */}
            {entryType !== "cia" && (
              <div className="space-y-4 pt-2 border-t border-slate-800">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-300">
                        Question Bank Link (URL)
                      </label>
                      <button
                        type="button"
                        onClick={() => setQuestionBankUrl(DEFAULT_CCBP_QB_URL)}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>Auto-fill CCBP Core Link</span>
                      </button>
                    </div>
                    <input
                      type="url"
                      value={questionBankUrl}
                      onChange={(e) => setQuestionBankUrl(e.target.value)}
                      placeholder="https://learning.ccbp.in/course?c_id=..."
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Syllabus Document / PDF URL
                    </label>
                    <input
                      type="url"
                      value={syllabusUrl}
                      onChange={(e) => setSyllabusUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Syllabus Topics & Exam Coverage
                  </label>
                  <textarea
                    rows={2}
                    value={syllabus}
                    onChange={(e) => setSyllabus(e.target.value)}
                    placeholder="e.g. Stacks, Queues, Binary Trees, BST, Heaps"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Extra field for CIA: Topic */}
            {entryType === "cia" && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assignment Topic / Guidelines
                </label>
                <textarea
                  rows={2}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Design a robust RBAC middleware architecture..."
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Internal Notes / Instructions
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. University Foundation Exam; viva following week"
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all flex items-center gap-1.5"
              >
                {submitting ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                <span>Save {entryType.toUpperCase()} Entry</span>
              </button>
            </div>
          </form>
        )}
      </section>

      {/* ── View Tables Section ── */}
      <section className="space-y-4">
        {/* Table Selector Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 flex-wrap gap-1">
            <button
              onClick={() => setActiveViewTab("cia")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeViewTab === "cia"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              CIA Assessments ({cia.length})
            </button>
            <button
              onClick={() => setActiveViewTab("sa")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeViewTab === "sa"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Skill Assessments ({sa.length})
            </button>
            <button
              onClick={() => setActiveViewTab("ia")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeViewTab === "ia"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              IA Examinations ({ia.length})
            </button>
            <button
              onClick={() => setActiveViewTab("see")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeViewTab === "see"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Semester End Exams ({see.length})
            </button>
          </div>

          <span className="text-[11px] text-slate-400">Live records from PostgreSQL database</span>
        </div>

        {/* ── CIA TABLE ── */}
        {activeViewTab === "cia" && (
          <div className="border border-slate-800 bg-slate-900/60 rounded-2xl overflow-hidden shadow-sm">
            {cia.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No CIA assessments recorded in database.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Component</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Venue</th>
                      <th className="py-3 px-4">Campus</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {cia.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{c.subject}</div>
                          {c.code && (
                            <span className="text-[10px] font-mono text-slate-400">{c.code}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded font-bold font-mono text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {c.component}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {formatDateTime(c.scheduledAt)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">{c.venue || "—"}</td>
                        <td className="py-3.5 px-4 text-slate-400">{c.campus?.name || "—"}</td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setEditingCia(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors mr-1"
                            title="Edit entry"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id, "cia", c.subject)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete entry"
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
        )}

        {/* ── SKILL ASSESSMENTS TABLE (SA) ── */}
        {activeViewTab === "sa" && (
          <div className="border border-slate-800 bg-slate-900/60 rounded-2xl overflow-hidden shadow-sm">
            {sa.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No Skill Assessments scheduled in database.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Evaluation Type</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Question Bank</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {sa.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{e.subject}</div>
                          {e.code && (
                            <span className="text-[10px] font-mono text-slate-400">{e.code}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded font-bold font-mono text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            {e.examType === "SKILL-ASSESSMENT-1"
                              ? "SA 1"
                              : e.examType === "SKILL-ASSESSMENT-2"
                                ? "SA 2"
                                : "Single-Day SA"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {formatDateTime(e.scheduledAt)}
                        </td>
                        <td className="py-3.5 px-4">
                          {e.questionBankUrl ? (
                            <a
                              href={e.questionBankUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1"
                            >
                              <span>CCBP Bank</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              e.isTentative
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {e.isTentative ? "Tentative" : "Confirmed"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setEditingEntry(e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors mr-1"
                            title="Edit entry"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(e.id, "ia", e.subject)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete entry"
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
        )}

        {/* ── IA EXAMS TABLE ── */}
        {activeViewTab === "ia" && (
          <div className="border border-slate-800 bg-slate-900/60 rounded-2xl overflow-hidden shadow-sm">
            {ia.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No IA examinations recorded in database.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Venue</th>
                      <th className="py-3 px-4">Question Bank</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {ia.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{e.subject}</div>
                          {e.code && (
                            <span className="text-[10px] font-mono text-slate-400">{e.code}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded font-bold font-mono text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {e.examType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {formatDateTime(e.scheduledAt)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">
                          {e.durationMins ? `${e.durationMins} min` : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">{e.venue || "—"}</td>
                        <td className="py-3.5 px-4">
                          {e.questionBankUrl ? (
                            <a
                              href={e.questionBankUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1"
                            >
                              <span>QB Link</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              e.isTentative
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {e.isTentative ? "Tentative" : "Confirmed"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setEditingEntry(e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors mr-1"
                            title="Edit entry"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(e.id, "ia", e.subject)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete entry"
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
        )}

        {/* ── SEMESTER END EXAMS TABLE (SEE) ── */}
        {activeViewTab === "see" && (
          <div className="border border-slate-800 bg-slate-900/60 rounded-2xl overflow-hidden shadow-sm">
            {see.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No Semester End Examinations recorded in database.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Exam Mode</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Venue</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {see.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{e.subject}</div>
                          {e.code && (
                            <span className="text-[10px] font-mono text-slate-400">{e.code}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded font-bold font-mono text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            {e.examType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {formatDateTime(e.scheduledAt)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">
                          {e.durationMins ? `${e.durationMins} min` : "—"}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">{e.venue || "—"}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              e.isTentative
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {e.isTentative ? "Tentative" : "Confirmed"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setEditingEntry(e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors mr-1"
                            title="Edit entry"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(e.id, "ia", e.subject)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete entry"
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
        )}
      </section>

      {/* ── EDIT EXAM MODAL (IA, SA, SEE) ── */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Pencil className="h-4 w-4 text-indigo-400" />
                <span>Edit {editingEntry.examType} Entry</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateExam} className="space-y-4 overflow-y-auto pr-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase">Subject</label>
                  {availableSubjects.length > 0 && (
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const [subName, subCode] = val.split("|||");
                        setEditingEntry({
                          ...editingEntry,
                          subject: subName,
                          code: subCode || editingEntry.code,
                        });
                      }}
                      className="text-[10px] bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-indigo-300 cursor-pointer"
                    >
                      <option value="">-- Choose Subject from Curriculum --</option>
                      {availableSubjects.map((s) => (
                        <option key={s.id} value={`${s.name}|||${s.code || ""}`}>
                          {s.name} {s.code ? `(${s.code})` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={editingEntry.subject}
                  onChange={(e) => setEditingEntry({ ...editingEntry, subject: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={toLocalDatetimeInput(editingEntry.scheduledAt)}
                    onChange={(e) =>
                      setEditingEntry({ ...editingEntry, scheduledAt: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase">Venue</label>
                  <input
                    type="text"
                    value={editingEntry.venue || ""}
                    onChange={(e) => setEditingEntry({ ...editingEntry, venue: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase">
                  Question Bank URL
                </label>
                <input
                  type="url"
                  value={editingEntry.questionBankUrl || ""}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, questionBankUrl: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase">
                  Syllabus Coverage
                </label>
                <textarea
                  rows={3}
                  value={editingEntry.syllabus || ""}
                  onChange={(e) => setEditingEntry({ ...editingEntry, syllabus: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-amber-300 font-medium">
                <input
                  type="checkbox"
                  checked={Boolean(editingEntry.isTentative)}
                  onChange={(e) =>
                    setEditingEntry({ ...editingEntry, isTentative: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-950 text-amber-500 h-4 w-4"
                />
                <span>Mark as Tentative (subject to revision)</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                >
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT CIA MODAL ── */}
      {editingCia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Pencil className="h-4 w-4 text-indigo-400" />
                <span>Edit {editingCia.component} Entry</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCia(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateCia} className="space-y-4 overflow-y-auto pr-1">
              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase">Subject</label>
                <input
                  type="text"
                  required
                  value={editingCia.subject}
                  onChange={(e) => setEditingCia({ ...editingCia, subject: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase">
                    Component
                  </label>
                  <select
                    value={editingCia.component}
                    onChange={(e) => setEditingCia({ ...editingCia, component: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    <option value="CIA-1">CIA 1</option>
                    <option value="CIA-2">CIA 2</option>
                    <option value="CIA-3">CIA 3</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={toLocalDatetimeInput(editingCia.scheduledAt)}
                    onChange={(e) => setEditingCia({ ...editingCia, scheduledAt: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase">
                  Assignment Topic
                </label>
                <textarea
                  rows={3}
                  value={editingCia.topic || ""}
                  onChange={(e) => setEditingCia({ ...editingCia, topic: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCia(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                >
                  {editSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
