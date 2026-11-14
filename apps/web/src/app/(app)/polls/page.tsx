"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  BarChart3,
  Plus,
  Check,
  Lock,
  RefreshCw,
  ListChecks,
  GraduationCap,
  Sparkles,
  Building2,
  Award,
  Filter,
  Tag,
  ChevronDown,
  X,
  ShieldAlert,
  Clock,
  AlertCircle,
  MessageSquare,
  Info,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { Button, Card, CardHeader, CardTitle, CardContent, Modal } from "@stunet/ui";
import AdvancedSelectList from "@/components/AdvancedSelectList";
import PollCreatorHeader from "@/components/PollCreatorHeader";
import PollCommentSection from "@/components/PollCommentSection";

const TRENDING_TAGS = [
  "ai",
  "placement",
  "webdev",
  "nxtwave",
  "project",
  "internship",
  "design",
  "research",
  "exam",
  "study",
];

interface PollOptionItem {
  id: string;
  text: string;
  sortOrder: number;
  votes: number | null;
  percent: number | null;
}

interface CommunityPoll {
  id: string;
  postId: string;
  question: string;
  isAnonymous: boolean;
  allowMultipleAnswers: boolean;
  submissionMode: "SINGLE_SUBMIT" | "MULTIPLE_SUBMIT";
  geoScope: string;
  scope: string;
  campusId: string | null;
  targetScope: "ALL" | "CONNECTED";
  targetRoles: string[];
  authorId: string | null;
  authorName: string;
  authorUsername: string | null;
  authorRole: string;
  authorAvatarUrl?: string | null;
  authorCampus?: { id: string; name: string } | null;
  isConnection?: boolean;
  isFollowing?: boolean;
  options: PollOptionItem[];
  userSelectedOptionIds: string[];
  hasSubmitted: boolean;
  hasVoted: boolean;
  isLocked: boolean;
  totalVotes: number;
  totalResponses: number;
  closesAt: string | null;
  pollType?: string;
  complaintLevel?: string | null;
  section?: string | null;
  batch?: string | null;
  calculationBasis?: string;
  totalTargetStudents?: number | null;
  autoDeleteOnExpire?: boolean;
  commentCount?: number;
  createdAt: string;
}

export default function PollsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const isGuest =
    sessionStatus === "loading"
      ? true
      : !session?.user || Boolean(session.user.isGuest || session.user.role === "GUEST");

  const [streamSection, setStreamSection] = useState<"STUDENTS" | "ALL" | "FACULTY" | "ALUMNI">(
    "STUDENTS",
  );
  const [subFilter, setSubFilter] = useState<"ALL" | "FOLLOWING" | "CONNECTED">("ALL");
  const [selectedCampuses, setSelectedCampuses] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [isFiltersDropdownOpen, setIsFiltersDropdownOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  // Close filters dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setIsFiltersDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Polls state loaded from PostgreSQL
  const [polls, setPolls] = useState<CommunityPoll[]>([]);
  const [loadingPolls, setLoadingPolls] = useState(true);
  const [draftSelections, setDraftSelections] = useState<Record<string, string[]>>({});
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<Record<string, string>>({});
  const viewedPostIds = useRef<Set<string>>(new Set());

  // ── RIGHT DIVISION: COMPLAINT POLLS STATE ──
  // Categories: general (default selection), section level, batch level, campus level
  const [complaintCategory, setComplaintCategory] = useState<
    "GENERAL" | "SECTION" | "CAMPUS" | "BATCH"
  >("GENERAL");
  const [openCommentPollIds, setOpenCommentPollIds] = useState<Record<string, boolean>>({});
  const [showComplaintInfoTooltip, setShowComplaintInfoTooltip] = useState(false);

  // Batch Filter State
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [isBatchDropdownOpen, setIsBatchDropdownOpen] = useState(false);
  const batchFilterRef = useRef<HTMLDivElement>(null);
  const [customTagInput, setCustomTagInput] = useState("");

  // Report Modal State
  const [reportingPollPostId, setReportingPollPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("SPAM");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Create Poll Modal (Updated per specifications)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pollKind, setPollKind] = useState<"STANDARD" | "COMPLAINT">("STANDARD");
  const [complaintKindLevel, setComplaintKindLevel] = useState<
    "GENERAL" | "SECTION" | "CAMPUS" | "BATCH"
  >("GENERAL");
  const [complaintSectionName, setComplaintSectionName] = useState("");
  const [complaintBatchName, setComplaintBatchName] = useState("");
  const [pollBatch, setPollBatch] = useState("");
  const [currentUserSection, setCurrentUserSection] = useState("");
  const [currentUserBatch, setCurrentUserBatch] = useState("");
  const [currentUserCampusName, setCurrentUserCampusName] = useState("");
  const [currentUserCampusId, setCurrentUserCampusId] = useState("");

  const [newQuestion, setNewQuestion] = useState("");
  const [optionsInputs, setOptionsInputs] = useState(["", "", ""]);
  const [allowMultipleAnswers, setAllowMultipleAnswers] = useState(false);
  const [submissionMode, setSubmissionMode] = useState<"SINGLE_SUBMIT" | "MULTIPLE_SUBMIT">(
    "SINGLE_SUBMIT",
  );
  const [isAnonymous, setIsAnonymous] = useState(false);
  const targetScope: "ALL" | "CONNECTED" = "ALL";
  const targetRoles: string[] = ["STUDENT", "FACULTY", "ALUMNI"];
  const [pollTags, setPollTags] = useState("");

  // Poll open till: Date (calendar) and Time (digital clock style)
  const [openTillDate, setOpenTillDate] = useState("");
  const [openTillTime, setOpenTillTime] = useState("18:00");
  const [autoDeleteOnExpire, setAutoDeleteOnExpire] = useState(false);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadPolls = useCallback(async () => {
    setLoadingPolls(true);
    try {
      const params = new URLSearchParams();
      params.set("section", streamSection);
      params.set("subFilter", subFilter);
      if (activeTag) params.set("tag", activeTag);
      if (selectedBatch) params.set("batch", selectedBatch);
      if (selectedCampuses.length > 0) params.set("campuses", selectedCampuses.join(","));

      const res = await fetch(`/api/polls?${params.toString()}`);
      if (!res.ok) return;
      const data = (await res.json()) as { polls?: CommunityPoll[] };
      if (Array.isArray(data.polls)) {
        setPolls(data.polls);
        if (!isGuest) {
          for (const poll of data.polls) {
            if (poll.postId && !viewedPostIds.current.has(poll.postId)) {
              viewedPostIds.current.add(poll.postId);
              fetch(`/api/posts/${poll.postId}/view`, { method: "POST" }).catch(() => null);
            }
          }
        }
      }
    } catch {
      // silent
    } finally {
      setLoadingPolls(false);
    }
  }, [streamSection, subFilter, activeTag, selectedBatch, selectedCampuses, isGuest]);

  useEffect(() => {
    void loadPolls();
  }, [loadPolls]);

  // Close batch filter dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (batchFilterRef.current && !batchFilterRef.current.contains(e.target as Node)) {
        setIsBatchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch authenticated user profile for auto-selecting section, batch, and campus
  useEffect(() => {
    async function fetchUserData() {
      try {
        const res = await fetch("/api/users/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user?.section) {
            setCurrentUserSection(data.user.section);
            setComplaintSectionName(data.user.section);
          }
          if (data.user?.joiningYear) {
            setCurrentUserBatch(String(data.user.joiningYear));
            setComplaintBatchName(String(data.user.joiningYear));
          }
          if (data.user?.campus) {
            setCurrentUserCampusName(data.user.campus.name || "");
            setCurrentUserCampusId(data.user.campus.id || "");
          }
        }
      } catch {
        // silent
      }
    }
    fetchUserData();
  }, []);

  function replaceUpdatedPoll(updatedPoll: CommunityPoll) {
    setPolls((prev) => prev.map((p) => (p.id === updatedPoll.id ? updatedPoll : p)));
  }

  // Handle clicking an option on a Poll
  async function handleOptionClick(poll: CommunityPoll, optionId: string) {
    if (isGuest) return;
    if (poll.isLocked) return;

    setVoteError((prev) => ({ ...prev, [poll.id]: "" }));

    if (poll.submissionMode === "SINGLE_SUBMIT") {
      setDraftSelections((prev) => {
        const current = prev[poll.id] ?? [];
        if (poll.allowMultipleAnswers) {
          const exists = current.includes(optionId);
          return {
            ...prev,
            [poll.id]: exists ? current.filter((id) => id !== optionId) : [...current, optionId],
          };
        }
        return {
          ...prev,
          [poll.id]: [optionId],
        };
      });
      return;
    }

    setVotingPollId(poll.id);
    try {
      const res = await fetch(`/api/polls/${poll.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggleOptionId: optionId }),
      });
      const data = (await res.json()) as { poll?: CommunityPoll; error?: string };
      if (res.ok && data.poll) {
        replaceUpdatedPoll(data.poll);
      } else if (data.error) {
        setVoteError((prev) => ({ ...prev, [poll.id]: data.error ?? "Failed to record vote." }));
      }
    } catch {
      setVoteError((prev) => ({ ...prev, [poll.id]: "Network error recording vote." }));
    } finally {
      setVotingPollId(null);
    }
  }

  // Explicit Submit button handler for SINGLE_SUBMIT polls
  async function handleSubmitSinglePoll(poll: CommunityPoll) {
    if (isGuest || poll.isLocked) return;
    const selected = draftSelections[poll.id] ?? [];
    if (selected.length === 0) return;

    setVotingPollId(poll.id);
    setVoteError((prev) => ({ ...prev, [poll.id]: "" }));
    try {
      const res = await fetch(`/api/polls/${poll.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIds: selected }),
      });
      const data = (await res.json()) as { poll?: CommunityPoll; error?: string };
      if (res.ok && data.poll) {
        replaceUpdatedPoll(data.poll);
        setDraftSelections((prev) => {
          const copy = { ...prev };
          delete copy[poll.id];
          return copy;
        });
      } else if (data.error) {
        setVoteError((prev) => ({ ...prev, [poll.id]: data.error ?? "Failed to submit vote." }));
      }
    } catch {
      setVoteError((prev) => ({ ...prev, [poll.id]: "Network error submitting vote." }));
    } finally {
      setVotingPollId(null);
    }
  }

  async function handleCreatePoll(e: React.FormEvent) {
    e.preventDefault();
    if (isGuest || creating) return;

    const validOptions = optionsInputs.map((o) => o.trim()).filter((o) => o.length > 0);
    if (!newQuestion.trim() || validOptions.length < 2) {
      setCreateError("Please enter a poll question and at least 2 answer options.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const parsedTags = pollTags
        .split(/[\s,]+/)
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);

      const userCampusName =
        (session?.user as { campusName?: string })?.campusName ??
        currentUserCampusName ??
        "All Campuses";
      const userCampusId =
        (session?.user as { campusId?: string })?.campusId ?? currentUserCampusId ?? null;
      const targetCampusId =
        pollKind === "COMPLAINT" && complaintKindLevel === "CAMPUS" && currentUserCampusId
          ? currentUserCampusId
          : selectedCampuses.length > 0
            ? selectedCampuses[0]
            : userCampusId;
      const resolvedGeoScope = targetCampusId ? "CAMPUS" : "ALL";
      const resolvedScopeLabel = targetCampusId ? userCampusName : "All Campuses";

      let closesAtIso: string | null = null;
      if (openTillDate) {
        closesAtIso = new Date(`${openTillDate}T${openTillTime || "23:59"}:00`).toISOString();
      }

      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: newQuestion.trim(),
          options: validOptions,
          allowMultipleAnswers,
          submissionMode,
          geoScope: resolvedGeoScope,
          scopeLabel: resolvedScopeLabel,
          campusId: targetCampusId,
          targetConnectionScope: targetScope,
          targetRoles,
          isAnonymous,
          tags: parsedTags,
          pollType: pollKind === "COMPLAINT" ? "COMPLAINT" : "GENERAL",
          complaintLevel: pollKind === "COMPLAINT" ? complaintKindLevel : null,
          section:
            pollKind === "COMPLAINT" && complaintKindLevel === "SECTION"
              ? complaintSectionName.trim()
              : null,
          batch:
            pollKind === "COMPLAINT"
              ? complaintKindLevel === "BATCH"
                ? complaintBatchName.trim()
                : null
              : pollBatch.trim() || null,
          autoDeleteOnExpire: pollKind === "COMPLAINT" ? false : autoDeleteOnExpire,
          closesAt: closesAtIso,
        }),
      });

      const data = (await res.json()) as { poll?: CommunityPoll; error?: string };
      if (!res.ok || !data.poll) {
        setCreateError(data.error ?? "Unable to publish poll.");
        return;
      }

      const publishedPoll = data.poll;
      setPolls((prev) => [publishedPoll, ...prev]);
      setNewQuestion("");
      setOptionsInputs(["", "", ""]);
      setAllowMultipleAnswers(false);
      setSubmissionMode("SINGLE_SUBMIT");
      setIsAnonymous(false);
      setPollTags("");
      setOpenTillDate("");
      setOpenTillTime("18:00");
      setAutoDeleteOnExpire(false);
      setShowCreateModal(false);
    } catch {
      setCreateError("Network error publishing poll.");
    } finally {
      setCreating(false);
    }
  }

  // Filter middle feed polls (General Community Polls)
  const filteredMiddlePolls = polls.filter((poll) => {
    // Keep complaint polls in right division
    if (poll.pollType === "COMPLAINT") return false;

    // 1. Primary stream section check
    if (
      streamSection === "STUDENTS" &&
      poll.authorRole !== "STUDENT" &&
      poll.authorRole !== "CLUB_MANAGER"
    )
      return false;
    if (streamSection === "FACULTY" && poll.authorRole !== "FACULTY") return false;
    if (streamSection === "ALUMNI" && poll.authorRole !== "ALUMNI") return false;

    // 2. Sub-filters: All • Following • Connected
    if (subFilter === "CONNECTED" && !poll.isConnection) return false;
    if (subFilter === "FOLLOWING" && !poll.isFollowing) return false;

    // 3. Multi-Campus Filter
    if (selectedCampuses.length > 0) {
      const authorCampName = poll.authorCampus?.name;
      const scopeLabel = poll.scope;
      const matches = selectedCampuses.some(
        (c) =>
          c === authorCampName ||
          (authorCampName && authorCampName.includes(c)) ||
          scopeLabel.includes(c) ||
          (poll.campusId && c === poll.campusId),
      );
      if (!matches) return false;
    }

    if (selectedBatch && poll.batch && !poll.batch.includes(selectedBatch)) {
      return false;
    }

    return true;
  });

  // Filter right division polls (Complaint Polls)
  // Seeded fallback complaint polls if database has no complaints yet
  const defaultComplaintPolls: CommunityPoll[] = [
    {
      id: "complaint-p-1",
      postId: "post-comp-1",
      question:
        "Frequent power socket trips and ungrounded outlet shocks in Block B Innovation Sandbox tables. Request electrician overhaul.",
      isAnonymous: true,
      allowMultipleAnswers: false,
      submissionMode: "SINGLE_SUBMIT",
      geoScope: "CAMPUS",
      scope: "Campus Level",
      campusId: null,
      targetScope: "ALL",
      targetRoles: ["STUDENT", "FACULTY"],
      authorId: null,
      authorName: "Anonymous Student",
      authorUsername: null,
      authorRole: "STUDENT",
      options: [
        {
          id: "co-1",
          text: "Critical — Daily Project Disruption",
          sortOrder: 0,
          votes: 94,
          percent: 79,
        },
        {
          id: "co-2",
          text: "Manageable With Extension Cords",
          sortOrder: 1,
          votes: 19,
          percent: 16,
        },
        { id: "co-3", text: "Already Fixed in My Row", sortOrder: 2, votes: 6, percent: 5 },
      ],
      userSelectedOptionIds: [],
      hasSubmitted: false,
      hasVoted: false,
      isLocked: false,
      totalVotes: 119,
      totalResponses: 119,
      closesAt: "2026-11-25T18:00:00.000Z",
      pollType: "COMPLAINT",
      complaintLevel: "CAMPUS",
      section: null,
      autoDeleteOnExpire: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "complaint-p-2",
      postId: "post-comp-2",
      question:
        "Lab 3 Linux workstation dual-boot login issues for Section A students during Operating Systems practicals.",
      isAnonymous: true,
      allowMultipleAnswers: false,
      submissionMode: "SINGLE_SUBMIT",
      geoScope: "CAMPUS",
      scope: "Section A Level",
      campusId: null,
      targetScope: "ALL",
      targetRoles: ["STUDENT"],
      authorId: null,
      authorName: "Anonymous Student",
      authorUsername: null,
      authorRole: "STUDENT",
      options: [
        {
          id: "co-4",
          text: "Blocks Kernel Threads Exercise",
          sortOrder: 0,
          votes: 48,
          percent: 81,
        },
        { id: "co-5", text: "Able to Share Workstation", sortOrder: 1, votes: 8, percent: 14 },
        { id: "co-6", text: "Resolved by Assistant", sortOrder: 2, votes: 3, percent: 5 },
      ],
      userSelectedOptionIds: [],
      hasSubmitted: false,
      hasVoted: false,
      isLocked: false,
      totalVotes: 59,
      totalResponses: 59,
      closesAt: "2026-11-24T18:00:00.000Z",
      pollType: "COMPLAINT",
      complaintLevel: "SECTION",
      section: "Section A",
      autoDeleteOnExpire: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "complaint-p-3",
      postId: "post-comp-3",
      question:
        "Cafeteria digital token scanner queue during 1:00 PM lunch hour causes 20-minute delays for afternoon lectures.",
      isAnonymous: true,
      allowMultipleAnswers: false,
      submissionMode: "SINGLE_SUBMIT",
      geoScope: "CAMPUS",
      scope: "General Grievance",
      campusId: null,
      targetScope: "ALL",
      targetRoles: ["STUDENT", "FACULTY"],
      authorId: null,
      authorName: "Anonymous Student",
      authorUsername: null,
      authorRole: "STUDENT",
      options: [
        { id: "co-7", text: "Add 2 More QR Scanners", sortOrder: 0, votes: 112, percent: 84 },
        {
          id: "co-8",
          text: "Stagger Lunch Breaks by 15 mins",
          sortOrder: 1,
          votes: 15,
          percent: 11,
        },
        { id: "co-9", text: "Current Flow is Tolerable", sortOrder: 2, votes: 6, percent: 5 },
      ],
      userSelectedOptionIds: [],
      hasSubmitted: false,
      hasVoted: false,
      isLocked: false,
      totalVotes: 133,
      totalResponses: 133,
      closesAt: "2026-11-28T18:00:00.000Z",
      pollType: "COMPLAINT",
      complaintLevel: "GENERAL",
      section: null,
      autoDeleteOnExpire: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "complaint-p-batch",
      postId: "post-comp-batch",
      question:
        "Lab infrastructure & GPU allocation delays for Batch 2024 AI/ML specialization capstone projects.",
      isAnonymous: true,
      allowMultipleAnswers: false,
      submissionMode: "SINGLE_SUBMIT",
      geoScope: "CAMPUS",
      scope: "Batch Level",
      campusId: null,
      targetScope: "ALL",
      targetRoles: ["STUDENT"],
      authorId: null,
      authorName: "Anonymous Student",
      authorUsername: null,
      authorRole: "STUDENT",
      options: [
        {
          id: "co-b1",
          text: "Urgent — Cloud Instance Credits Required",
          sortOrder: 0,
          votes: 88,
          percent: 73,
        },
        {
          id: "co-b2",
          text: "Physical Server Timeshare Feasible",
          sortOrder: 1,
          votes: 24,
          percent: 20,
        },
        { id: "co-b3", text: "Local Hardware Sufficient", sortOrder: 2, votes: 8, percent: 7 },
      ],
      userSelectedOptionIds: [],
      hasSubmitted: false,
      hasVoted: false,
      isLocked: false,
      totalVotes: 120,
      totalResponses: 120,
      closesAt: "2026-11-30T18:00:00.000Z",
      pollType: "COMPLAINT",
      complaintLevel: "BATCH",
      batch: "2024",
      section: null,
      autoDeleteOnExpire: false,
      createdAt: new Date().toISOString(),
    },
  ];

  const dbComplaintPolls = polls.filter((p) => p.pollType === "COMPLAINT");
  const allComplaintPolls = dbComplaintPolls.length > 0 ? dbComplaintPolls : defaultComplaintPolls;

  const filteredComplaintPolls = allComplaintPolls.filter((p) => {
    if (selectedBatch && p.batch && !p.batch.includes(selectedBatch)) {
      return false;
    }
    if (complaintCategory === "GENERAL") {
      return !p.complaintLevel || p.complaintLevel === "GENERAL";
    }
    if (complaintCategory === "SECTION") {
      return p.complaintLevel === "SECTION";
    }
    if (complaintCategory === "BATCH") {
      return p.complaintLevel === "BATCH";
    }
    if (complaintCategory === "CAMPUS") {
      return p.complaintLevel === "CAMPUS";
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* ── TWO-DIVISION GRID: MIDDLE FEED & RIGHT COMPLAINT POLLS DIVISION ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ══════════════════════════════════════════════════════════════
            MIDDLE DIVISION (lg:col-span-7 xl:col-span-8):
            COMMUNITY POLLS FEED
            ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Header Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-sm">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <h1 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Community Polls
                </h1>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Voice opinions across the student, faculty, and alumni community — filter by campus,
                stream, and trending topics.
              </p>
            </div>

            {!isGuest && (
              <button
                type="button"
                onClick={() => {
                  setPollKind("STANDARD");
                  setShowCreateModal(true);
                }}
                className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs shrink-0 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>New Poll</span>
              </button>
            )}
          </div>

          {/* 2-Row Filter System */}
          <div className="space-y-1.5">
            {/* Row 1: Primary Stream Sections */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
              {[
                { id: "STUDENTS" as const, label: "Students", icon: GraduationCap },
                { id: "ALL" as const, label: "All", icon: Sparkles },
                { id: "FACULTY" as const, label: "Faculty", icon: Building2 },
                { id: "ALUMNI" as const, label: "Alumni", icon: Award },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = streamSection === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStreamSection(tab.id)}
                    className={`py-2 px-1.5 sm:px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isActive
                        ? tab.id === "FACULTY"
                          ? "bg-purple-600 text-white shadow-xs"
                          : tab.id === "ALUMNI"
                            ? "bg-amber-600 text-white shadow-xs"
                            : "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Row 2: Sub-Filters */}
            <div className="flex items-center justify-between gap-1.5 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSubFilter("ALL");
                    setActiveTag(null);
                    setSelectedCampuses([]);
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    subFilter === "ALL" && !activeTag && selectedCampuses.length === 0
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  All
                </button>

                <button
                  type="button"
                  onClick={() => setSubFilter("FOLLOWING")}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    subFilter === "FOLLOWING"
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>Following</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubFilter("CONNECTED")}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    subFilter === "CONNECTED"
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>Connected</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <AdvancedSelectList
                  compact={true}
                  userCampusName={session?.user?.campusName ?? "S-VYASA University"}
                  selectedCampuses={selectedCampuses}
                  onApplyCampuses={(camps) => setSelectedCampuses(camps)}
                />

                {/* Batch Filter Dropdown */}
                <div className="relative shrink-0" ref={batchFilterRef}>
                  <button
                    type="button"
                    onClick={() => setIsBatchDropdownOpen(!isBatchDropdownOpen)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border cursor-pointer ${
                      selectedBatch || isBatchDropdownOpen
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <Calendar className="h-3 w-3" />
                    <span>{selectedBatch ? `Batch: ${selectedBatch}` : "Batch"}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>

                  {isBatchDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-1">
                      <div className="flex items-center justify-between pb-1.5 px-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Filter by Batch
                        </span>
                        {selectedBatch && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBatch(null);
                              setIsBatchDropdownOpen(false);
                            }}
                            className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline font-bold"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-0.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBatch(null);
                            setIsBatchDropdownOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            !selectedBatch
                              ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          All Batches
                        </button>
                        {["2021", "2022", "2023", "2024", "2025", "2026", "2027"].map((yr) => (
                          <button
                            key={yr}
                            type="button"
                            onClick={() => {
                              setSelectedBatch(yr);
                              setIsBatchDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              selectedBatch === yr
                                ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                          >
                            Batch {yr}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative shrink-0" ref={filtersRef}>
                  <button
                    type="button"
                    onClick={() => setIsFiltersDropdownOpen(!isFiltersDropdownOpen)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border cursor-pointer ${
                      activeTag || isFiltersDropdownOpen
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <Filter className="h-3 w-3" />
                    <span className="max-w-[70px] truncate">
                      {activeTag ? `#${activeTag}` : "Filters"}
                    </span>
                    <ChevronDown className="h-3 w-3" />
                  </button>

                  {isFiltersDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Filter by Tag</span>
                        </span>
                        {activeTag && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTag(null);
                              setIsFiltersDropdownOpen(false);
                            }}
                            className="text-[10px] text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                            <span>Clear</span>
                          </button>
                        )}
                      </div>

                      {/* Writable Text Section for typing tag */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const clean = customTagInput.trim().replace(/^#/, "").toLowerCase();
                          if (clean) {
                            setActiveTag(clean);
                            setCustomTagInput("");
                            setIsFiltersDropdownOpen(false);
                          }
                        }}
                        className="mt-2.5 mb-2 flex items-center gap-1.5"
                      >
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                            #
                          </span>
                          <input
                            type="text"
                            value={customTagInput}
                            onChange={(e) => setCustomTagInput(e.target.value)}
                            placeholder="Type tag e.g. ai, exam..."
                            className="w-full pl-6 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <button
                          type="submit"
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
                        >
                          Apply
                        </button>
                      </form>

                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-2 mb-1.5">
                        Trending & Suggested Tags
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        {TRENDING_TAGS.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              setActiveTag(activeTag === tag ? null : tag);
                              setIsFiltersDropdownOpen(false);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                              activeTag === tag
                                ? "bg-indigo-600 text-white font-bold"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Middle Polls Feed */}
          {loadingPolls ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card
                  key={i}
                  className="border-slate-200/90 dark:border-slate-800 dark:bg-slate-900 p-5 rounded-2xl animate-pulse space-y-3"
                >
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-full" />
                  <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-10 w-full bg-slate-100 dark:bg-slate-800 rounded-xl" />
                </Card>
              ))}
            </div>
          ) : filteredMiddlePolls.length === 0 ? (
            <Card className="border-slate-200/90 dark:border-slate-800 dark:bg-slate-900 p-10 rounded-2xl text-center space-y-2">
              <BarChart3 className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No community polls match this filter
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Switch to &ldquo;All&rdquo; or create a new poll for your peers.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredMiddlePolls.map((poll) => {
                const draft = draftSelections[poll.id] ?? [];
                const activeSelectedIds = poll.hasVoted
                  ? poll.userSelectedOptionIds
                  : poll.submissionMode === "SINGLE_SUBMIT"
                    ? draft
                    : poll.userSelectedOptionIds;
                const isVoting = votingPollId === poll.id;
                const errorMsg = voteError[poll.id];

                return (
                  <Card
                    key={poll.id}
                    className="border-slate-200/90 dark:border-slate-800 dark:bg-slate-900 shadow-2xs p-5 rounded-2xl space-y-3"
                  >
                    {/* Poll Creator Header */}
                    <PollCreatorHeader
                      authorName={poll.authorName}
                      authorUsername={poll.authorUsername}
                      authorAvatarUrl={poll.authorAvatarUrl}
                      authorRole={poll.authorRole}
                      authorCampus={poll.authorCampus}
                      createdAt={poll.createdAt}
                      isAnonymous={poll.isAnonymous}
                      onReport={() => setReportingPollPostId(poll.postId)}
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 px-2 py-0.5 rounded-full">
                          {poll.scope}
                        </span>

                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          <ListChecks className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                          <span>
                            {poll.allowMultipleAnswers ? "Multiple answers" : "Single choice"}
                          </span>
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            poll.submissionMode === "SINGLE_SUBMIT"
                              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60"
                              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60"
                          }`}
                        >
                          {poll.submissionMode === "SINGLE_SUBMIT" ? (
                            <>
                              <Lock className="h-2.5 w-2.5" />
                              <span>Answer once</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-2.5 w-2.5" />
                              <span>Changeable vote</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      {poll.question}
                    </h3>

                    <div className="space-y-2 pt-1">
                      {poll.options.map((opt) => {
                        const isSelected = activeSelectedIds.includes(opt.id);
                        const revealResults = poll.hasVoted && opt.percent !== null;
                        const percent = opt.percent ?? 0;

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={isGuest || poll.isLocked || isVoting}
                            onClick={() => handleOptionClick(poll, opt.id)}
                            className={`w-full text-left p-3 rounded-xl border relative overflow-hidden transition-all text-xs font-medium ${
                              isSelected
                                ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 font-bold"
                                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:border-slate-300 text-slate-800 dark:text-slate-200"
                            } ${isGuest || poll.isLocked ? "cursor-default" : "cursor-pointer"}`}
                          >
                            {revealResults && (
                              <div
                                className={`absolute top-0 bottom-0 left-0 opacity-15 transition-all duration-500 ${
                                  isSelected ? "bg-indigo-600" : "bg-slate-400 dark:bg-slate-600"
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            )}

                            <div className="relative z-10 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`h-4 w-4 ${
                                    poll.allowMultipleAnswers ? "rounded" : "rounded-full"
                                  } border flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected
                                      ? "border-indigo-600 bg-indigo-600 text-white"
                                      : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                  }`}
                                >
                                  {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>
                                <span className="break-words">{opt.text}</span>
                              </div>

                              {revealResults && (
                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                  {percent}% ({opt.votes ?? 0})
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {poll.submissionMode === "SINGLE_SUBMIT" && !poll.hasVoted && (
                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">
                          {draft.length > 0
                            ? `${draft.length} option${draft.length > 1 ? "s" : ""} selected`
                            : "Select an option to cast your vote"}
                        </span>
                        <Button
                          size="sm"
                          disabled={draft.length === 0 || isVoting || isGuest}
                          onClick={() => handleSubmitSinglePoll(poll)}
                          className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                        >
                          Submit Vote
                        </Button>
                      </div>
                    )}

                    {errorMsg && <p className="text-xs text-rose-600 font-semibold">{errorMsg}</p>}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-3">
                        <span>{poll.totalVotes} responses recorded</span>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenCommentPollIds((prev) => ({
                              ...prev,
                              [poll.id]: !prev[poll.id],
                            }))
                          }
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>
                            {poll.commentCount !== undefined
                              ? `${poll.commentCount} comments`
                              : "Comments"}
                          </span>
                        </button>
                      </div>
                      {poll.closesAt && (
                        <span>
                          Open until{" "}
                          {new Date(poll.closesAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>

                    {/* Expandable Poll Comments */}
                    <PollCommentSection
                      postId={poll.postId}
                      isOpen={Boolean(openCommentPollIds[poll.id])}
                      isGuest={isGuest}
                    />
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════
            RIGHT DIVISION (lg:col-span-5 xl:col-span-4):
            SEPARATE DIVISION FOR COMPLAINT POLLS (Per Wireframe)
            3 Categories: General (Default), Section Level, Campus Level
            ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          <Card className="border-slate-200/90 dark:border-slate-800 dark:bg-slate-900 shadow-2xs overflow-hidden">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Complaint Polls
                    </CardTitle>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowComplaintInfoTooltip(!showComplaintInfoTooltip)}
                        className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        title="Complaint poll calculation rules"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                      {showComplaintInfoTooltip && (
                        <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-68 bg-slate-900 text-white text-[11px] rounded-xl p-3 shadow-2xl z-50 border border-slate-700 leading-relaxed space-y-1.5">
                          <div className="flex items-center justify-between pb-1 border-b border-slate-800 font-bold">
                            <span className="flex items-center gap-1">
                              <Info className="h-3 w-3 text-cyan-400" />
                              <span>Calculation Rules</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowComplaintInfoTooltip(false)}
                              className="text-slate-400 hover:text-white"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                          <p>
                            • <b>Section Level:</b> % calculated against total students enrolled in
                            the section.
                          </p>
                          <p>
                            • <b>Batch Level:</b> % calculated against total students enrolled in
                            the batch.
                          </p>
                          <p>
                            • <b>Campus Level:</b> % calculated against total students enrolled in
                            the campus.
                          </p>
                          <p>
                            • <b>General Complaints:</b> % calculated based on total users who
                            answered the poll.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Official grievance balloting & student issue escalation.
                  </p>
                </div>
              </div>

              {!isGuest && (
                <button
                  type="button"
                  onClick={() => {
                    setPollKind("COMPLAINT");
                    setShowCreateModal(true);
                  }}
                  className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  title="Raise Complaint Poll"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </CardHeader>

            {/* 4 Categories: General (Default), Section Level, Batch Level, Campus Level */}
            <div className="p-1.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850 grid grid-cols-4 gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => setComplaintCategory("GENERAL")}
                className={`py-1.5 px-1 rounded-lg font-bold text-center transition-all cursor-pointer ${
                  complaintCategory === "GENERAL"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                }`}
              >
                General
              </button>
              <button
                type="button"
                onClick={() => setComplaintCategory("SECTION")}
                className={`py-1.5 px-1 rounded-lg font-bold text-center transition-all cursor-pointer ${
                  complaintCategory === "SECTION"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                }`}
              >
                Section
              </button>
              <button
                type="button"
                onClick={() => setComplaintCategory("BATCH")}
                className={`py-1.5 px-1 rounded-lg font-bold text-center transition-all cursor-pointer ${
                  complaintCategory === "BATCH"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                }`}
              >
                Batch
              </button>
              <button
                type="button"
                onClick={() => setComplaintCategory("CAMPUS")}
                className={`py-1.5 px-1 rounded-lg font-bold text-center transition-all cursor-pointer ${
                  complaintCategory === "CAMPUS"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                }`}
              >
                Campus
              </button>
            </div>

            <CardContent className="p-3.5 space-y-3.5">
              {filteredComplaintPolls.length === 0 ? (
                <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <ShieldAlert className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No active complaint polls in this category.
                  </p>
                </div>
              ) : (
                filteredComplaintPolls.map((poll) => {
                  const draft = draftSelections[poll.id] ?? [];
                  const activeSelectedIds = poll.hasVoted ? poll.userSelectedOptionIds : draft;
                  const isVoting = votingPollId === poll.id;

                  return (
                    <div
                      key={poll.id}
                      className="p-3.5 rounded-2xl border border-rose-200/80 dark:border-rose-950 bg-rose-50/20 dark:bg-slate-900 space-y-2.5 shadow-2xs"
                    >
                      {/* Poll Creator Header */}
                      <PollCreatorHeader
                        authorName={poll.authorName}
                        authorUsername={poll.authorUsername}
                        authorAvatarUrl={poll.authorAvatarUrl}
                        authorRole={poll.authorRole}
                        authorCampus={poll.authorCampus}
                        createdAt={poll.createdAt}
                        isAnonymous={poll.isAnonymous}
                        onReport={() => setReportingPollPostId(poll.postId)}
                      />

                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                          {poll.complaintLevel === "SECTION"
                            ? `${poll.section || "Section"} Grievance`
                            : poll.complaintLevel === "BATCH"
                              ? `${poll.batch ? `Batch ${poll.batch}` : "Batch"} Grievance`
                              : poll.complaintLevel === "CAMPUS"
                                ? "Campus Grievance"
                                : "General Grievance"}
                        </span>

                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          <span>Active Ballot</span>
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {poll.question}
                      </h4>

                      <div className="space-y-1.5 pt-0.5">
                        {poll.options.map((opt) => {
                          const isSelected = activeSelectedIds.includes(opt.id);
                          const revealResults = poll.hasVoted && opt.percent !== null;
                          const percent = opt.percent ?? 0;

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              disabled={isGuest || poll.isLocked || isVoting}
                              onClick={() => handleOptionClick(poll, opt.id)}
                              className={`w-full text-left p-2.5 rounded-xl border relative overflow-hidden transition-all text-xs font-medium ${
                                isSelected
                                  ? "border-rose-600 bg-rose-50 dark:bg-rose-950/50 text-rose-950 dark:text-rose-200 font-bold"
                                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 text-slate-800 dark:text-slate-200"
                              } ${isGuest || poll.isLocked ? "cursor-default" : "cursor-pointer"}`}
                            >
                              {revealResults && (
                                <div
                                  className="absolute top-0 bottom-0 left-0 bg-rose-200/50 dark:bg-rose-900/40 opacity-40 transition-all duration-500"
                                  style={{ width: `${percent}%` }}
                                />
                              )}

                              <div className="relative z-10 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div
                                    className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? "border-rose-600 bg-rose-600 text-white"
                                        : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                    }`}
                                  >
                                    {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                  </div>
                                  <span className="truncate">{opt.text}</span>
                                </div>

                                {revealResults && (
                                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 shrink-0">
                                    {percent}% ({opt.votes ?? 0})
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {!poll.hasVoted && (
                        <div className="pt-1 flex justify-end">
                          <Button
                            size="sm"
                            disabled={draft.length === 0 || isVoting || isGuest}
                            onClick={() => handleSubmitSinglePoll(poll)}
                            className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold py-1 px-3"
                          >
                            Submit Response
                          </Button>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-rose-100 dark:border-slate-800 text-[10px] text-slate-400">
                        <div className="flex items-center gap-3">
                          <span>{poll.totalVotes} student responses</span>
                          <button
                            type="button"
                            onClick={() =>
                              setOpenCommentPollIds((prev) => ({
                                ...prev,
                                [poll.id]: !prev[poll.id],
                              }))
                            }
                            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-300 transition-colors cursor-pointer"
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span>
                              {poll.commentCount !== undefined
                                ? `${poll.commentCount} comments`
                                : "Comments"}
                            </span>
                          </button>
                        </div>
                        {poll.closesAt && (
                          <span>
                            Closes{" "}
                            {new Date(poll.closesAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                      </div>

                      {/* Expandable Poll Comments */}
                      <PollCommentSection
                        postId={poll.postId}
                        isOpen={Boolean(openCommentPollIds[poll.id])}
                        isGuest={isGuest}
                      />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── CREATE POLL MODAL (Supports Complaint Poll, Open Till, Digital Clock, Expiration Auto-Delete) ── */}
      {showCreateModal && (
        <Modal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title={pollKind === "COMPLAINT" ? "Create Complaint Poll" : "Create Community Poll"}
          className="max-w-lg"
        >
          <form onSubmit={handleCreatePoll} className="space-y-4 pt-2 text-xs">
            {createError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            {/* 1. OPTION TO MAKE IT AS COMPLAINT POLL IN THE TOP */}
            <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1.5">
                Poll Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPollKind("STANDARD")}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    pollKind === "STANDARD"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Community Poll</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPollKind("COMPLAINT")}
                  className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    pollKind === "COMPLAINT"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Complaint Poll</span>
                </button>
              </div>
            </div>

            {pollKind === "STANDARD" && (
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Target Batch (Optional)
                </label>
                <input
                  type="text"
                  value={pollBatch}
                  onChange={(e) => setPollBatch(e.target.value)}
                  placeholder="e.g. 2024, 2025 (leave blank for all)"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-xs"
                />
              </div>
            )}

            {/* 2. IN COMPLAINT POLL: SELECTION - SECTION OR CAMPUS OR GENERAL */}
            {pollKind === "COMPLAINT" && (
              <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 space-y-2.5">
                <label className="text-[11px] font-bold text-rose-900 dark:text-rose-200 block">
                  Complaint Scope Category
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: "GENERAL", label: "General" },
                      { id: "CAMPUS", label: "Campus" },
                      { id: "BATCH", label: "Batch" },
                      { id: "SECTION", label: "Section" },
                    ] as const
                  ).map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => {
                        setComplaintKindLevel(lvl.id);
                        if (lvl.id === "SECTION" && currentUserSection) {
                          setComplaintSectionName(currentUserSection);
                        }
                        if (lvl.id === "BATCH" && currentUserBatch) {
                          setComplaintBatchName(currentUserBatch);
                        }
                      }}
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        complaintKindLevel === lvl.id
                          ? "bg-rose-600 text-white shadow-2xs"
                          : "bg-white dark:bg-slate-800 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900 hover:bg-rose-100/50"
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>

                {complaintKindLevel === "SECTION" && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold text-rose-800 dark:text-rose-300">
                        Target Section
                      </label>
                      {currentUserSection && (
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                          Auto-selected: {currentUserSection}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={complaintSectionName}
                      onChange={(e) => setComplaintSectionName(e.target.value)}
                      placeholder="e.g. Sec 1, Sec 2, Section A"
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100"
                    />
                  </div>
                )}

                {complaintKindLevel === "BATCH" && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold text-rose-800 dark:text-rose-300">
                        Target Batch
                      </label>
                      {currentUserBatch && (
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                          Auto-selected: Batch {currentUserBatch}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={complaintBatchName}
                      onChange={(e) => setComplaintBatchName(e.target.value)}
                      placeholder="e.g. 2024, 2025"
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100"
                    />
                  </div>
                )}

                {complaintKindLevel === "CAMPUS" && (
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300 block">
                        Target Campus
                      </span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {currentUserCampusName || "My Campus"}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                      Auto-selected
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Question */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {pollKind === "COMPLAINT" ? "Complaint / Grievance Statement" : "Poll Question"}
              </label>
              <textarea
                rows={2}
                required
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder={
                  pollKind === "COMPLAINT"
                    ? "Clearly describe the issue, location, and requested resolution..."
                    : "Ask a question to your community…"
                }
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none text-xs"
              />
            </div>

            {/* Answer Options */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700 dark:text-slate-300 block">
                  Voting Options (At least 2 required)
                </label>
                {optionsInputs.length < 8 && (
                  <button
                    type="button"
                    onClick={() => setOptionsInputs([...optionsInputs, ""])}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Option +</span>
                  </button>
                )}
              </div>
              {optionsInputs.map((val, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={val}
                  onChange={(e) => {
                    const copy = [...optionsInputs];
                    copy[idx] = e.target.value;
                    setOptionsInputs(copy);
                  }}
                  placeholder={`Option ${idx + 1}`}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
                />
              ))}
            </div>

            {/* 3. POLL OPEN TILL - DATE (CALENDAR) AND TIME (DIGITAL CLOCK STYLE) */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Poll Open Till (Deadline)</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Date Picker (Calendar) */}
                <div>
                  <input
                    type="date"
                    value={openTillDate}
                    onChange={(e) => setOpenTillDate(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Time Picker (Digital Clock Style) */}
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={openTillTime}
                      onChange={(e) => setOpenTillTime(e.target.value)}
                      className="flex-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 font-mono"
                    />
                    {/* Digital Clock Display Badge */}
                    <div className="px-2.5 py-1.5 bg-slate-950 text-cyan-400 font-mono rounded-xl text-xs font-black tracking-widest border border-cyan-500/30 shadow-xs flex items-center shrink-0">
                      {openTillTime || "18:00"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. CHECKBOX: DELETE POLL AFTER POLL TIME ENDS (NOT FOR COMPLAINT POLL) */}
            {pollKind !== "COMPLAINT" && (
              <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  id="poll-auto-delete"
                  checked={autoDeleteOnExpire}
                  onChange={(e) => setAutoDeleteOnExpire(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label
                  htmlFor="poll-auto-delete"
                  className="font-medium text-slate-700 dark:text-slate-300 cursor-pointer text-xs"
                >
                  Delete poll after the poll time ends
                </label>
              </div>
            )}

            {/* Answer Selection & Submission Mode */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Answer Selection
                </label>
                <select
                  value={allowMultipleAnswers ? "MULTIPLE" : "SINGLE"}
                  onChange={(e) => setAllowMultipleAnswers(e.target.value === "MULTIPLE")}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100"
                >
                  <option value="SINGLE">Single Choice</option>
                  <option value="MULTIPLE">Multiple Choice</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Submission Rule
                </label>
                <select
                  value={submissionMode}
                  onChange={(e) =>
                    setSubmissionMode(e.target.value as "SINGLE_SUBMIT" | "MULTIPLE_SUBMIT")
                  }
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100"
                >
                  <option value="SINGLE_SUBMIT">Answer Once (Submit Button)</option>
                  <option value="MULTIPLE_SUBMIT">Multiple Submit (Changeable)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
              <input
                type="checkbox"
                id="poll-anon"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label
                htmlFor="poll-anon"
                className="font-medium text-slate-700 dark:text-slate-300 cursor-pointer text-xs"
              >
                Anonymous submission
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className={`text-xs text-white font-bold ${
                  pollKind === "COMPLAINT"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {creating
                  ? "Publishing..."
                  : pollKind === "COMPLAINT"
                    ? "Publish Complaint Poll"
                    : "Publish Poll"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── REPORT POLL MODAL ── */}
      {reportingPollPostId && (
        <Modal
          open={Boolean(reportingPollPostId)}
          onClose={() => {
            setReportingPollPostId(null);
            setReportSuccess(false);
            setReportDetails("");
          }}
          title="Report Poll"
          className="max-w-md"
        >
          {reportSuccess ? (
            <div className="p-6 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Report Submitted
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Thank you for your report. Campus moderators will review this poll.
              </p>
              <Button
                onClick={() => {
                  setReportingPollPostId(null);
                  setReportSuccess(false);
                  setReportDetails("");
                }}
                className="text-xs font-bold"
              >
                Done
              </Button>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!reportingPollPostId || submittingReport) return;
                setSubmittingReport(true);
                try {
                  const res = await fetch("/api/reports", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      contentType: "POST",
                      postId: reportingPollPostId,
                      reason: reportReason,
                      details: reportDetails.trim(),
                    }),
                  });
                  if (res.ok) {
                    setReportSuccess(true);
                  }
                } catch {
                  // silent
                } finally {
                  setSubmittingReport(false);
                }
              }}
              className="space-y-4 pt-2 text-xs"
            >
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Reason for reporting
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100"
                >
                  <option value="SPAM">Spam or misleading</option>
                  <option value="HARASSMENT">Harassment or bullying</option>
                  <option value="HATE_SPEECH">Hate speech</option>
                  <option value="MISINFORMATION">Misinformation</option>
                  <option value="INAPPROPRIATE">Inappropriate content</option>
                  <option value="OTHER">Other issue</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Additional Details (Optional)
                </label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide any additional context for campus administrators..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 resize-none text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setReportingPollPostId(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingReport}
                  className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  {submittingReport ? "Submitting..." : "Submit Report"}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
