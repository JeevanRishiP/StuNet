"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  Users,
  Building2,
  Mail,
  CheckCircle2,
  ThumbsUp,
  Flag,
  ArrowLeft,
  Sparkles,
  Calendar,
  AlertCircle,
  Plus,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Modal,
  Textarea,
  Input,
} from "@stunet/ui";

interface Club {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  institutionalEmail: string | null;
  campus: { name: string };
  _count: { members: number };
}

interface ClubMembership {
  role: string;
}

interface Suggestion {
  id: string;
  title: string;
  body: string;
  voteCount: number;
  isImplemented: boolean;
  authorId: string;
  createdAt: string;
}

interface SuggestionWindow {
  id: string;
  title: string;
  description: string | null;
  opensAt: string;
  closesAt: string;
  suggestions: Suggestion[];
}

export default function ClubDetailPage() {
  const params = useParams<{ slug: string }>();
  const [club, setClub] = useState<Club | null>(null);
  const [membership, setMembership] = useState<ClubMembership | null>(null);
  const [windows, setWindows] = useState<SuggestionWindow[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Voting optimistic state
  const [votedSuggestions, setVotedSuggestions] = useState<Record<string, boolean>>({});

  // Suggestion Modal
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [suggestionTitle, setSuggestionTitle] = useState("");
  const [suggestionBody, setSuggestionBody] = useState("");
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);

  // Report Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("SPAM");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  async function loadClub() {
    const res = await fetch("/api/clubs");
    if (!res.ok) return;
    const data: { clubs: (Club & { slug: string })[] } = await res.json();
    const found = data.clubs.find((c) => c.slug === params.slug);
    if (!found) return;
    setClub(found);

    const detail = await fetch(`/api/clubs/${found.id}`);
    if (detail.ok) {
      const d: { club: Club; membership: ClubMembership | null } = await detail.json();
      setClub(d.club);
      setMembership(d.membership);
    }

    const sw = await fetch(`/api/clubs/${found.id}/suggestions`);
    if (sw.ok) {
      const sData: { windows: SuggestionWindow[] } = await sw.json();
      setWindows(sData.windows);
    }
  }

  useEffect(() => {
    loadClub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleJoin() {
    if (!club) return;
    setWorking(true);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${club.id}/members`, { method: "POST" });
      if (res.ok) {
        const data: { role: string } = await res.json();
        setMembership({ role: data.role });
      } else {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "Failed to join chapter.");
      }
    } finally {
      setWorking(false);
    }
  }

  async function handleLeave() {
    if (!club || !window.confirm("Are you sure you want to leave this chapter?")) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/clubs/${club.id}/members`, { method: "DELETE" });
      if (res.ok || res.status === 204) {
        setMembership(null);
      } else {
        const body = await res.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? "Failed to leave chapter.");
      }
    } finally {
      setWorking(false);
    }
  }

  async function handleVote(suggestionId: string) {
    if (votedSuggestions[suggestionId]) return;
    try {
      const res = await fetch(`/api/suggestions/${suggestionId}/vote`, { method: "POST" });
      if (res.ok) {
        setVotedSuggestions((prev) => ({ ...prev, [suggestionId]: true }));
        setWindows((prev) =>
          prev.map((w) => ({
            ...w,
            suggestions: w.suggestions.map((s) =>
              s.id === suggestionId ? { ...s, voteCount: s.voteCount + 1 } : s,
            ),
          })),
        );
      } else if (res.status === 429) {
        alert("You have already voted or are voting too frequently.");
      }
    } catch {
      // silent
    }
  }

  async function handleCreateSuggestion() {
    if (!club || !activeWindowId || !suggestionTitle.trim() || !suggestionBody.trim()) return;
    setSubmittingSuggestion(true);
    try {
      const res = await fetch(`/api/clubs/${club.id}/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          windowId: activeWindowId,
          title: suggestionTitle.trim(),
          body: suggestionBody.trim(),
        }),
      });
      if (res.ok) {
        const newSuggestion = await res.json();
        setWindows((prev) =>
          prev.map((w) =>
            w.id === activeWindowId ? { ...w, suggestions: [newSuggestion, ...w.suggestions] } : w,
          ),
        );
        setActiveWindowId(null);
        setSuggestionTitle("");
        setSuggestionBody("");
      }
    } finally {
      setSubmittingSuggestion(false);
    }
  }

  async function handleSubmitReport() {
    if (!club) return;
    setSubmittingReport(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: "CLUB",
          reason: reportReason,
          details: reportDetails.trim() || undefined,
        }),
      });
      if (res.ok) {
        setReportSuccess(true);
        setTimeout(() => {
          setReportModalOpen(false);
          setReportSuccess(false);
          setReportDetails("");
        }, 1500);
      }
    } finally {
      setSubmittingReport(false);
    }
  }

  if (!club) {
    return (
      <Card className="p-12 text-center">
        <div className="h-6 w-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto" />
        <p className="mt-3 text-xs text-slate-500">Loading chapter details…</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href={"/clubs" as Route}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Chapters</span>
        </Link>
      </div>

      {/* Hero Banner Card */}
      <Card className="overflow-hidden border-slate-200/90 shadow-sm">
        {/* Cover */}
        <div className="h-32 sm:h-44 bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:10px_10px]" />
          {club.bannerUrl && (
            <img src={club.bannerUrl} alt="" className="h-full w-full object-cover opacity-60" />
          )}
        </div>

        <CardContent className="p-6 pt-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-10 sm:-mt-14 mb-4">
            <div className="flex items-end gap-4">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-white p-1.5 shadow-xl ring-4 ring-white flex items-center justify-center overflow-hidden shrink-0">
                {club.logoUrl ? (
                  <img
                    src={club.logoUrl}
                    alt=""
                    className="h-full w-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="h-full w-full rounded-xl bg-indigo-50 flex items-center justify-center text-3xl font-bold text-indigo-600">
                    🏛️
                  </div>
                )}
              </div>

              <div className="mb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">{club.name}</h1>
                  <Badge variant="verified" className="text-[10px]">
                    Verified Chapter
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="font-medium text-indigo-600">{club.category}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {club.campus.name}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {club._count.members} members
                  </span>
                </div>
              </div>
            </div>

            {/* Actions: Join/Leave & Report */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReportModalOpen(true)}
                className="text-slate-400 hover:text-rose-600"
              >
                <Flag className="h-4 w-4" />
                <span className="sr-only">Report Chapter</span>
              </Button>

              {membership ? (
                <div className="flex items-center gap-2">
                  <Badge variant="verified" className="py-1 px-3 text-xs font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    <span>Member ({membership.role})</span>
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLeave}
                    disabled={working}
                    className="text-slate-600 hover:text-rose-600 hover:border-rose-200"
                  >
                    Leave
                  </Button>
                </div>
              ) : (
                <Button
                  variant="gradient"
                  size="default"
                  onClick={handleJoin}
                  disabled={working}
                  className="shadow-md"
                >
                  <Users className="h-4 w-4 mr-1.5" />
                  <span>{working ? "Joining…" : "Join Chapter"}</span>
                </Button>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 p-2.5 text-xs text-rose-600 mb-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Description */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              About this chapter
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {club.description}
            </p>

            {club.institutionalEmail && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <Mail className="h-3.5 w-3.5 text-indigo-500" />
                <span>Official Contact:</span>
                <a
                  href={`mailto:${club.institutionalEmail}`}
                  className="font-medium text-indigo-600 hover:underline"
                >
                  {club.institutionalEmail}
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Governance & Suggestion Boxes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Suggestion Boxes & Student Governance
            </h2>
          </div>
        </div>

        {!membership && (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs text-indigo-900 flex items-center justify-between gap-4">
            <div>
              <p className="font-bold">Join this chapter to vote or submit suggestions</p>
              <p className="text-[11px] text-indigo-700 mt-0.5">
                All verified members can participate in democratic suggestion windows and prioritize
                initiatives.
              </p>
            </div>
            <Button size="sm" variant="default" onClick={handleJoin} disabled={working}>
              Join Now
            </Button>
          </div>
        )}

        {windows.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-xs text-slate-500">
              No active suggestion windows currently open for this chapter.
            </p>
          </Card>
        ) : (
          windows.map((windowItem) => (
            <Card key={windowItem.id} className="border-slate-200/90 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/70 p-4 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900">
                      {windowItem.title}
                    </CardTitle>
                    {windowItem.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{windowItem.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                      <Calendar className="h-3 w-3 text-indigo-500" />
                      <span>Closes {new Date(windowItem.closesAt).toLocaleDateString()}</span>
                    </span>

                    {membership && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveWindowId(windowItem.id)}
                        className="gap-1 text-xs"
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add Suggestion</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                {windowItem.suggestions.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">
                    No suggestions submitted in this window yet. Be the first to propose an idea!
                  </p>
                ) : (
                  windowItem.suggestions.map((suggestion) => {
                    const hasVoted = Boolean(votedSuggestions[suggestion.id]);
                    return (
                      <div
                        key={suggestion.id}
                        className="rounded-xl border border-slate-100 bg-white p-3.5 flex items-start justify-between gap-4 shadow-2xs hover:border-slate-200 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {suggestion.title}
                            </h4>
                            {suggestion.isImplemented && (
                              <Badge variant="verified" className="text-[10px] py-0 px-1.5">
                                ✓ Implemented
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                            {suggestion.body}
                          </p>
                        </div>

                        {/* Voting Button */}
                        <div className="flex flex-col items-center shrink-0">
                          <button
                            onClick={() => handleVote(suggestion.id)}
                            disabled={!membership || hasVoted}
                            className={`flex flex-col items-center justify-center rounded-xl p-2 min-w-[48px] transition-all ${
                              hasVoted
                                ? "bg-indigo-600 text-white shadow-xs"
                                : membership
                                  ? "bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700"
                                  : "bg-slate-50 text-slate-400 cursor-not-allowed"
                            }`}
                            title={membership ? "Vote for this suggestion" : "Join club to vote"}
                          >
                            <ThumbsUp className={`h-4 w-4 ${hasVoted ? "fill-white" : ""}`} />
                            <span className="text-xs font-bold mt-0.5">{suggestion.voteCount}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Suggestion Creation Modal */}
      <Modal
        isOpen={Boolean(activeWindowId)}
        onClose={() => {
          setActiveWindowId(null);
          setSuggestionTitle("");
          setSuggestionBody("");
        }}
        title="Propose a Chapter Suggestion"
        description="Share an initiative, event idea, or improvement for this club."
        maxWidth="md"
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Title</label>
            <Input
              value={suggestionTitle}
              onChange={(e) => setSuggestionTitle(e.target.value)}
              placeholder="e.g., Host an Open Source Hackathon"
              maxLength={150}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Details & Proposal
            </label>
            <Textarea
              value={suggestionBody}
              onChange={(e) => setSuggestionBody(e.target.value)}
              placeholder="Describe what resources, dates, or topics this would involve…"
              rows={4}
              maxLength={1000}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveWindowId(null)}
              disabled={submittingSuggestion}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleCreateSuggestion}
              disabled={submittingSuggestion || !suggestionTitle.trim() || !suggestionBody.trim()}
            >
              {submittingSuggestion ? "Submitting…" : "Submit Suggestion"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Report Modal */}
      <Modal
        isOpen={reportModalOpen}
        onClose={() => {
          setReportModalOpen(false);
          setReportSuccess(false);
          setReportDetails("");
        }}
        title="Report Chapter"
        description="Flag policy violations or inappropriate behavior."
        maxWidth="md"
      >
        {reportSuccess ? (
          <div className="py-6 text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Report Submitted</h4>
            <p className="text-xs text-slate-500">
              Our campus moderators will review this chapter according to community guidelines.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">
                Reason for report
              </label>
              <div className="space-y-1.5">
                {[
                  { value: "SPAM", label: "Spam or deceptive behavior" },
                  { value: "HARASSMENT", label: "Harassment or exclusionary policies" },
                  { value: "HATE_SPEECH", label: "Hate speech or discrimination" },
                  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate activities or imagery" },
                  { value: "IMPERSONATION", label: "Impersonating an unauthorized organization" },
                  { value: "OTHER", label: "Other code of conduct violation" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2.5 rounded-xl border p-2 text-xs cursor-pointer ${
                      reportReason === option.value
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 font-medium"
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
                Additional notes (optional)
              </label>
              <Textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Details to assist in investigation…"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReportModalOpen(false)}
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
