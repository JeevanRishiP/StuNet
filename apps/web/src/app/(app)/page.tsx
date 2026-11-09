"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { Route } from "next";
import {
  Users,
  Send,
  MoreHorizontal,
  Heart,
  MessageSquare,
  Share2,
  Flag,
  UserX,
  CheckCircle2,
  Clock,
  Sparkles,
  Copy,
  Check,
  GraduationCap,
  Building2,
  Eye,
  Shield,
  Bell,
  CornerDownRight,
  Calendar,
  BarChart3,
  Plus,
  Award,
  Globe,
  Tag,
  Filter,
  ChevronDown,
  X,
  ArrowRight,
} from "lucide-react";
import { Avatar, Button, Card, CardContent, CardFooter, CardHeader, Modal } from "@stunet/ui";
import AdvancedSelectList from "@/components/AdvancedSelectList";

interface PostAuthor {
  id?: string | null;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  headline?: string | null;
  verificationStatus?: "PENDING" | "VERIFIED" | "REJECTED";
  campus?: { slug: string; name: string } | null;
  role?: "STUDENT" | "FACULTY" | "ALUMNI" | "SUPER_ADMIN" | "CAMPUS_MANAGER";
}

interface PostCommentItem {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    role: string;
  };
  replies?: PostCommentItem[];
}

interface Post {
  id: string;
  content?: string;
  body?: string;
  type?: string;
  visibility: "PUBLIC" | "CONNECTIONS" | "CAMPUS";
  targetConnectionScope?: "ALL" | "CONNECTED";
  targetRoles?: string[];
  isAnonymous?: boolean;
  likeCount?: number;
  commentCount?: number;
  viewCount?: number;
  likedBySummary?: string;
  viewerHasLiked?: boolean;
  createdAt: string;
  authorId?: string | null;
  author: PostAuthor;
  _count?: { comments: number };
  isConnection?: boolean;
  isAlumni?: boolean;
  isFaculty?: boolean;
}

interface FeedResponse {
  posts?: Post[];
  items?: Post[];
  nextCursor?: string | null;
  hasMore?: boolean;
}

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

// Helper to extract Title & Body from Markdown-formatted post bodies
function parsePostBody(rawText?: string | null) {
  if (!rawText) return { title: null, content: "" };
  if (rawText.startsWith("# ")) {
    const newline = rawText.indexOf("\n");
    if (newline !== -1) {
      return {
        title: rawText.slice(2, newline).trim(),
        content: rawText.slice(newline + 1).trim(),
      };
    }
    return { title: rawText.slice(2).trim(), content: "" };
  }
  return { title: null, content: rawText };
}

export default function FeedPage(): React.JSX.Element {
  const { data: session } = useSession();
  const isGuest = Boolean(session?.user?.isGuest || session?.user?.role === "GUEST");
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // 4 Primary Stream Sections: Students • All • Faculty • Alumni
  const [streamSection, setStreamSection] = useState<"STUDENTS" | "ALL" | "FACULTY" | "ALUMNI">(
    "STUDENTS",
  );

  // Sub-Filters: All • Following • Connected
  const [subFilter, setSubFilter] = useState<"ALL" | "FOLLOWING" | "CONNECTED">("ALL");

  // Flipkart-Style Multi-Campus Selection Filter
  const [selectedCampuses, setSelectedCampuses] = useState<string[]>([]);

  // Tag filter state
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [isFiltersDropdownOpen, setIsFiltersDropdownOpen] = useState(false);
  const [isStickyFiltersDropdownOpen, setIsStickyFiltersDropdownOpen] = useState(false);

  // Floating Filter Bar visibility:
  // - Initially at top of feed (scrollY < 220): hidden so in-flow sections 1, 2, 3 show normally
  // - Down in feed (scrollY >= 220):
  //     - Scrolling DOWN (delta > 0): hidden off-screen (-translate-y-36)
  //     - Scrolling UP (delta < 0): slides down from top into view (Sections 2 & 3 only)
  // - Returning near top (scrollY < 220): hides so in-flow sections 1, 2, 3 resume normal display
  const [showFloatingFilterBar, setShowFloatingFilterBar] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    function handleScroll() {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY.current;

      if (currentScrollY < 220) {
        // Approaching top: Hide floating bar so Section 1, 2, 3 appear normally in-flow
        setShowFloatingFilterBar(false);
      } else if (Math.abs(delta) > 4) {
        if (delta > 0) {
          // Scrolling down through posts: hide floating bar
          setShowFloatingFilterBar(false);
        } else {
          // Scrolling up / reverse scroll: slide Sections 2 & 3 down from top
          setShowFloatingFilterBar(true);
        }
      }
      lastScrollY.current = currentScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // New Post Form Modal State (strictly matches Forms_for_StuNet.md)
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [targetUserScope, setTargetUserScope] = useState<"ALL" | "CONNECTED">("ALL");
  const [targetRoles, setTargetRoles] = useState<string[]>(["STUDENT", "FACULTY", "ALUMNI"]);
  const [postTags, setPostTags] = useState("");
  const [isAnonymousPost, setIsAnonymousPost] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // Real engagement state: likes, liked-by text, view counts
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likedBySummaries, setLikedBySummaries] = useState<Record<string, string>>({});
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const viewedPostIds = useRef<Set<string>>(new Set());

  // Comments state: loaded per post from API
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [postCommentsMap, setPostCommentsMap] = useState<Record<string, PostCommentItem[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [replyingToCommentId, setReplyingToCommentId] = useState<Record<string, string | null>>({});

  // Active overflow menu popover
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);

  // Right Rail: Notifications Sections (All • Network & Group • Campus)
  const [notificationTab, setNotificationTab] = useState<"ALL" | "NETWORK" | "CAMPUS">("ALL");

  // Right Rail: Campus Events Timeframe Tabs (Today • This Week • This Month)
  const [campusEventTab, setCampusEventTab] = useState<"TODAY" | "WEEK" | "MONTH">("TODAY");

  // Right Rail: Poll Sections (All • Students • Faculty • Alumni)
  const [pollSectionTab, setPollSectionTab] = useState<"ALL" | "STUDENTS" | "FACULTY" | "ALUMNI">(
    "ALL",
  );
  // Radio selection before submitting vote
  const [pollSelectedOptions, setPollSelectedOptions] = useState<Record<string, string>>({});
  // Submitted poll votes: once submitted, voting percentages reveal and user cannot vote again
  const [pollSubmittedVotes, setPollSubmittedVotes] = useState<Record<string, string>>({});

  // Campus Page Events strictly related to campus (CIA, IA, internal college schedules)
  const campusEventsData = {
    TODAY: [
      {
        id: "ce-1",
        title: "Arts Club Showcase",
        time: "3:00 PM",
        venue: "Room 3 • First Floor • Tech Block",
        type: "Club Activity",
      },
      {
        id: "ce-2",
        title: "CIA 2 Submission Helpdesk",
        time: "4:30 PM",
        venue: "Tech Lab 1 • S-VYASA",
        type: "Academic",
      },
    ],
    WEEK: [
      {
        id: "ce-3",
        title: "CIA 2 English Submission Deadline",
        time: "Nov 15 • 11:59 PM",
        venue: "Campus Academic Portal",
        type: "Academic Submission",
      },
      {
        id: "ce-4",
        title: "Campus Sports Fest Tryouts",
        time: "Nov 18 • 4:00 PM",
        venue: "Main University Ground",
        type: "Sports",
      },
    ],
    MONTH: [
      {
        id: "ce-5",
        title: "Internal Assessment 2 (IA 2) Exams",
        time: "Nov 24 - Nov 28",
        venue: "Campus Examination Halls",
        type: "Term Exam",
      },
      {
        id: "ce-6",
        title: "Campus Cultural Fest 'Tarang'",
        time: "Nov 30 • Full Day",
        venue: "University Auditorium",
        type: "College Fest",
      },
    ],
  };

  // Dynamic Poll Definitions per Section
  const pollsData = {
    ALL: {
      id: "poll-all",
      question: "Should the campus library remain open 24/7 during IA exams?",
      totalVotes: 342,
      options: [
        { id: "opt-1", label: "Yes, definitely 24/7", pct: 78 },
        { id: "opt-2", label: "Open until 2:00 AM", pct: 18 },
        { id: "opt-3", label: "No change needed", pct: 4 },
      ],
    },
    STUDENTS: {
      id: "poll-students",
      question: "Which domain should the upcoming weekend club workshop focus on?",
      totalVotes: 215,
      options: [
        { id: "opt-1", label: "Generative AI & LLMs", pct: 54 },
        { id: "opt-2", label: "Full-Stack Next.js 15", pct: 32 },
        { id: "opt-3", label: "Rust & Systems Programming", pct: 14 },
      ],
    },
    FACULTY: {
      id: "poll-faculty",
      question: "Preferred schedule format for Semester 4 CIA presentations?",
      totalVotes: 48,
      options: [
        { id: "opt-1", label: "Continuous 2-Day Block", pct: 60 },
        { id: "opt-2", label: "Staggered Afternoon Slots", pct: 30 },
        { id: "opt-3", label: "Weekend Special Camp", pct: 10 },
      ],
    },
    ALUMNI: {
      id: "poll-alumni",
      question: "Would you participate in a virtual alumni 1:1 resume & mentorship week?",
      totalVotes: 86,
      options: [
        { id: "opt-1", label: "Yes, sign me up for 2 slots!", pct: 72 },
        { id: "opt-2", label: "Interested next month", pct: 20 },
        { id: "opt-3", label: "Prefer group AMA webinars", pct: 8 },
      ],
    },
  };

  // Report Modal state
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("SPAM");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Copy toast state
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const stickyFiltersRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuPostId(null);
      }
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setIsFiltersDropdownOpen(false);
      }
      if (stickyFiltersRef.current && !stickyFiltersRef.current.contains(e.target as Node)) {
        setIsStickyFiltersDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Infinite scroll refs to eliminate flicker and redundant requests
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const cursorRef = useRef<string | null>(null);

  useEffect(() => {
    isLoadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  // Fetch feed items
  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMoreRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (cursorRef.current) params.set("cursor", cursorRef.current);
      if (streamSection !== "ALL") params.set("tab", streamSection);
      if (activeTag) params.set("tag", activeTag);

      const res = await fetch(`/api/posts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load feed");
      const data: FeedResponse = await res.json();
      const incoming: Post[] = Array.isArray(data.posts)
        ? data.posts
        : Array.isArray(data.items)
          ? data.items
          : [];

      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const filteredNew = incoming.filter((p) => !existingIds.has(p.id));
        return [...prev, ...filteredNew];
      });

      // Populate engagement states
      incoming.forEach((p) => {
        if (p.viewerHasLiked !== undefined) {
          setLikedPosts((prev) => ({ ...prev, [p.id]: Boolean(p.viewerHasLiked) }));
        }
        if (p.likeCount !== undefined) {
          setLikeCounts((prev) => ({ ...prev, [p.id]: p.likeCount ?? 0 }));
        }
        if (p.likedBySummary) {
          setLikedBySummaries((prev) => ({ ...prev, [p.id]: p.likedBySummary ?? "" }));
        }
        if (p.viewCount !== undefined) {
          setViewCounts((prev) => ({ ...prev, [p.id]: p.viewCount ?? 0 }));
        }
      });

      const nextC = data.nextCursor ?? null;
      cursorRef.current = nextC;
      hasMoreRef.current = Boolean(nextC);
      setCursor(nextC);
      setHasMore(Boolean(nextC));
    } catch {
      // ignore
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
      setInitialLoading(false);
    }
  }, [streamSection, activeTag]);

  const [feedRefreshKey, setFeedRefreshKey] = useState(0);

  useEffect(() => {
    function handleResetFeed() {
      setStreamSection("STUDENTS");
      setSubFilter("ALL");
      setSelectedCampuses([]);
      setActiveTag(null);
      setPosts([]);
      cursorRef.current = null;
      hasMoreRef.current = true;
      isLoadingRef.current = false;
      setCursor(null);
      setHasMore(true);
      setFeedRefreshKey((prev) => prev + 1);
    }
    window.addEventListener("stunet:reset-feed", handleResetFeed);
    return () => window.removeEventListener("stunet:reset-feed", handleResetFeed);
  }, []);

  useEffect(() => {
    // Reset and reload on streamSection, activeTag, or feedRefreshKey change
    setPosts([]);
    cursorRef.current = null;
    hasMoreRef.current = true;
    isLoadingRef.current = false;
    setCursor(null);
    setHasMore(true);
    setInitialLoading(true);
  }, [streamSection, activeTag, feedRefreshKey]);

  useEffect(() => {
    if (initialLoading) {
      loadMore();
    }
  }, [initialLoading, loadMore]);

  // Infinite scroll observer: Only triggers when sentinel intersects, hasMore is true, and not loading
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingRef.current && hasMoreRef.current) {
          loadMore();
        }
      },
      { rootMargin: "150px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  // View tracking observer on post cards
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const postId = el.dataset.postId;
            if (postId && !viewedPostIds.current.has(postId)) {
              viewedPostIds.current.add(postId);
              fetch(`/api/posts/${postId}/view`, { method: "POST" })
                .then((r) => r.json())
                .then((d) => {
                  if (d.viewCount !== undefined) {
                    setViewCounts((prev) => ({ ...prev, [postId]: d.viewCount }));
                  }
                })
                .catch(() => null);
            }
          }
        });
      },
      { threshold: 0.4 },
    );

    document.querySelectorAll("[data-post-card]").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [posts]);

  // Add tag suggestion into composer
  function handleAddComposerTag(tag: string) {
    const formatted = `#${tag}`;
    if (!postTags.includes(formatted)) {
      setPostTags((prev) => (prev ? `${prev} ${formatted}` : formatted));
    }
  }

  // Create post handler (strictly matches Forms_for_StuNet.md)
  async function handleCreatePost() {
    if (!postContent.trim() && !postTitle.trim()) return;
    setPosting(true);
    setPostError(null);

    const tagsArray = postTags
      .split(/[\s,#]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const fullBody = postTitle.trim()
      ? `# ${postTitle.trim()}\n\n${postContent.trim()}`
      : postContent.trim();

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: fullBody,
          visibility: targetUserScope === "CONNECTED" ? "CONNECTIONS" : "PUBLIC",
          targetConnectionScope: targetUserScope,
          targetRoles,
          isAnonymous: isAnonymousPost,
          tags: tagsArray,
        }),
      });

      if (res.status === 429) {
        setPostError("You're posting too fast — please wait a moment.");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setPostError((body as { error?: string }).error ?? "Failed to publish post.");
        return;
      }

      const newPost: Post = await res.json();
      setPosts((prev) => [newPost, ...prev]);
      setPostTitle("");
      setPostContent("");
      setPostTags("");
      setIsAnonymousPost(false);
      setTargetRoles(["STUDENT", "FACULTY", "ALUMNI"]);
      setTargetUserScope("ALL");
      setIsCreatePostModalOpen(false);
    } catch {
      setPostError("Network error while publishing post.");
    } finally {
      setPosting(false);
    }
  }

  // Toggle Like with real API call
  async function handleToggleLike(postId: string) {
    const isCurrentlyLiked = likedPosts[postId] ?? false;
    const currentCount = likeCounts[postId] ?? 0;

    // Optimistic local update
    setLikedPosts((prev) => ({ ...prev, [postId]: !isCurrentlyLiked }));
    setLikeCounts((prev) => ({
      ...prev,
      [postId]: isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
    }));

    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLikedPosts((prev) => ({ ...prev, [postId]: data.liked }));
        setLikeCounts((prev) => ({ ...prev, [postId]: data.likeCount }));
        if (data.likedBySummary) {
          setLikedBySummaries((prev) => ({ ...prev, [postId]: data.likedBySummary }));
        }
      }
    } catch {
      // Revert on error
      setLikedPosts((prev) => ({ ...prev, [postId]: isCurrentlyLiked }));
      setLikeCounts((prev) => ({ ...prev, [postId]: currentCount }));
    }
  }

  // Toggle comments and fetch if not loaded
  async function handleToggleComments(postId: string) {
    const willOpen = !expandedComments[postId];
    setExpandedComments((prev) => ({ ...prev, [postId]: willOpen }));

    if (willOpen && !postCommentsMap[postId]) {
      setCommentsLoading((prev) => ({ ...prev, [postId]: true }));
      try {
        const res = await fetch(`/api/posts/${postId}/comments`);
        if (res.ok) {
          const json = await res.json();
          setPostCommentsMap((prev) => ({ ...prev, [postId]: json.items || [] }));
        }
      } catch {
        // ignore
      } finally {
        setCommentsLoading((prev) => ({ ...prev, [postId]: false }));
      }
    }
  }

  // Add Comment or Reply
  async function handleAddComment(postId: string) {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    const parentId = replyingToCommentId[postId] ?? null;

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          parentCommentId: parentId,
        }),
      });

      if (res.ok) {
        const newComment: PostCommentItem = await res.json();
        setPostCommentsMap((prev) => {
          const existing = prev[postId] ?? [];
          let updatedList: PostCommentItem[];
          if (parentId) {
            updatedList = existing.map((c) =>
              c.id === parentId ? { ...c, replies: [...(c.replies ?? []), newComment] } : c,
            );
          } else {
            updatedList = [...existing, newComment];
          }
          return {
            ...prev,
            [postId]: updatedList,
          };
        });
        setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
        setReplyingToCommentId((prev) => ({ ...prev, [postId]: null }));
      }
    } catch (err) {
      console.error("Failed to post comment", err);
    }
  }

  function handleCopyLink(postId: string) {
    const url = `${window.location.origin}/#post-${postId}`;
    navigator.clipboard.writeText(url);
    setCopiedPostId(postId);
    setTimeout(() => setCopiedPostId(null), 2000);
    setActiveMenuPostId(null);
  }

  async function handleBlockUser(authorId?: string | null, authorName?: string | null) {
    if (!authorId || authorId === "anonymous") return;
    if (!window.confirm(`Are you sure you want to block ${authorName}? You won't see their posts.`))
      return;

    try {
      const res = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: authorId }),
      });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.authorId !== authorId));
      }
    } catch {
      alert("Failed to block user.");
    }
    setActiveMenuPostId(null);
  }

  async function handleSubmitReport() {
    if (!reportingPostId) return;
    setSubmittingReport(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: "POST",
          postId: reportingPostId,
          reason: reportReason,
          details: reportDetails.trim() || undefined,
        }),
      });
      if (res.ok) {
        setReportSuccess(true);
        setTimeout(() => {
          setReportingPostId(null);
          setReportSuccess(false);
          setReportDetails("");
        }, 1500);
      }
    } finally {
      setSubmittingReport(false);
    }
  }

  function formatTimeAgo(isoString: string) {
    try {
      const diff = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "Just now";
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      if (days < 7) return `${days}d ago`;
      return new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "Recently";
    }
  }

  // Filter posts on client for sub-filters, Flipkart-style multi-campuses, and active tag
  const filteredPosts = posts.filter((p) => {
    // 1. Primary stream section check
    if (streamSection === "STUDENTS" && p.author.role !== "STUDENT") return false;
    if (streamSection === "FACULTY" && p.author.role !== "FACULTY") return false;
    if (streamSection === "ALUMNI" && p.author.role !== "ALUMNI") return false;

    // 2. Sub-filters: All • Following • Connected
    if (subFilter === "CONNECTED" && !p.isConnection) return false;
    if (subFilter === "FOLLOWING" && !p.isConnection && p.author.role !== "FACULTY") return false;

    // 3. Flipkart-Style Multi-Campus Filter
    if (selectedCampuses.length > 0) {
      const authorCampName = p.author.campus?.name;
      const authorCampSlug = p.author.campus?.slug;
      const matches = selectedCampuses.some(
        (c) =>
          c === authorCampName ||
          c === authorCampSlug ||
          (authorCampName && authorCampName.includes(c)),
      );
      if (!matches) return false;
    }

    return true;
  });

  const currentPoll = pollsData[pollSectionTab];
  const selectedPollOption = pollSelectedOptions[pollSectionTab];
  const submittedPollOption = pollSubmittedVotes[pollSectionTab];
  const hasVotedOnCurrentPoll = Boolean(submittedPollOption);
  const currentCampusEvents = campusEventsData[campusEventTab];

  // Helper to render Sections 2 & 3 in both In-Flow (normal document flow) and Floating (revealed when scrolling up in feed)
  const renderFilterSections = (isFloating: boolean = false) => {
    const isDropdownOpen = isFloating ? isStickyFiltersDropdownOpen : isFiltersDropdownOpen;
    const setIsDropdownOpen = isFloating
      ? setIsStickyFiltersDropdownOpen
      : setIsFiltersDropdownOpen;
    const currentRef = isFloating ? stickyFiltersRef : filtersRef;

    return (
      <div className="space-y-1.5">
        {/* Section 2: Primary Stream Sections: Students • All • Faculty • Alumni */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
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
                className={`py-2 px-1.5 sm:px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  isActive
                    ? tab.id === "FACULTY"
                      ? "bg-purple-600 text-white shadow-xs"
                      : tab.id === "ALUMNI"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Section 3: Sub-Filters Row: All 5 items in the exact same line without clipping */}
        <div className="flex items-center justify-between gap-1.5 p-1.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center gap-1 shrink-0">
            {/* 1. All */}
            <button
              type="button"
              onClick={() => {
                setSubFilter("ALL");
                setActiveTag(null);
                setSelectedCampuses([]);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                subFilter === "ALL" && !activeTag && selectedCampuses.length === 0
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All
            </button>

            {/* 2. Following (with unseen notification dot) */}
            <button
              type="button"
              onClick={() => setSubFilter("FOLLOWING")}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                subFilter === "FOLLOWING"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>Following</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
            </button>

            {/* 3. Connected (with unseen notification dot) */}
            <button
              type="button"
              onClick={() => setSubFilter("CONNECTED")}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                subFilter === "CONNECTED"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>Connected</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* 4. Campus: Flipkart-style multi-campus selector modal */}
            <AdvancedSelectList
              compact={true}
              userCampusName={session?.user?.campusName ?? "S-VYASA University"}
              selectedCampuses={selectedCampuses}
              onApplyCampuses={(camps) => setSelectedCampuses(camps)}
            />

            {/* 5. Filters: Dropdown with Trending Tags suggestions */}
            <div className="relative shrink-0" ref={currentRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                  activeTag || isDropdownOpen
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Filter className="h-3 w-3" />
                <span className="max-w-[70px] truncate">
                  {activeTag ? `#${activeTag}` : "Filters"}
                </span>
                <ChevronDown className="h-3 w-3" />
              </button>

              {/* Dropdown rendered without clipping */}
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Filter by Trending Tags</span>
                    </span>
                    {activeTag && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTag(null);
                          setIsDropdownOpen(false);
                        }}
                        className="text-[10px] text-rose-600 hover:underline flex items-center gap-0.5 font-bold"
                      >
                        <X className="h-3 w-3" />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 my-2">
                    Tap a trending topic tag to filter posts in your feed:
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {TRENDING_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setActiveTag(activeTag === tag ? null : tag);
                          setIsDropdownOpen(false);
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg font-mono font-medium transition-all ${
                          activeTag === tag
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
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
    );
  };

  return (
    // Fixed max container (max-w-[960px] mx-auto) keeps middle division centered & prevents stretching when zoomed out
    <div className="max-w-[960px] mx-auto px-3 sm:px-4 py-5">
      <div className="flex justify-center gap-7 lg:gap-8 items-start">
        {/* ── MIDDLE DIVISION: FEED COLUMN (Fixed Instagram-style width max-w-[600px] shrink-0) ── */}
        <div className="w-full max-w-[600px] shrink-0 space-y-3.5">
          {/* Section 1: Add New Post Button -> Opens New Post Form Modal */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-2xs hover:border-slate-300 transition-all">
            <div className="flex items-center gap-3">
              <Avatar
                src={session?.user?.image}
                name={session?.user?.name ?? "Student"}
                size="md"
              />
              <button
                type="button"
                onClick={() => setIsCreatePostModalOpen(true)}
                className="flex-1 text-left px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/90 text-slate-500 hover:text-slate-800 text-xs sm:text-sm font-medium border border-slate-200/80 transition-all flex items-center justify-between group"
              >
                <span className="truncate">Share something with your campus or network…</span>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg group-hover:bg-indigo-100 transition-colors shrink-0">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add New Post</span>
                </span>
              </button>
              <Button
                type="button"
                onClick={() => setIsCreatePostModalOpen(true)}
                className="sm:hidden text-xs bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl shrink-0"
                aria-label="Add New Post"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ── FLOATING SECTIONS 2 & 3 (Sticky Layer) ──
              - Takes 0px in normal layout flow (h-0 overflow-visible) so feed doesn't jump.
              - When scrolling up in the feed (scrollY >= 200, delta < 0): slides down smoothly into view (Sections 2 & 3 only).
              - When scrolling down in the feed: slides back up and hides.
              - When approaching top (scrollY < 200): hides so in-flow sections show naturally. */}
          <div className="sticky top-3 z-30 h-0 overflow-visible pointer-events-none">
            <div
              className={`transition-all duration-300 ease-out ${
                showFloatingFilterBar
                  ? "translate-y-0 opacity-100 pointer-events-auto visible"
                  : "-translate-y-36 opacity-0 pointer-events-none invisible"
              }`}
            >
              <div className="bg-slate-100/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/90 shadow-lg">
                {renderFilterSections(true)}
              </div>
            </div>
          </div>

          {/* ── IN-FLOW SECTIONS 2 & 3 (Normal Document Flow Layer) ──
              - Always rendered below Section 1 at the top of the feed.
              - Has NO sticky, NO transforms, and NO negative translations.
              - Scrolls off-screen naturally with the rest of the feed when scrolling down. */}
          <div className="space-y-2">{renderFilterSections(false)}</div>

          {/* Active Tag / Multi-Campus Filter Indicator Bar */}
          {(activeTag || selectedCampuses.length > 0) && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 font-medium">
              <span className="truncate">
                Filtering by:{" "}
                {selectedCampuses.length > 0 && <strong>{selectedCampuses.length} Campuses</strong>}
                {selectedCampuses.length > 0 && activeTag && " • "}
                {activeTag && <strong>#{activeTag}</strong>}
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveTag(null);
                  setSelectedCampuses([]);
                }}
                className="text-xs text-indigo-700 hover:text-indigo-900 hover:underline flex items-center gap-1 shrink-0 ml-2 font-bold"
              >
                <X className="h-3 w-3" />
                <span>Reset Filters</span>
              </button>
            </div>
          )}

          {/* Posts Feed */}
          {initialLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-5 border border-slate-200 animate-pulse space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-200 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 w-32 bg-slate-200 rounded" />
                      <div className="h-2.5 w-24 bg-slate-100 rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-5/6 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <Card className="border-slate-200/90 text-center py-12">
              <Sparkles className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No posts in this stream yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Be the first to publish a post or adjust your filters to see more activity.
              </p>
              <Button
                onClick={() => setIsCreatePostModalOpen(true)}
                className="mt-4 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                + Add New Post
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => {
                const author = post.author;
                const isAnonymous = Boolean(post.isAnonymous);
                const authorRole = author.role ?? "STUDENT";
                const authorName = isAnonymous
                  ? `Anonymous ${authorRole.charAt(0) + authorRole.slice(1).toLowerCase()}`
                  : (author.displayName ?? "Student");
                const isLiked = likedPosts[post.id] ?? false;
                const likeCount = likeCounts[post.id] ?? post.likeCount ?? 0;
                const likedByText = likedBySummaries[post.id] ?? post.likedBySummary;
                const comments = postCommentsMap[post.id] ?? [];
                const commentsExpanded = expandedComments[post.id] ?? false;
                const isCommentsLoading = commentsLoading[post.id] ?? false;

                const { title: parsedTitle, content: parsedContent } = parsePostBody(
                  post.body ?? post.content,
                );

                // Post Background Colour Differentiation:
                // Default - Other User's Post (White)
                // Blue - Connected User's Post
                // Gold - Alumni's Post
                // Purple - Faculty's Post
                // Dashed - Anonymous Post
                let cardBgClass = "bg-white border-slate-200/90 shadow-2xs hover:border-slate-300";
                let statusBadge = null;

                if (isAnonymous) {
                  cardBgClass =
                    "bg-slate-50/80 border-dashed border-slate-300 shadow-2xs hover:border-slate-400";
                  statusBadge = (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      <span>Anonymous</span>
                    </span>
                  );
                } else if (post.isAlumni || authorRole === "ALUMNI") {
                  cardBgClass =
                    "bg-amber-50/75 border-amber-200/90 shadow-2xs hover:border-amber-300 ring-1 ring-amber-100/70";
                  statusBadge = (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300/80 flex items-center gap-1">
                      <GraduationCap className="h-3 w-3 text-amber-600" />
                      <span>Alumni</span>
                    </span>
                  );
                } else if (post.isFaculty || authorRole === "FACULTY") {
                  cardBgClass =
                    "bg-purple-50/65 border-purple-200/90 shadow-2xs hover:border-purple-300 ring-1 ring-purple-100/70";
                  statusBadge = (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300/80 flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-purple-600" />
                      <span>Faculty</span>
                    </span>
                  );
                } else if (post.isConnection) {
                  cardBgClass =
                    "bg-blue-50/70 border-blue-200/90 shadow-2xs hover:border-blue-300 ring-1 ring-blue-100/70";
                  statusBadge = (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300/80 flex items-center gap-1">
                      <Users className="h-3 w-3 text-blue-600" />
                      <span>Connected</span>
                    </span>
                  );
                }

                return (
                  <Card
                    key={post.id}
                    id={`post-${post.id}`}
                    data-post-card
                    data-post-id={post.id}
                    className={`transition-all overflow-hidden rounded-2xl ${cardBgClass}`}
                  >
                    {/* Header */}
                    <CardHeader className="p-4 pb-2.5 flex items-start justify-between space-y-0">
                      <div className="flex items-center gap-3">
                        <Link
                          href={
                            isAnonymous
                              ? ("#" as Route)
                              : (`/u/${author.username ?? author.id}` as Route)
                          }
                          className="shrink-0"
                        >
                          <Avatar
                            src={isAnonymous ? null : author.avatarUrl}
                            name={authorName}
                            size="md"
                          />
                        </Link>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                              href={
                                isAnonymous
                                  ? ("#" as Route)
                                  : (`/u/${author.username ?? author.id}` as Route)
                              }
                              className="text-xs font-bold text-slate-900 hover:text-indigo-600 transition-colors truncate"
                            >
                              {authorName}
                            </Link>

                            {author.verificationStatus === "VERIFIED" && !isAnonymous && (
                              <span title="Verified Campus Member">
                                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                              </span>
                            )}

                            {statusBadge}
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap mt-0.5">
                            {!isAnonymous && author.username && <span>@{author.username}</span>}
                            {author.campus?.name && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[140px]">{author.campus.name}</span>
                              </>
                            )}
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5 text-slate-400" />
                              {formatTimeAgo(post.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Post Options Menu */}
                      <div className="relative">
                        <button
                          type="button"
                          aria-label="Post options"
                          onClick={() =>
                            setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id)
                          }
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {activeMenuPostId === post.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100"
                          >
                            <button
                              type="button"
                              onClick={() => handleCopyLink(post.id)}
                              className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                            >
                              {copiedPostId === post.id ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  <span className="text-emerald-600 font-semibold">
                                    Link copied!
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                                  <span>Copy post link</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setReportingPostId(post.id);
                                setActiveMenuPostId(null);
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                            >
                              <Flag className="h-3.5 w-3.5 text-rose-500" />
                              <span>Report post</span>
                            </button>

                            {!isAnonymous && author.id && author.id !== session?.user?.id && (
                              <button
                                type="button"
                                onClick={() => handleBlockUser(author.id, author.displayName)}
                                className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
                              >
                                <UserX className="h-3.5 w-3.5 text-slate-400" />
                                <span>Block user</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    {/* Content Section with Title */}
                    <CardContent className="px-4 py-2 space-y-2">
                      {/* Post Title / Subject if present */}
                      {parsedTitle && (
                        <h3 className="text-sm font-bold text-slate-900 leading-snug tracking-tight">
                          {parsedTitle}
                        </h3>
                      )}

                      {/* Post Body */}
                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {parsedContent}
                      </p>

                      {/* Audience Scope indicator */}
                      {post.targetConnectionScope === "CONNECTED" && (
                        <div className="pt-1">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                            Audience: Connected Only
                          </span>
                        </div>
                      )}
                    </CardContent>

                    {/* Engagement Bar: Instagram-style Liked By, View Count, Comments */}
                    <CardFooter className="px-4 py-2.5 border-t border-slate-100/90 flex flex-col gap-2">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                          {/* Like Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleLike(post.id)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 transition-colors group"
                          >
                            <Heart
                              className={`h-4 w-4 transition-transform group-hover:scale-125 ${
                                isLiked ? "fill-rose-500 text-rose-500" : "text-slate-400"
                              }`}
                            />
                            <span>{likeCount}</span>
                          </button>

                          {/* Comment Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleComments(post.id)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
                          >
                            <MessageSquare className="h-4 w-4 text-slate-400" />
                            <span>{post.commentCount ?? post._count?.comments ?? 0}</span>
                          </button>

                          {/* Share / Copy */}
                          <button
                            type="button"
                            onClick={() => handleCopyLink(post.id)}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                            title="Share post"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* View Counter */}
                        <div
                          className="flex items-center gap-1 text-[11px] text-slate-400 font-medium"
                          title="Total post views"
                        >
                          <Eye className="h-3 w-3 text-slate-400" />
                          <span>{viewCounts[post.id] ?? post.viewCount ?? 1}</span>
                        </div>
                      </div>

                      {/* Instagram-style Prioritized Liked-By Summary */}
                      {likedByText ? (
                        <p className="text-[11px] text-slate-600 w-full font-medium">
                          Liked by{" "}
                          <strong className="font-semibold text-slate-900">{likedByText}</strong>
                        </p>
                      ) : null}

                      {/* Expandable Comments Drawer */}
                      {commentsExpanded && (
                        <div className="w-full pt-3 border-t border-slate-100 space-y-3">
                          {/* Comments List */}
                          {isCommentsLoading ? (
                            <div className="py-2 text-center text-xs text-slate-400 animate-pulse">
                              Loading discussion…
                            </div>
                          ) : comments.length === 0 ? (
                            <p className="text-xs text-slate-400 py-1">
                              No comments yet. Start the conversation!
                            </p>
                          ) : (
                            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                              {comments.map((comment) => (
                                <div key={comment.id} className="space-y-1.5">
                                  <div className="flex items-start gap-2 text-xs">
                                    <Avatar
                                      src={comment.user.avatarUrl}
                                      name={comment.user.displayName}
                                      size="sm"
                                    />
                                    <div className="flex-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-900">
                                          {comment.user.displayName}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                          {formatTimeAgo(comment.createdAt)}
                                        </span>
                                      </div>
                                      <p className="text-slate-700 mt-0.5">{comment.content}</p>
                                    </div>
                                  </div>

                                  {/* Threaded Replies */}
                                  {comment.replies && comment.replies.length > 0 && (
                                    <div className="pl-6 space-y-1.5 border-l-2 border-indigo-100 ml-3">
                                      {comment.replies.map((reply) => (
                                        <div
                                          key={reply.id}
                                          className="flex items-start gap-2 text-xs"
                                        >
                                          <Avatar
                                            src={reply.user.avatarUrl}
                                            name={reply.user.displayName}
                                            size="xs"
                                          />
                                          <div className="flex-1 bg-slate-100/70 p-1.5 rounded-lg">
                                            <div className="flex items-center justify-between">
                                              <span className="font-bold text-slate-800 text-[11px]">
                                                {reply.user.displayName}
                                              </span>
                                              <span className="text-[9px] text-slate-400">
                                                {formatTimeAgo(reply.createdAt)}
                                              </span>
                                            </div>
                                            <p className="text-slate-700 text-[11px] mt-0.5">
                                              {reply.content}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Reply Trigger */}
                                  <div className="pl-8">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setReplyingToCommentId((prev) => ({
                                          ...prev,
                                          [post.id]:
                                            replyingToCommentId[post.id] === comment.id
                                              ? null
                                              : comment.id,
                                        }))
                                      }
                                      className="text-[10px] font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                                    >
                                      <CornerDownRight className="h-2.5 w-2.5" />
                                      <span>
                                        {replyingToCommentId[post.id] === comment.id
                                          ? "Cancel Reply"
                                          : "Reply"}
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add Comment Input */}
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="text"
                              value={commentInputs[post.id] ?? ""}
                              onChange={(e) =>
                                setCommentInputs((prev) => ({
                                  ...prev,
                                  [post.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAddComment(post.id);
                                }
                              }}
                              placeholder={
                                replyingToCommentId[post.id]
                                  ? "Write a reply to comment…"
                                  : "Write a public comment…"
                              }
                              className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <Button
                              type="button"
                              onClick={() => handleAddComment(post.id)}
                              disabled={!commentInputs[post.id]?.trim()}
                              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl"
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Sentinel for infinite scroll — only present when more posts exist */}
          {hasMore && (
            <div ref={sentinelRef} className="h-12 flex items-center justify-center">
              {loading && !initialLoading && (
                <span className="text-xs text-slate-400 font-medium">Loading more posts…</span>
              )}
            </div>
          )}
          {!hasMore && posts.length > 0 && (
            <div className="py-8 text-center text-xs text-slate-400 font-medium border-t border-slate-100 mt-2">
              You&apos;re all caught up!
            </div>
          )}
        </div>

        {/* ── RIGHT DIVISION: NOTIFICATION, CAMPUS EVENT, POLL OR LOGIN FOR GUEST ── */}
        <aside className="hidden xl:block w-[320px] shrink-0 space-y-4 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain pr-1 scrollbar-thin scrollbar-thumb-slate-200">
          {isGuest ? (
            <Card className="border-slate-200/90 shadow-2xs overflow-hidden bg-gradient-to-b from-white via-indigo-50/20 to-purple-50/20">
              <CardHeader className="p-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-900">Campus Community</span>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20">
                  <Shield className="h-7 w-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-extrabold text-slate-900">Sign In to StuNet</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Connect with your verified campus community. Access live notifications,
                    participate in student polls, and view campus event schedules.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-sm shadow-indigo-600/25 transition-all"
                >
                  <span>Sign In with Campus Account</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                  Official access for students & faculty
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 1. Notification Widget (No "Live" word under or in header) */}
              <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
                <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <Bell className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-900">Notification</span>
                </CardHeader>

                {/* Sections: All • Network & Group • Campus (* Notification Badge on Following and Connected *) */}
                <div className="p-1.5 border-b border-slate-100 flex items-center gap-1 text-[11px] bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => setNotificationTab("ALL")}
                    className={`flex-1 py-1 px-1.5 rounded-lg font-semibold transition-colors text-center ${
                      notificationTab === "ALL"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    All
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotificationTab("NETWORK")}
                    className={`flex-1 py-1 px-1.5 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1 ${
                      notificationTab === "NETWORK"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>Network & Group</span>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500" />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotificationTab("CAMPUS")}
                    className={`flex-1 py-1 px-1.5 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1 ${
                      notificationTab === "CAMPUS"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span>Campus</span>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                    </span>
                  </button>
                </div>

                {/* List of 3 Recent notifications with Title & Description in 1 line */}
                <CardContent className="p-2 space-y-1.5 text-xs">
                  {(notificationTab === "ALL" || notificationTab === "CAMPUS") && (
                    <Link
                      href="/campus"
                      className="block p-2 rounded-xl bg-amber-50/70 border border-amber-200/80 hover:bg-amber-100/50 transition-colors"
                    >
                      <p className="text-[11px] font-medium text-slate-800 truncate">
                        <strong className="text-amber-800 font-bold">CIA 2 English:</strong>{" "}
                        Submission Date Extended by 1 day (New date: Nov 15)
                      </p>
                    </Link>
                  )}

                  {(notificationTab === "ALL" || notificationTab === "NETWORK") && (
                    <Link
                      href="/network"
                      className="block p-2 rounded-xl bg-slate-50 border border-slate-100 hover:bg-indigo-50/50 transition-colors"
                    >
                      <p className="text-[11px] font-medium text-slate-800 truncate">
                        <strong className="text-indigo-700 font-bold">
                          Harshitha Shree Raj (NSGC):
                        </strong>{" "}
                        Posted a new study group invitation
                      </p>
                    </Link>
                  )}

                  {(notificationTab === "ALL" || notificationTab === "CAMPUS") && (
                    <Link
                      href="/clubs"
                      className="block p-2 rounded-xl bg-slate-50 border border-slate-100 hover:bg-indigo-50/50 transition-colors"
                    >
                      <p className="text-[11px] font-medium text-slate-800 truncate">
                        <strong className="text-purple-700 font-bold">Arts Club:</strong> Live
                        Showcase Today 3:00 PM in Room 3 First Floor
                      </p>
                    </Link>
                  )}

                  {notificationTab === "NETWORK" && (
                    <Link
                      href="/resources"
                      className="block p-2 rounded-xl bg-slate-50 border border-slate-100 hover:bg-indigo-50/50 transition-colors"
                    >
                      <p className="text-[11px] font-medium text-slate-800 truncate">
                        <strong className="text-emerald-700 font-bold">Web Dev Club:</strong>{" "}
                        Published full-stack starter kit
                      </p>
                    </Link>
                  )}

                  {/* See all - Link to Notification page */}
                  <div className="pt-1.5 text-center border-t border-slate-100">
                    <Link
                      href={"/notifications" as Route}
                      className="text-[11px] font-bold text-indigo-600 hover:underline inline-block"
                    >
                      See all notifications →
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* 2. Campus Event Widget (Campus-Only events with Today • This Week • This Month) */}
              <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
                <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">Campus Event</span>
                  </div>
                </CardHeader>

                {/* Timeframe Tabs: Today • This Week • This Month */}
                <div className="p-1 border-b border-slate-100 grid grid-cols-3 gap-0.5 text-[10px] bg-slate-50/50">
                  {[
                    { id: "TODAY" as const, label: "Today" },
                    { id: "WEEK" as const, label: "This Week" },
                    { id: "MONTH" as const, label: "This Month" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCampusEventTab(tab.id)}
                      className={`py-1 rounded font-semibold transition-colors text-center ${
                        campusEventTab === tab.id
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <CardContent className="p-3 space-y-2 text-xs">
                  {currentCampusEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-emerald-700 font-semibold">{evt.type}</span>
                        <span className="text-slate-400">{evt.time}</span>
                      </div>
                      <p className="font-bold text-slate-900">{evt.title}</p>
                      <p className="text-[11px] text-slate-500">📍 {evt.venue}</p>
                    </div>
                  ))}

                  <Link
                    href="/campus"
                    className="text-[11px] font-bold text-indigo-600 hover:underline block text-center pt-1"
                  >
                    all campus events &gt;
                  </Link>
                </CardContent>
              </Card>

              {/* 3. Poll Widget (Sections: All • Students • Faculty • Alumni with view all polls >) */}
              <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
                <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-900">Poll</span>
                  </div>
                </CardHeader>

                {/* Poll Sections: All • Students • Faculty • Alumni */}
                <div className="p-1 border-b border-slate-100 grid grid-cols-4 gap-0.5 text-[10px] bg-slate-50/50">
                  {[
                    { id: "ALL" as const, label: "All" },
                    { id: "STUDENTS" as const, label: "Students", badge: true },
                    { id: "FACULTY" as const, label: "Faculty" },
                    { id: "ALUMNI" as const, label: "Alumni", badge: true },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPollSectionTab(tab.id)}
                      className={`py-1 rounded font-semibold transition-colors flex items-center justify-center gap-0.5 ${
                        pollSectionTab === tab.id
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.badge && (
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 inline-block" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Recent Poll for selected Section */}
                <CardContent className="p-3 space-y-2.5 text-xs">
                  <p className="font-bold text-slate-900 leading-snug">{currentPoll.question}</p>
                  <div className="space-y-1.5">
                    {currentPoll.options.map((opt) => {
                      const isSubmitted = submittedPollOption === opt.id;
                      const isSelected = selectedPollOption === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={hasVotedOnCurrentPoll}
                          onClick={() => {
                            if (hasVotedOnCurrentPoll) return;
                            setPollSelectedOptions((prev) => ({
                              ...prev,
                              [pollSectionTab]: opt.id,
                            }));
                          }}
                          className={`w-full text-left p-2.5 rounded-xl border text-[11px] font-medium transition-all relative overflow-hidden ${
                            hasVotedOnCurrentPoll
                              ? isSubmitted
                                ? "border-indigo-600 bg-indigo-50/70 font-bold text-indigo-900 ring-1 ring-indigo-500"
                                : "border-slate-200 bg-white text-slate-700 opacity-90"
                              : isSelected
                                ? "border-indigo-600 bg-indigo-50/50 font-bold text-indigo-900 ring-2 ring-indigo-500/30"
                                : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300"
                          } ${hasVotedOnCurrentPoll ? "cursor-default" : "cursor-pointer"}`}
                        >
                          {/* Only reveal percentage bar once user has chosen option and submitted */}
                          {hasVotedOnCurrentPoll && (
                            <div
                              className="absolute inset-y-0 left-0 bg-indigo-200/50 transition-all duration-700"
                              style={{ width: `${opt.pct}%` }}
                            />
                          )}
                          <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              {!hasVotedOnCurrentPoll && (
                                <div
                                  className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? "border-indigo-600 bg-indigo-600"
                                      : "border-slate-300 bg-white"
                                  }`}
                                >
                                  {isSelected && (
                                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                  )}
                                </div>
                              )}
                              <span className="truncate">{opt.label}</span>
                            </div>
                            {/* Only reveal percentage number once user has submitted their vote */}
                            {hasVotedOnCurrentPoll && (
                              <div className="flex items-center gap-1 shrink-0">
                                {isSubmitted && (
                                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100/80 px-1 rounded">
                                    Your vote
                                  </span>
                                )}
                                <span className="text-[11px] font-bold text-slate-700">
                                  {opt.pct}%
                                </span>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Submit Vote Action / Confirmation */}
                  {!hasVotedOnCurrentPoll ? (
                    <button
                      type="button"
                      disabled={!selectedPollOption}
                      onClick={() => {
                        if (!selectedPollOption) return;
                        setPollSubmittedVotes((prev) => ({
                          ...prev,
                          [pollSectionTab]: selectedPollOption,
                        }));
                      }}
                      className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <span>Submit Vote</span>
                    </button>
                  ) : (
                    <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-1.5 text-center flex items-center justify-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Vote submitted (1 response recorded)</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 border-t border-slate-100">
                    <span>
                      {currentPoll.totalVotes + (hasVotedOnCurrentPoll ? 1 : 0)} total votes
                    </span>
                    <Link href="/polls" className="font-bold text-indigo-600 hover:underline">
                      view all polls &gt;
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </aside>
      </div>

      {/* New Post Form Modal (strictly matches Forms_for_StuNet.md) */}
      <Modal
        open={isCreatePostModalOpen}
        onClose={() => setIsCreatePostModalOpen(false)}
        title="New Post Form"
        className="max-w-lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreatePost();
          }}
          className="space-y-4 pt-2"
        >
          {postError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
              {postError}
            </div>
          )}

          {/* Target User: All or Connected Only */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1.5">Target User</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetUserScope("ALL")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all flex items-center justify-center gap-1.5 ${
                  targetUserScope === "ALL"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                <span>All Users</span>
              </button>
              <button
                type="button"
                onClick={() => setTargetUserScope("CONNECTED")}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all flex items-center justify-center gap-1.5 ${
                  targetUserScope === "CONNECTED"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Connected Only</span>
              </button>
            </div>
          </div>

          {/* Target Roles: Students or Faculty or Alumni */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1.5">
              Target Roles{" "}
              <span className="font-normal text-slate-500">(Who can view this post)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { role: "STUDENT", label: "Students", icon: GraduationCap },
                { role: "FACULTY", label: "Faculty", icon: Building2 },
                { role: "ALUMNI", label: "Alumni", icon: Award },
              ].map((r) => {
                const isSelected = targetRoles.includes(r.role);
                const Icon = r.icon;
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        if (targetRoles.length > 1) {
                          setTargetRoles(targetRoles.filter((x) => x !== r.role));
                        }
                      } else {
                        setTargetRoles([...targetRoles, r.role]);
                      }
                    }}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title / Subject */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">Title / Subject</label>
            <input
              type="text"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              placeholder="e.g. Study Group Session, Project Collaboration, Campus Update"
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">Content</label>
            <textarea
              rows={4}
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder={
                isAnonymousPost
                  ? "Writing anonymously — your name and avatar will be hidden, and your post will be labeled generically..."
                  : "Share details, requirements, questions, or updates with your community..."
              }
              className="w-full p-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
            />
          </div>

          {/* Tags with Trending Suggestions */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1 flex items-center gap-1">
              <Tag className="h-3 w-3 text-slate-500" />
              <span>Tags</span>
              <span className="font-normal text-slate-500">(comma or space separated)</span>
            </label>
            <input
              type="text"
              value={postTags}
              onChange={(e) => setPostTags(e.target.value)}
              placeholder="#ai #placement #webdev"
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
            />

            {/* Trending Suggestions */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <span className="text-[10px] text-slate-400 font-semibold">Trending tags:</span>
              {TRENDING_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddComposerTag(tag)}
                  className="text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 px-2 py-0.5 rounded-full transition-colors font-mono"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Anonymous Toggle */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield className="h-4 w-4 text-indigo-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-800">Anonymous Post</p>
                <p className="text-[11px] text-slate-500">
                  Just labels as Student or Alumni or Faculty in post instead of your name.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymousPost}
                onChange={(e) => setIsAnonymousPost(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCreatePostModalOpen(false)}
              disabled={posting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={posting || (!postContent.trim() && !postTitle.trim())}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 px-4"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{posting ? "Publishing…" : "Publish Post"}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Report Post Modal */}
      <Modal
        open={reportingPostId !== null}
        onClose={() => setReportingPostId(null)}
        title="Report Post"
        className="max-w-md"
      >
        {reportSuccess ? (
          <div className="py-6 text-center text-xs text-emerald-600 font-semibold space-y-1">
            <CheckCircle2 className="h-8 w-8 mx-auto" />
            <p>Report submitted successfully.</p>
            <p className="text-slate-500 font-normal">Our moderation team will review this post.</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Reason for report
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
              >
                <option value="SPAM">Spam or unwanted commercial content</option>
                <option value="HARASSMENT">Harassment or hate speech</option>
                <option value="INAPPROPRIATE">Inappropriate or offensive media</option>
                <option value="IMPERSONATION">Impersonation or false identity</option>
                <option value="ACADEMIC_DISHONESTY">Academic dishonesty / cheating</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Additional details (optional)
              </label>
              <textarea
                rows={3}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Help moderators understand what is wrong…"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setReportingPostId(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                disabled={submittingReport}
                onClick={handleSubmitReport}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
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
