"use client";

import { useCallback, useEffect, useState } from "react";
import { EntityTable } from "@/components/EntityTable";
import { CreateEditModal } from "@/components/CreateEditModal";

interface Post {
  id: string;
  body: string | null;
  type: string;
  visibility: string;
  createdAt: string;
  authorId: string;
  author: { displayName: string | null; username: string | null; role: string };
  _count: { comments: number };
  likeCount: number;
}

const TYPE_OPTS = ["TEXT", "IMAGE", "LINK", "POLL"].map((v) => ({ value: v, label: v }));
const VIS_OPTS = ["PUBLIC", "CONNECTIONS", "CAMPUS"].map((v) => ({ value: v, label: v }));

const VIS_COLORS: Record<string, string> = {
  PUBLIC: "text-emerald-400",
  CONNECTIONS: "text-amber-400",
  CAMPUS: "text-blue-400",
};

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [visFilter, setVisFilter] = useState("");
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (typeFilter) params.set("type", typeFilter);
    if (visFilter) params.set("visibility", visFilter);
    if (search) params.set("q", search);
    const res = await fetch(`/api/dev/posts?${params}`);
    const data = (await res.json()) as { posts: Post[]; total: number };
    setPosts(data.posts);
    setTotal(data.total);
    setLoading(false);
  }, [page, typeFilter, visFilter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/dev/posts", {
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

  async function handleDelete(p: Post) {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/dev/posts?id=${p.id}`, { method: "DELETE" });
    void load();
  }

  const COLUMNS = [
    {
      key: "content",
      label: "Content",
      render: (p: Post) => (
        <div className="max-w-[240px]">
          <p className="text-white truncate">
            {p.body?.slice(0, 80) ?? <span className="text-slate-600 italic">[no content]</span>}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            by {p.author.displayName ?? p.author.username}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (p: Post) => <span className="font-mono text-[10px] text-slate-400">{p.type}</span>,
    },
    {
      key: "visibility",
      label: "Visibility",
      render: (p: Post) => (
        <span
          className={`font-mono text-[10px] font-bold ${VIS_COLORS[p.visibility] ?? "text-slate-400"}`}
        >
          {p.visibility}
        </span>
      ),
    },
    {
      key: "_count",
      label: "💬 / ❤️",
      render: (p: Post) => (
        <span className="text-slate-500 text-[10px]">
          {p._count.comments} / {p.likeCount}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Posted",
      render: (p: Post) => new Date(p.createdAt).toLocaleDateString(),
    },
  ];

  const FIELDS = [
    { key: "authorId", label: "Author User ID", required: true, placeholder: "cuid..." },
    { key: "body", label: "Content (body)", type: "textarea" as const },
    { key: "type", label: "Type", type: "select" as const, options: TYPE_OPTS, required: true },
    {
      key: "visibility",
      label: "Visibility",
      type: "select" as const,
      options: VIS_OPTS,
      required: true,
    },
  ];

  return (
    <>
      <EntityTable
        title="Posts"
        data={posts}
        columns={COLUMNS}
        total={total}
        page={page}
        limit={20}
        onPageChange={setPage}
        onEdit={(p) => {
          setEditing(p);
          setForm({
            authorId: p.authorId,
            body: p.body ?? "",
            type: p.type,
            visibility: p.visibility,
          });
          setSaveError(null);
          setModalOpen(true);
        }}
        onDelete={handleDelete}
        onAdd={() => {
          setEditing(null);
          setForm({ type: "TEXT", visibility: "PUBLIC" });
          setSaveError(null);
          setModalOpen(true);
        }}
        addLabel="Create Post"
        loading={loading}
        filters={
          <>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search content…"
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
            >
              <option value="">All Types</option>
              {TYPE_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={visFilter}
              onChange={(e) => {
                setVisFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
            >
              <option value="">All Visibility</option>
              {VIS_OPTS.map((o) => (
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
        title={editing ? "Edit Post" : "Create Post"}
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
