"use client";

import { useEffect, useState } from "react";

interface CiaEntry {
  id: string;
  subject: string;
  component: string;
  scheduledAt: string;
  venue: string | null;
  notes: string | null;
  campus?: { name: string };
}

interface IaEntry {
  id: string;
  subject: string;
  examType: string;
  scheduledAt: string;
  durationMins: number | null;
  venue: string | null;
  syllabusUrl: string | null;
  notes: string | null;
  campus?: { name: string };
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SchedulesPage() {
  const [cia, setCia] = useState<CiaEntry[]>([]);
  const [ia, setIa] = useState<IaEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [entryType, setEntryType] = useState<"cia" | "ia">("cia");
  const [subject, setSubject] = useState("");
  const [component, setComponent] = useState("");
  const [examType, setExamType] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [venue, setVenue] = useState("");
  const [notes, setNotes] = useState("");
  const [durationMins, setDurationMins] = useState("");
  const [syllabusUrl, setSyllabusUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/schedules");
    if (res.ok) {
      const d = await res.json();
      setCia(d.cia ?? []);
      setIa(d.ia ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!subject.trim() || !scheduledAt) {
      setFormError("Subject and scheduled date are required.");
      return;
    }
    if (entryType === "cia" && !component.trim()) {
      setFormError("Component is required for CIA entries.");
      return;
    }
    if (entryType === "ia" && !examType.trim()) {
      setFormError("Exam type is required for IA entries.");
      return;
    }

    setSubmitting(true);
    const payload: Record<string, unknown> = {
      type: entryType,
      subject: subject.trim(),
      scheduledAt,
      venue: venue.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    if (entryType === "cia") {
      payload.component = component.trim();
    } else {
      payload.examType = examType.trim();
      if (durationMins) payload.durationMins = parseInt(durationMins, 10);
      if (syllabusUrl.trim()) payload.syllabusUrl = syllabusUrl.trim();
    }

    const res = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);

    if (res.ok) {
      setSubject("");
      setComponent("");
      setExamType("");
      setScheduledAt("");
      setVenue("");
      setNotes("");
      setDurationMins("");
      setSyllabusUrl("");
      await load();
    } else {
      const d = await res.json();
      setFormError((d as { error?: string }).error ?? "Failed to add entry.");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">CIA / IA Schedule</h1>

      {/* ── Add Entry Form ── */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Add Schedule Entry</h2>

        {/* Type toggle */}
        <div className="flex gap-2 mb-5">
          {(["cia", "ia"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setEntryType(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                entryType === t
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                maxLength={200}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Data Structures"
                required
              />
            </div>

            {entryType === "cia" ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Component <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={component}
                  onChange={(e) => setComponent(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. CIA-1, Model"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exam Type <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. IA-1, End Semester"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled At <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
              <input
                type="text"
                maxLength={200}
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Block A, Room 301"
              />
            </div>

            {entryType === "ia" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={360}
                    value={durationMins}
                    onChange={(e) => setDurationMins(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 90"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Syllabus URL
                  </label>
                  <input
                    type="url"
                    maxLength={500}
                    value={syllabusUrl}
                    onChange={(e) => setSyllabusUrl(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://…"
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              maxLength={500}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Optional notes…"
            />
          </div>

          {formError && <p className="text-sm text-red-600">{formError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Saving…" : `Add ${entryType.toUpperCase()} Entry`}
          </button>
        </form>
      </section>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <>
          {/* ── CIA Table ── */}
          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-3">Upcoming CIA Schedule</h2>
            {cia.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming CIA entries.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">Subject</th>
                      <th className="px-4 py-3 text-left">Component</th>
                      <th className="px-4 py-3 text-left">Date & Time</th>
                      <th className="px-4 py-3 text-left">Venue</th>
                      <th className="px-4 py-3 text-left">Campus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cia.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{entry.subject}</td>
                        <td className="px-4 py-3">
                          <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-0.5 rounded">
                            {entry.component}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {formatDateTime(entry.scheduledAt)}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{entry.venue ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {entry.campus?.name ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── IA Table ── */}
          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-3">Upcoming IA Exams</h2>
            {ia.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming IA exams.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">Subject</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Date & Time</th>
                      <th className="px-4 py-3 text-left">Duration</th>
                      <th className="px-4 py-3 text-left">Venue</th>
                      <th className="px-4 py-3 text-left">Campus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ia.map((exam) => (
                      <tr key={exam.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{exam.subject}</td>
                        <td className="px-4 py-3">
                          <span className="bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-0.5 rounded">
                            {exam.examType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {formatDateTime(exam.scheduledAt)}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {exam.durationMins ? `${exam.durationMins} min` : "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{exam.venue ?? "—"}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {exam.campus?.name ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
