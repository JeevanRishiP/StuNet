"use client";

import { useCallback, useEffect, useState } from "react";
import { EntityTable } from "@/components/EntityTable";
import { CreateEditModal } from "@/components/CreateEditModal";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

interface Achievement {
  id: string;
  title: string;
  category: string;
  scope: string;
  verificationStatus: string;
  proofUrl: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  userId: string;
  user: { displayName: string | null; username: string | null };
  verifiedBy: { displayName: string | null } | null;
}

const CATEGORY_OPTS = [
  "COMPETITIVE_PROGRAMMING",
  "OPEN_SOURCE",
  "RESEARCH",
  "HACKATHON",
  "CERTIFICATION",
  "SPORTS",
  "CULTURAL",
  "ACADEMIC",
  "OTHER",
].map((v) => ({ value: v, label: v }));

const SCOPE_OPTS = ["CAMPUS", "INTER_COLLEGE", "STATE", "NATIONAL", "INTERNATIONAL"].map((v) => ({
  value: v,
  label: v,
}));
const STATUS_OPTS = ["PENDING", "VERIFIED", "REJECTED"].map((v) => ({ value: v, label: v }));

const STATUS_ICON = {
  VERIFIED: <CheckCircle2 className="h-3 w-3 text-emerald-400" />,
  PENDING: <Clock className="h-3 w-3 text-amber-400" />,
  REJECTED: <XCircle className="h-3 w-3 text-rose-400" />,
};

const FIELDS = [
  { key: "userId", label: "User ID", required: true, placeholder: "cuid..." },
  { key: "title", label: "Title", required: true },
  { key: "description", label: "Description", type: "textarea" as const },
  {
    key: "category",
    label: "Category",
    type: "select" as const,
    options: CATEGORY_OPTS,
    required: true,
  },
  { key: "scope", label: "Scope", type: "select" as const, options: SCOPE_OPTS, required: true },
  { key: "verificationStatus", label: "Status", type: "select" as const, options: STATUS_OPTS },
  { key: "proofUrl", label: "Proof URL" },
  { key: "verifiedById", label: "Verified By (User ID)" },
];

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Achievement | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (statusFilter) params.set("status", statusFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    const res = await fetch(`/api/dev/achievements?${params}`);
    const data = (await res.json()) as { achievements: Achievement[]; total: number };
    setAchievements(data.achievements);
    setTotal(data.total);
    setLoading(false);
  }, [page, statusFilter, categoryFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function quickVerify(a: Achievement, status: "VERIFIED" | "REJECTED") {
    await fetch("/api/dev/achievements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, verificationStatus: status }),
    });
    void load();
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/dev/achievements", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { ...form, id: editing.id } : form),
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

  async function handleDelete(a: Achievement) {
    if (!confirm(`Delete achievement "${a.title}"?`)) return;
    await fetch(`/api/dev/achievements?id=${a.id}`, { method: "DELETE" });
    void load();
  }

  const COLUMNS = [
    {
      key: "title",
      label: "Title",
      render: (a: Achievement) => (
        <div>
          <p className="text-white font-medium truncate max-w-[200px]">{a.title}</p>
          <p className="text-[10px] text-slate-500">{a.user.displayName ?? a.user.username}</p>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (a: Achievement) => <span className="text-[10px] text-slate-400">{a.category}</span>,
    },
    {
      key: "scope",
      label: "Scope",
      render: (a: Achievement) => <span className="text-[10px] text-slate-400">{a.scope}</span>,
    },
    {
      key: "verificationStatus",
      label: "Status",
      render: (a: Achievement) => (
        <div className="flex items-center gap-1">
          {STATUS_ICON[a.verificationStatus as keyof typeof STATUS_ICON]}
          <span className="text-[10px]">{a.verificationStatus}</span>
        </div>
      ),
    },
    {
      key: "quick",
      label: "Quick",
      render: (a: Achievement) =>
        a.verificationStatus === "PENDING" ? (
          <div className="flex gap-1">
            <button
              onClick={() => void quickVerify(a, "VERIFIED")}
              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold"
            >
              ✓ Verify
            </button>
            <button
              onClick={() => void quickVerify(a, "REJECTED")}
              className="text-[10px] text-rose-400 hover:text-rose-300 font-bold ml-1"
            >
              ✗ Reject
            </button>
          </div>
        ) : null,
    },
    {
      key: "createdAt",
      label: "Submitted",
      render: (a: Achievement) => new Date(a.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <>
      <EntityTable
        title="Achievements"
        data={achievements}
        columns={COLUMNS}
        total={total}
        page={page}
        limit={20}
        onPageChange={setPage}
        onEdit={(a) => {
          setEditing(a);
          setForm({
            title: a.title,
            userId: a.userId,
            category: a.category,
            scope: a.scope,
            proofUrl: a.proofUrl ?? "",
            verificationStatus: a.verificationStatus,
            rejectionReason: a.rejectionReason ?? "",
          });
          setSaveError(null);
          setModalOpen(true);
        }}
        onDelete={handleDelete}
        onAdd={() => {
          setEditing(null);
          setForm({ verificationStatus: "PENDING", scope: "NATIONAL", category: "HACKATHON" });
          setSaveError(null);
          setModalOpen(true);
        }}
        addLabel="Add Achievement"
        loading={loading}
        filters={
          <>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
            >
              <option value="">All Categories</option>
              {CATEGORY_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </>
        }
      />
      <CreateEditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit: ${editing.title}` : "Add Achievement"}
        fields={FIELDS}
        values={form}
        onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))}
        onSubmit={handleSave}
        loading={saving}
        error={saveError}
      />
    </>
  );
}
