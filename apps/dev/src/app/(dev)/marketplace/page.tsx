"use client";

import { useCallback, useEffect, useState } from "react";
import { EntityTable } from "@/components/EntityTable";

interface Listing {
  id: string;
  title: string;
  priceInr: string;
  condition: string;
  status: string;
  createdAt: string;
  seller: { displayName: string | null; username: string | null };
  images: { url: string }[];
}

const STATUS_OPTS = ["ACTIVE", "SOLD", "FLAGGED", "REMOVED"].map((v) => ({ value: v, label: v }));

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "text-emerald-400",
  SOLD: "text-slate-500",
  FLAGGED: "text-amber-400",
  REMOVED: "text-rose-400",
};

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/dev/marketplace?${params}`);
    const data = (await res.json()) as { listings: Listing[]; total: number };
    setListings(data.listings);
    setTotal(data.total);
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeStatus(id: string, status: string) {
    await fetch("/api/dev/marketplace", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    void load();
  }

  async function handleDelete(l: Listing) {
    if (!confirm(`Delete listing "${l.title}"?`)) return;
    await fetch(`/api/dev/marketplace?id=${l.id}`, { method: "DELETE" });
    void load();
  }

  const COLUMNS = [
    {
      key: "title",
      label: "Listing",
      render: (l: Listing) => (
        <div className="flex items-center gap-2">
          {l.images[0] && (
            <img
              src={l.images[0].url}
              alt=""
              className="h-8 w-8 rounded-lg object-cover border border-slate-700"
            />
          )}
          <div>
            <p className="text-white font-medium truncate max-w-[180px]">{l.title}</p>
            <p className="text-[10px] text-slate-500">
              {l.seller.displayName ?? l.seller.username}
            </p>
          </div>
        </div>
      ),
    },
    { key: "priceInr", label: "Price (₹)", render: (l: Listing) => `₹${l.priceInr}` },
    {
      key: "condition",
      label: "Condition",
      render: (l: Listing) => <span className="text-[10px] text-slate-400">{l.condition}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (l: Listing) => (
        <select
          value={l.status}
          onChange={(e) => void changeStatus(l.id, e.target.value)}
          className={`bg-transparent border-0 text-[10px] font-bold focus:outline-none cursor-pointer ${STATUS_COLORS[l.status] ?? "text-slate-400"}`}
        >
          {STATUS_OPTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "createdAt",
      label: "Listed",
      render: (l: Listing) => new Date(l.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <EntityTable
      title="Marketplace Listings"
      data={listings}
      columns={COLUMNS}
      total={total}
      page={page}
      limit={20}
      onPageChange={setPage}
      onDelete={handleDelete}
      loading={loading}
      filters={
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
      }
    />
  );
}
