"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  ShoppingBag,
  Plus,
  Tag,
  Flag,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  Input,
  Modal,
  Textarea,
} from "@stunet/ui";

interface Listing {
  id: string;
  title: string;
  description: string;
  priceInr: string;
  condition: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR";
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
  const [initialLoading, setInitialLoading] = useState(true);

  // New Listing Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priceInr: "",
    condition: "GOOD" as "NEW" | "LIKE_NEW" | "GOOD" | "FAIR",
  });
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // Contact Seller Modal state
  const [contactSellerListing, setContactSellerListing] = useState<Listing | null>(null);

  // Report Modal state
  const [reportingListingId, setReportingListingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("SPAM");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || (!hasMore && cursor !== null)) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/marketplace?${params.toString()}`);
      if (res.ok) {
        const data: { listings: Listing[]; nextCursor: string | null } = await res.json();
        setListings((prev) => {
          const ids = new Set(prev.map((l) => l.id));
          return [...prev, ...data.listings.filter((l) => !ids.has(l.id))];
        });
        setCursor(data.nextCursor);
        setHasMore(data.nextCursor !== null);
      }
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateListing() {
    if (!form.title.trim() || !form.priceInr) return;
    setPosting(true);
    setPostError(null);
    try {
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
        setIsCreateOpen(false);
        setForm({ title: "", description: "", priceInr: "", condition: "GOOD" });
        setListings([]);
        setCursor(null);
        setHasMore(true);
        loadMore();
      } else if (res.status === 429) {
        setPostError("Listing limit reached — maximum 5 listings per day.");
      } else {
        const body = await res.json().catch(() => ({}));
        setPostError((body as { error?: string }).error ?? "Failed to post listing.");
      }
    } finally {
      setPosting(false);
    }
  }

  async function handleSubmitReport() {
    if (!reportingListingId) return;
    setSubmittingReport(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: "MARKET_LISTING",
          listingId: reportingListingId,
          reason: reportReason,
          details: reportDetails.trim() || undefined,
        }),
      });
      if (res.ok) {
        setReportSuccess(true);
        setTimeout(() => {
          setReportingListingId(null);
          setReportSuccess(false);
          setReportDetails("");
        }, 1500);
      } else {
        alert("Failed to submit report. Please try again.");
      }
    } finally {
      setSubmittingReport(false);
    }
  }

  const conditionBadges: Record<
    string,
    { label: string; variant: "verified" | "campus" | "default" | "secondary" }
  > = {
    NEW: { label: "Brand New", variant: "verified" },
    LIKE_NEW: { label: "Like New", variant: "campus" },
    GOOD: { label: "Good Condition", variant: "default" },
    FAIR: { label: "Fair / Used", variant: "secondary" },
  };

  return (
    <div className="space-y-6">
      {/* Banner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-6 sm:p-8 text-white shadow-md">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:12px_12px]" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="max-w-md">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm mb-3">
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Campus Classifieds</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Peer-to-Peer Marketplace
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-teal-100">
              Buy and sell engineering textbooks, notes, lab gear, bicycles, and electronics within
              your verified campus.
            </p>
          </div>

          <Button
            variant="default"
            size="lg"
            onClick={() => setIsCreateOpen(true)}
            className="bg-white text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900 shadow-lg shrink-0 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>List an Item</span>
          </Button>
        </div>
      </div>

      {/* Initial Loading Skeletons */}
      {initialLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 space-y-3">
              <div className="h-40 rounded-xl bg-slate-200 shimmer" />
              <div className="h-4 w-3/4 rounded bg-slate-200 shimmer" />
              <div className="h-3 w-1/2 rounded bg-slate-100 shimmer" />
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!initialLoading && listings.length === 0 && (
        <Card className="p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3">
            <ShoppingBag className="h-7 w-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No active listings right now</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Got extra textbooks, lab coats, or electronics? Click &quot;List an Item&quot; to post
            for your peers!
          </p>
        </Card>
      )}

      {/* Listings Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {listings.map((item) => {
          const isOwner = item.sellerId === session?.user?.id;
          const conditionInfo = conditionBadges[item.condition] || {
            label: item.condition,
            variant: "secondary",
          };

          return (
            <Card
              key={item.id}
              className="overflow-hidden border-slate-200/90 shadow-sm transition-all hover:border-slate-300 hover:shadow-md flex flex-col justify-between"
            >
              <div>
                {/* Image / Thumbnail placeholder */}
                <div className="relative h-44 w-full bg-slate-100 flex items-center justify-center overflow-hidden">
                  {item.images[0] ? (
                    <img
                      src={item.images[0].url}
                      alt={item.images[0].altText ?? item.title}
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                      <Tag className="h-8 w-8 text-slate-300" />
                      <span className="text-[11px] font-medium text-slate-400">
                        Campus Classified
                      </span>
                    </div>
                  )}

                  {/* Price Tag Badge */}
                  <div className="absolute top-3 left-3 rounded-xl bg-slate-900/80 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-md">
                    ₹{parseFloat(item.priceInr).toLocaleString("en-IN")}
                  </div>

                  {/* Condition Badge */}
                  <div className="absolute top-3 right-3">
                    <Badge variant={conditionInfo.variant} className="shadow-xs text-[10px]">
                      {conditionInfo.label}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className="text-sm font-bold text-slate-900 line-clamp-1"
                      title={item.title}
                    >
                      {item.title}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Seller info */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <Avatar
                      src={item.seller.avatarUrl}
                      name={item.seller.displayName ?? item.seller.username}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {item.seller.displayName ?? item.seller.username}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">Verified Seller</p>
                    </div>
                  </div>
                </CardContent>
              </div>

              {/* Action Footer */}
              <CardFooter className="p-4 pt-0 border-t border-slate-100/60 flex items-center justify-between text-xs">
                {!isOwner ? (
                  <>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => setContactSellerListing(item)}
                      className="gap-1.5"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>Contact Seller</span>
                    </Button>

                    <button
                      onClick={() => setReportingListingId(item.id)}
                      className="text-xs text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Report listing"
                    >
                      <Flag className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <Badge variant="verified" className="text-[11px]">
                      Your Listing
                    </Badge>
                    <span className="text-[11px] text-slate-400">Active</span>
                  </div>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div ref={sentinelRef} className="h-6" />

      {loading && !initialLoading && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-400">
          <div className="h-3 w-3 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
          <span>Loading more items…</span>
        </div>
      )}

      {/* Create Listing Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setPostError(null);
        }}
        title="List an Item for Campus Sale"
        description="Share books, lab kits, or gadgets with students on your campus."
        maxWidth="md"
      >
        <div className="space-y-3">
          {postError && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 p-2 text-xs text-rose-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{postError}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Title</label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g., Cormen CLRS Algorithms 4th Edition"
              maxLength={200}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Description & Pickup Spot
            </label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Condition, edition, any highlighting, preferred pickup location (Hostel 3, Library foyer)…"
              rows={3}
              maxLength={2000}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Price (₹)</label>
              <Input
                type="number"
                value={form.priceInr}
                onChange={(e) => setForm((f) => ({ ...f, priceInr: e.target.value }))}
                placeholder="450"
                min={0}
                max={100000}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Condition</label>
              <select
                value={form.condition}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    condition: e.target.value as "NEW" | "LIKE_NEW" | "GOOD" | "FAIR",
                  }))
                }
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
              >
                <option value="NEW">Brand New</option>
                <option value="LIKE_NEW">Like New</option>
                <option value="GOOD">Good Condition</option>
                <option value="FAIR">Fair / Used</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
              disabled={posting}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleCreateListing}
              disabled={posting || !form.title.trim() || !form.priceInr}
            >
              {posting ? "Publishing…" : "Publish Listing"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Contact Seller Modal */}
      <Modal
        isOpen={Boolean(contactSellerListing)}
        onClose={() => setContactSellerListing(null)}
        title="Contact Seller"
        description="Connect with the student selling this item."
        maxWidth="sm"
      >
        {contactSellerListing && (
          <div className="space-y-4 text-center py-2">
            <Avatar
              src={contactSellerListing.seller.avatarUrl}
              name={contactSellerListing.seller.displayName ?? contactSellerListing.seller.username}
              size="lg"
              className="mx-auto"
            />
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                {contactSellerListing.seller.displayName ?? contactSellerListing.seller.username}
              </h4>
              <p className="text-xs text-slate-500">
                @{contactSellerListing.seller.username ?? "student"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-700 text-left">
              <p className="font-semibold text-slate-900">{contactSellerListing.title}</p>
              <p className="text-emerald-700 font-bold mt-0.5">
                ₹{parseFloat(contactSellerListing.priceInr).toLocaleString("en-IN")}
              </p>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Connect with this peer directly on StuNet or check their profile for campus details.
            </p>

            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  window.location.href = `/u/${contactSellerListing.seller.username ?? contactSellerListing.sellerId}`;
                }}
              >
                View Student Profile
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Report Modal */}
      <Modal
        isOpen={Boolean(reportingListingId)}
        onClose={() => {
          setReportingListingId(null);
          setReportSuccess(false);
          setReportDetails("");
        }}
        title="Report Listing"
        description="Help us maintain fair and legitimate campus commerce."
        maxWidth="md"
      >
        {reportSuccess ? (
          <div className="py-6 text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Report Received</h4>
            <p className="text-xs text-slate-500">
              Thank you. Moderators will review this listing to protect our campus marketplace.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">
                Why are you reporting this listing?
              </label>
              <div className="space-y-1.5">
                {[
                  { value: "SPAM", label: "Spam, price gouging, or fake item" },
                  { value: "INAPPROPRIATE_CONTENT", label: "Prohibited campus item or substance" },
                  { value: "HARASSMENT", label: "Suspicious or scam seller" },
                  { value: "OTHER", label: "Other community guideline breach" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2.5 rounded-xl border p-2 text-xs cursor-pointer ${
                      reportReason === option.value
                        ? "border-emerald-600 bg-emerald-50/50 text-emerald-900 font-medium"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={option.value}
                      checked={reportReason === option.value}
                      onChange={() => setReportReason(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Additional context (optional)
              </label>
              <Textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Share any helpful information for review…"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReportingListingId(null)}
                disabled={submittingReport}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleSubmitReport}
                disabled={submittingReport}
              >
                {submittingReport ? "Submitting…" : "Submit Report"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
