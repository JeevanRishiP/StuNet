"use client";

import { useCallback, useEffect, useState } from "react";
import { EntityTable } from "@/components/EntityTable";
import { CreateEditModal } from "@/components/CreateEditModal";

type ScheduleType = "cia" | "ia" | "calendar";

interface ScheduleItem {
  id: string;
  subject?: string;
  title?: string;
  component?: string;
  examType?: string;
  scheduledAt?: string;
  eventDate?: string;
  endDate?: string;
  venue?: string | null;
  notes?: string | null;
  durationMins?: number | null;
  eventType?: string;
  campusId: string;
  campus: { name: string };
}

const CIA_FIELDS = [
  { key: "campusId", label: "Campus ID", required: true, placeholder: "cuid..." },
  {
    key: "component",
    label: "Component",
    type: "select" as const,
    options: ["CIA-1", "CIA-2", "Model", "Assignment", "Seminar"].map((v) => ({
      value: v,
      label: v,
    })),
    required: true,
  },
  { key: "subject", label: "Subject", required: true },
  { key: "scheduledAt", label: "Scheduled At (YYYY-MM-DD or ISO)", required: true },
  { key: "venue", label: "Venue (optional)" },
  { key: "notes", label: "Notes", type: "textarea" as const },
];

const IA_FIELDS = [
  { key: "campusId", label: "Campus ID", required: true, placeholder: "cuid..." },
  {
    key: "examType",
    label: "Exam Type",
    type: "select" as const,
    options: ["IA-1", "IA-2", "End Semester", "Lab Exam"].map((v) => ({ value: v, label: v })),
    required: true,
  },
  { key: "subject", label: "Subject", required: true },
  { key: "scheduledAt", label: "Scheduled At (YYYY-MM-DD or ISO)", required: true },
  { key: "durationMins", label: "Duration (minutes)", placeholder: "90" },
  { key: "venue", label: "Venue (optional)" },
  { key: "notes", label: "Notes", type: "textarea" as const },
];

const CAL_FIELDS = [
  { key: "campusId", label: "Campus ID", required: true, placeholder: "cuid..." },
  { key: "title", label: "Title", required: true },
  {
    key: "eventType",
    label: "Event Type",
    type: "select" as const,
    options: ["holiday", "fest", "workshop", "academic", "sports", "other"].map((v) => ({
      value: v,
      label: v,
    })),
    required: true,
  },
  { key: "eventDate", label: "Start Date (YYYY-MM-DD)", required: true },
  { key: "endDate", label: "End Date (YYYY-MM-DD, optional)" },
  { key: "description", label: "Description", type: "textarea" as const },
];

export default function SchedulesPage() {
  const [scheduleType, setScheduleType] = useState<ScheduleType>("cia");
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [campuses, setCampuses] = useState<{ id: string; name: string; city: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCampuses() {
      try {
        const res = await fetch("/api/dev/campuses");
        const data = (await res.json()) as {
          campuses: { id: string; name: string; city: string }[];
        };
        setCampuses(data.campuses ?? []);
      } catch {
        // ignore
      }
    }
    void loadCampuses();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/dev/schedules?type=${scheduleType}`);
    const data = (await res.json()) as { items: ScheduleItem[] };
    setItems(data.items || []);
    setLoading(false);
  }, [scheduleType]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/dev/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, type: scheduleType }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error: string; detail?: string };
        setSaveError(err.detail ?? err.error);
        return;
      }
      setModalOpen(false);
      void load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: ScheduleItem) {
    if (!confirm("Delete this schedule entry?")) return;
    await fetch(`/api/dev/schedules?id=${item.id}&type=${scheduleType}`, { method: "DELETE" });
    void load();
  }

  const campusField = {
    key: "campusId",
    label: "Campus",
    type: "searchable-select" as const,
    required: true,
    placeholder: "Search or select campus…",
    options: campuses.map((c) => ({
      value: c.id,
      label: `${c.name} (${c.city})`,
    })),
  };

  const getFields = () => {
    if (scheduleType === "ia") return [campusField, ...IA_FIELDS.slice(1)];
    if (scheduleType === "calendar") return [campusField, ...CAL_FIELDS.slice(1)];
    return [campusField, ...CIA_FIELDS.slice(1)];
  };

  const COLUMNS: {
    key: string;
    label: string;
    render?: (item: ScheduleItem) => React.ReactNode;
  }[] = [
    { key: "campus", label: "Campus", render: (i) => i.campus?.name ?? "—" },
    ...(scheduleType === "cia"
      ? [
          {
            key: "component",
            label: "Component",
            render: (i: ScheduleItem) => (
              <span className="font-mono text-amber-400 text-xs">{i.component}</span>
            ),
          },
          {
            key: "subject",
            label: "Subject",
            render: (i: ScheduleItem) => (
              <span className="text-white font-medium">{i.subject}</span>
            ),
          },
          {
            key: "venue",
            label: "Venue",
            render: (i: ScheduleItem) => (
              <span className="text-slate-400 text-xs">{i.venue ?? "—"}</span>
            ),
          },
          {
            key: "scheduledAt",
            label: "Scheduled At",
            render: (i: ScheduleItem) =>
              i.scheduledAt ? new Date(i.scheduledAt).toLocaleDateString() : "—",
          },
        ]
      : scheduleType === "ia"
        ? [
            {
              key: "examType",
              label: "Exam Type",
              render: (i: ScheduleItem) => (
                <span className="font-mono text-amber-400 text-xs">{i.examType}</span>
              ),
            },
            {
              key: "subject",
              label: "Subject",
              render: (i: ScheduleItem) => (
                <span className="text-white font-medium">{i.subject}</span>
              ),
            },
            {
              key: "venue",
              label: "Venue",
              render: (i: ScheduleItem) => (
                <span className="text-slate-400 text-xs">{i.venue ?? "—"}</span>
              ),
            },
            {
              key: "durationMins",
              label: "Duration",
              render: (i: ScheduleItem) => (
                <span className="text-slate-400 text-xs">
                  {i.durationMins ? `${i.durationMins}m` : "—"}
                </span>
              ),
            },
            {
              key: "scheduledAt",
              label: "Date",
              render: (i: ScheduleItem) =>
                i.scheduledAt ? new Date(i.scheduledAt).toLocaleDateString() : "—",
            },
          ]
        : [
            {
              key: "title",
              label: "Title",
              render: (i: ScheduleItem) => (
                <span className="text-white font-medium">{i.title}</span>
              ),
            },
            {
              key: "eventType",
              label: "Type",
              render: (i: ScheduleItem) => (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {i.eventType}
                </span>
              ),
            },
            {
              key: "eventDate",
              label: "Date",
              render: (i: ScheduleItem) =>
                i.eventDate ? new Date(i.eventDate).toLocaleDateString() : "—",
            },
          ]),
  ];

  return (
    <div className="space-y-4">
      {/* Type tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
        {(["cia", "ia", "calendar"] as ScheduleType[]).map((t) => (
          <button
            key={t}
            onClick={() => setScheduleType(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${scheduleType === t ? "bg-amber-500 text-slate-950" : "text-slate-500 hover:text-white"}`}
          >
            {t === "cia" ? "CIA Schedules" : t === "ia" ? "IA Exams" : "Campus Calendar"}
          </button>
        ))}
      </div>

      <EntityTable
        title={
          scheduleType === "cia"
            ? "CIA Schedules"
            : scheduleType === "ia"
              ? "IA Exams"
              : "Campus Calendar"
        }
        data={items}
        columns={COLUMNS}
        total={items.length}
        page={1}
        limit={items.length || 1}
        onPageChange={() => {}}
        onDelete={handleDelete}
        onAdd={() => {
          setForm({});
          setSaveError(null);
          setModalOpen(true);
        }}
        addLabel="Add Entry"
        loading={loading}
      />

      <CreateEditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Add ${scheduleType === "cia" ? "CIA Schedule" : scheduleType === "ia" ? "IA Exam" : "Calendar Event"}`}
        fields={getFields()}
        values={form}
        onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))}
        onSubmit={handleSave}
        loading={saving}
        error={saveError}
      />
    </div>
  );
}
