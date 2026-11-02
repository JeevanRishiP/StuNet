"use client";

/**
 * Campus Marketplace — /marketplace
 * Lists active campus listings. Block-filtered server-side.
 * Report button wired into each listing.
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";

interface Listing {
  id: string;
  title: string;
  description: string;
  priceInr: string; // Decimal comes as string from JSON
  condition: string;
  createdAt: string;
  sellerId: string;
  seller: { displayName: string | null; username: string | null; avatarUrl: string | null };
  images: { url: string; altText: string | null }[];
}

export default function MarketplacePage() {
  const { data: session } = useSession();
  const [listings, setListings] = useState<Listing[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priceInr: "",
    condition: "GOOD" as string,
  });
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const params = new URLSearchParams({ limit: "20" });
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/marketplace?${params.toString()}`);
    if (res.ok) {
      const data: { listings: Listing[]; nextCursor: string | null } = await res.json();
      setListings((prev) => [...prev, ...data.listings]);
      setCursor(data.nextCursor);
      setHasMore(data.nextCursor !== null);
    }
    setLoading(false);
  }, [loading, hasMore, cursor]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { threshold: 0.1 },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [loadMore]);

  useEffect(() => {
    loadMore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePost() {
    setPosting(true);
    setPostError(null);
    const res = await fetch("/api/marketplace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title.trim(),
        description: form.description.trim(),
        priceInr: parseFloat(form.priceInr),
        condition: form.condition,
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ title: "", description: "", priceInr: "", condition: "GOOD" });
      // Refresh from top
      setListings([]);
      setCursor(null);
      setHasMore(true);
    } else if (res.status === 429) {
      setPostError("Listing limit reached — up to 5 listings per day.");
    } else {
      const body = await res.json().catch(() => ({}));
      setPostError((body as { error?: string }).error ?? "Failed to post listing.");
    }
    setPosting(false);
  }

  async function handleReport(listingId: string) {
    const reason = window.prompt(
      "Report reason:\nSPAM | HARASSMENT | HATE_SPEECH | MISINFORMATION | INAPPROPRIATE_CONTENT | IMPERSONATION | OTHER",
    );
    if (!reason) return;
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentType: "MARKET_LISTING",
        listingId,
        reason: reason.toUpperCase(),
      }),
    });
    if (res.ok) alert("Report submitted. Thank you.");
    else if (res.status === 429) alert("Too many reports — please wait.");
    else alert("Failed to submit report.");
  }

  const conditionLabel: Record<string, string> = {
    NEW: "New",
    LIKE_NEW: "Like New",
    GOOD: "Good",
    FAIR: "Fair",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Campus Marketplace</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "+ List item"}
        </button>
      </div>

      {/* Post form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">New Listing</h2>
          {postError && <p className="text-red-500 text-xs">{postError}</p>}
          <input
            type="text"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            maxLength={200}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            maxLength={2000}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-3">
            <input
              type="number"
              placeholder="Price (₹)"
              value={form.priceInr}
              onChange={(e) => setForm((f) => ({ ...f, priceInr: e.target.value }))}
              min={0}
              max={100000}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={form.condition}
              onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {Object.entries(conditionLabel).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handlePost}
            disabled={posting || !form.title.trim() || !form.priceInr}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-blue-700"
          >
            {posting ? "Posting…" : "Post listing"}
          </button>
        </div>
      )}

      {/* Listings */}
      <div className="grid gap-4 sm:grid-cols-2">
        {listings.map((l) => (
          <div
            key={l.id}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-2"
          >
            {/* Image */}
            {l.images[0] && (
              <div className="w-full h-40 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={l.images[0].url}
                  alt={l.images[0].altText ?? l.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{l.title}</p>
                <p className="text-xs text-gray-500">
                  {conditionLabel[l.condition]} · ₹{parseFloat(l.priceInr).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  by {l.seller.displayName ?? l.seller.username}
                </p>
              </div>
              {/* Report — only for other users' listings */}
              {l.sellerId !== session?.user?.id && (
                <button
                  onClick={() => handleReport(l.id)}
                  className="text-xs text-gray-400 hover:text-red-500 flex-shrink-0"
                >
                  Report
                </button>
              )}
            </div>

            <p className="text-sm text-gray-600 line-clamp-2">{l.description}</p>
          </div>
        ))}
      </div>

      <div ref={sentinelRef} className="h-4" />
      {loading && <p className="text-center text-sm text-gray-400 py-4">Loading…</p>}
      {!hasMore && listings.length > 0 && (
        <p className="text-center text-sm text-gray-400 py-4">All listings shown.</p>
      )}
    </div>
  );
}
