"use client";

import { useCallback, useEffect, useState } from "react";
import { EntityTable } from "@/components/EntityTable";
import { CreateEditModal } from "@/components/CreateEditModal";

interface Campus {
  id: string;
  name: string;
  slug: string;
  universityName: string | null;
  emailDomain: string | null;
  city: string;
  state: string;
  country: string;
  address?: string | null;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  createdAt: string;
  _count: { users: number; clubs: number };
}

const FIELDS = [
  { key: "name", label: "Campus Name", required: true },
  { key: "slug", label: "Slug", required: true, placeholder: "niat-chennai" },
  { key: "universityName", label: "University Name" },
  { key: "emailDomain", label: "Email Domain", placeholder: "niat.ac.in" },
  { key: "city", label: "City", required: true },
  { key: "state", label: "State", required: true },
  { key: "country", label: "Country" },
  { key: "address", label: "Address", type: "textarea" as const },
  { key: "websiteUrl", label: "Website URL" },
  { key: "logoUrl", label: "Logo URL" },
];

export default function CampusesPage() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Campus | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    const res = await fetch(`/api/dev/campuses?${params}`);
    const data = (await res.json()) as { campuses: Campus[] };
    setCampuses(data.campuses);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ country: "India" });
    setSaveError(null);
    setModalOpen(true);
  }

  function openEdit(c: Campus) {
    setEditing(c);
    setForm({
      name: c.name,
      slug: c.slug,
      universityName: c.universityName ?? "",
      emailDomain: c.emailDomain ?? "",
      city: c.city,
      state: c.state,
      country: c.country,
      address: c.address ?? "",
      websiteUrl: c.websiteUrl ?? "",
      logoUrl: c.logoUrl ?? "",
    });
    setSaveError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/dev/campuses", {
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

  async function handleDelete(c: Campus) {
    if (!confirm(`Delete campus "${c.name}"? This will cascade-delete related data.`)) return;
    await fetch(`/api/dev/campuses?id=${c.id}`, { method: "DELETE" });
    void load();
  }

  const COLUMNS = [
    {
      key: "name",
      label: "Name",
      render: (c: Campus) => <span className="text-white font-medium">{c.name}</span>,
    },
    {
      key: "slug",
      label: "Slug",
      render: (c: Campus) => <span className="font-mono text-[10px] text-amber-400">{c.slug}</span>,
    },
    {
      key: "universityName",
      label: "University",
      render: (c: Campus) => c.universityName ?? <span className="text-slate-600">—</span>,
    },
    {
      key: "emailDomain",
      label: "Email Domain",
      render: (c: Campus) => c.emailDomain ?? <span className="text-slate-600">—</span>,
    },
    { key: "city", label: "Location", render: (c: Campus) => `${c.city}, ${c.state}` },
    {
      key: "_count",
      label: "Users / Clubs",
      render: (c: Campus) => (
        <span className="text-slate-500 text-[10px]">
          {c._count.users} users · {c._count.clubs} clubs
        </span>
      ),
    },
  ];

  return (
    <>
      <EntityTable
        title="Campuses"
        data={campuses}
        columns={COLUMNS}
        total={campuses.length}
        page={1}
        limit={campuses.length || 1}
        onPageChange={() => {}}
        onEdit={openEdit}
        onDelete={handleDelete}
        onAdd={openCreate}
        addLabel="Add Campus"
        loading={loading}
        filters={
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campuses…"
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        }
      />

      <CreateEditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit: ${editing.name}` : "Create Campus"}
        fields={FIELDS}
        values={form}
        onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))}
        onSubmit={handleSave}
        loading={saving}
        error={saveError}
        submitLabel={editing ? "Save Changes" : "Create Campus"}
      />
    </>
  );
}
