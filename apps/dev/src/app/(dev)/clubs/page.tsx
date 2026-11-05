"use client";

import { useCallback, useEffect, useState } from "react";
import { EntityTable } from "@/components/EntityTable";
import { CreateEditModal } from "@/components/CreateEditModal";

interface Club {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  description?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  isActive: boolean;
  campusId: string;
  campus: { name: string; slug: string };
  institutionalEmail: string | null;
  createdAt: string;
  _count: { members: number };
}

const ROLE_OPTS = [
  { value: "MEMBER", label: "MEMBER" },
  { value: "PRESIDENT", label: "PRESIDENT" },
  { value: "VICE_PRESIDENT", label: "VICE_PRESIDENT" },
  { value: "OPERATIONAL_HEAD", label: "OPERATIONAL_HEAD" },
  { value: "OUTREACH_HEAD", label: "OUTREACH_HEAD" },
  { value: "FINANCE_HEAD", label: "FINANCE_HEAD" },
  { value: "CREATIVE_DESIGN_HEAD", label: "CREATIVE_DESIGN_HEAD" },
  { value: "SOCIAL_MEDIA_HEAD", label: "SOCIAL_MEDIA_HEAD" },
  { value: "MANAGER", label: "MANAGER" },
];

// Members sub-panel
interface ClubMember {
  id: string;
  userId: string;
  role: string;
  isActive: boolean;
  user: { displayName: string | null; username: string | null };
  joinedAt: string;
}

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [campusFilter, setCampusFilter] = useState("");
  const [campuses, setCampuses] = useState<{ id: string; name: string; city: string }[]>([]);

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

  const fields = [
    { key: "name", label: "Club Name", required: true },
    { key: "slug", label: "Slug", required: true, placeholder: "arts-club" },
    {
      key: "campusId",
      label: "Campus",
      type: "searchable-select" as const,
      required: true,
      placeholder: "Search or select campus…",
      options: campuses.map((c) => ({
        value: c.id,
        label: `${c.name} (${c.city})`,
      })),
    },
    { key: "description", label: "Description", type: "textarea" as const },
    { key: "category", label: "Category", placeholder: "Technology, Arts, Sports…" },
    { key: "institutionalEmail", label: "Institutional Email" },
    { key: "logoUrl", label: "Logo URL" },
    { key: "bannerUrl", label: "Banner URL" },
    { key: "isActive", label: "Active", type: "boolean" as const },
  ];

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Club | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Members panel
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("q", search);
    if (campusFilter) params.set("campusId", campusFilter);
    const res = await fetch(`/api/dev/clubs?${params}`);
    const data = (await res.json()) as { clubs: Club[]; total: number };
    setClubs(data.clubs);
    setTotal(data.total);
    setLoading(false);
  }, [page, search, campusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadMembers(club: Club) {
    setSelectedClub(club);
    setMembersLoading(true);
    const res = await fetch(`/api/dev/clubs/members?clubId=${club.id}`);
    const data = (await res.json()) as { members: ClubMember[] };
    setMembers(data.members ?? []);
    setMembersLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/dev/clubs", {
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

  async function handleDelete(c: Club) {
    if (!confirm(`Delete club "${c.name}"?`)) return;
    await fetch(`/api/dev/clubs?id=${c.id}`, { method: "DELETE" });
    void load();
  }

  async function changeMemberRole(memberId: string, newRole: string) {
    await fetch("/api/dev/clubs/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: memberId, role: newRole }),
    });
    if (selectedClub) void loadMembers(selectedClub);
  }

  async function removeMember(memberId: string) {
    await fetch("/api/dev/clubs/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: memberId, isActive: false }),
    });
    if (selectedClub) void loadMembers(selectedClub);
  }

  const COLUMNS = [
    {
      key: "name",
      label: "Club",
      render: (c: Club) => (
        <div>
          <p className="text-white font-medium">{c.name}</p>
          <p className="text-[10px] text-slate-500 font-mono">{c.slug}</p>
        </div>
      ),
    },
    { key: "campus", label: "Campus", render: (c: Club) => c.campus?.name ?? "—" },
    {
      key: "category",
      label: "Category",
      render: (c: Club) => c.category ?? <span className="text-slate-600">—</span>,
    },
    {
      key: "isActive",
      label: "Active",
      render: (c: Club) =>
        c.isActive ? (
          <span className="text-emerald-400">●</span>
        ) : (
          <span className="text-slate-600">○</span>
        ),
    },
    { key: "_count", label: "Members", render: (c: Club) => c._count.members },
    {
      key: "members",
      label: "Manage",
      render: (c: Club) => (
        <button
          onClick={() => void loadMembers(c)}
          className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold transition-colors"
        >
          Members →
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <EntityTable
        title="Clubs"
        data={clubs}
        columns={COLUMNS}
        total={total}
        page={page}
        limit={20}
        onPageChange={setPage}
        onEdit={(c) => {
          setEditing(c);
          setForm({
            name: c.name,
            slug: c.slug,
            description: c.description ?? "",
            category: c.category ?? "General",
            campusId: c.campusId,
            logoUrl: c.logoUrl ?? "",
            bannerUrl: c.bannerUrl ?? "",
            institutionalEmail: c.institutionalEmail ?? "",
            isActive: c.isActive ?? true,
          });
          setSaveError(null);
          setModalOpen(true);
        }}
        onDelete={handleDelete}
        onAdd={() => {
          setEditing(null);
          setForm({ isActive: true });
          setSaveError(null);
          setModalOpen(true);
        }}
        addLabel="Add Club"
        loading={loading}
        filters={
          <>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search clubs…"
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            <select
              value={campusFilter}
              onChange={(e) => {
                setCampusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
            >
              <option value="">All Campuses</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </>
        }
      />

      {/* Members Sub-Panel */}
      {selectedClub && (
        <div className="bg-slate-900 border border-amber-500/20 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-amber-500/5">
            <div>
              <p className="text-xs font-bold text-white">Members — {selectedClub.name}</p>
              <p className="text-[10px] text-slate-500">
                Click role to change · Remove deactivates membership
              </p>
            </div>
            <button
              onClick={() => setSelectedClub(null)}
              className="text-slate-500 hover:text-white text-xs"
            >
              ✕ Close
            </button>
          </div>
          <div className="divide-y divide-slate-800/60">
            {membersLoading ? (
              <p className="px-4 py-3 text-xs text-slate-600">Loading members…</p>
            ) : members.length === 0 ? (
              <p className="px-4 py-3 text-xs text-slate-600">No members found.</p>
            ) : (
              members.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-xs font-medium text-white">
                      {m.user.displayName ?? m.user.username ?? "Unknown"}
                    </p>
                    <p className="text-[10px] text-slate-500">@{m.user.username}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={m.role}
                      onChange={(e) => void changeMemberRole(m.id, e.target.value)}
                      className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[10px] text-amber-400 font-bold focus:outline-none"
                    >
                      {ROLE_OPTS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => void removeMember(m.id)}
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <CreateEditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit: ${editing.name}` : "Create Club"}
        fields={fields}
        values={form}
        onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))}
        onSubmit={handleSave}
        loading={saving}
        error={saveError}
      />
    </div>
  );
}
