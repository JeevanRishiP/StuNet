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
  Bell,
} from "lucide-react";
import { Avatar, Button, Card, CardContent, CardFooter, CardHeader, Modal } from "@stunet/ui";
import AdvancedSelectList, { GeoFilterSelection } from "@/components/AdvancedSelectList";

interface PostAuthor {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  headline?: string | null;
  verificationStatus?: "PENDING" | "VERIFIED" | "REJECTED";
  campus?: { slug: string; name: string } | null;
  role?: "STUDENT" | "ALUMNI" | "ADMIN";
}

interface Post {
  id: string;
  content?: string;
  body?: string;
  type?: string;
  category?: "GENERAL" | "HACKATHON" | "PROJECT";
  visibility: "PUBLIC" | "CONNECTIONS" | "CAMPUS";
  createdAt: string;
  authorId: string;
  author: PostAuthor;
  _count: { comments: number };
  isConnection?: boolean;
  isAlumni?: boolean;
}

interface FeedResponse {
  posts?: Post[];
  items?: Post[];
  nextCursor?: string | null;
  hasMore?: boolean;
}

export default function FeedPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // 3 Primary Feed Streams from Plan
  const [streamTab, setStreamTab] = useState<"GENERAL" | "CONNECTED" | "ALUMNI">("GENERAL");

  // Audience / Region Filter Pills
  const [audiencePill, setAudiencePill] = useState<"ALL" | "MY_CAMPUS" | "FRIENDS" | "ALUMNI">(
    "ALL",
  );

  // Category Dropdown Filter
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "GENERAL" | "HACKATHON" | "PROJECT">(
    "ALL",
  );

  // Advanced Geographic Scope Selection
  const [geoScope, setGeoScope] = useState<GeoFilterSelection>({
    type: "ALL",
    name: "All Campuses",
  });

  // Inline Composer state
  const [postContent, setPostContent] = useState("");
  const [composerCategory, setComposerCategory] = useState<"GENERAL" | "HACKATHON" | "PROJECT">(
    "GENERAL",
  );
  const [visibility, setVisibility] = useState<"PUBLIC" | "CAMPUS" | "CONNECTIONS">("PUBLIC");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // Like interaction state
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  // Active menu popover
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);

  // Inline comments expansion
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [postComments, setPostComments] = useState<
    Record<string, Array<{ id: string; author: string; text: string; time: string }>>
  >({});

  // Right Rail: Notifications behind Profile tab
  const [rightRailTab, setRightRailTab] = useState<"ALL" | "ALERTS" | "ACADEMIC">("ALL");

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

  // Close menus on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuPostId(null);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || (!hasMore && cursor !== null)) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/posts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load feed");
      const data: FeedResponse = await res.json();
      const incoming: Post[] = Array.isArray(data.posts)
        ? data.posts
        : Array.isArray(data.items)
          ? data.items
          : [];

      // Decorate with mock connected / alumni status for UI differentiation if not set
      const decorated = incoming.map((p, idx) => ({
        ...p,
        isConnection: idx % 3 === 1,
        isAlumni: idx % 5 === 4,
        category: (p.category ?? (idx % 2 === 0 ? "GENERAL" : "HACKATHON")) as
          "GENERAL" | "HACKATHON" | "PROJECT",
      }));

      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const filteredNew = decorated.filter((p) => !existingIds.has(p.id));
        return [...prev, ...filteredNew];
      });

      setCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.nextCursor));
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [loading, hasMore, cursor]);

  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  async function handleCreatePost() {
    if (!postContent.trim()) return;
    setPosting(true);
    setPostError(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: postContent.trim(),
          visibility,
          category: composerCategory,
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
      setPosts((prev) => [
        {
          ...newPost,
          category: composerCategory,
          isConnection: false,
          isAlumni: false,
        },
        ...prev,
      ]);
      setPostContent("");
    } finally {
      setPosting(false);
    }
  }

  function handleToggleLike(postId: string) {
    setLikedPosts((prev) => {
      const isLiked = !prev[postId];
      setLikeCounts((counts) => ({
        ...counts,
        [postId]: (counts[postId] ?? 0) + (isLiked ? 1 : -1),
      }));
      return { ...prev, [postId]: isLiked };
    });
  }

  function handleToggleComments(postId: string) {
    setExpandedComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  }

  function handleAddComment(postId: string) {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    const newComment = {
      id: Math.random().toString(),
      author: session?.user?.name ?? "Student",
      text,
      time: "Just now",
    };
    setPostComments((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] ?? []), newComment],
    }));
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
  }

  function handleCopyLink(postId: string) {
    const url = `${window.location.origin}/#post-${postId}`;
    navigator.clipboard.writeText(url);
    setCopiedPostId(postId);
    setTimeout(() => setCopiedPostId(null), 2000);
    setActiveMenuPostId(null);
  }

  async function handleBlockUser(authorId: string, authorName: string) {
    if (
      !window.confirm(
        `Are you sure you want to block ${authorName}? You won't see each other's posts.`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: authorId }),
      });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.authorId !== authorId));
        alert(`${authorName} has been blocked.`);
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
      } else if (res.status === 429) {
        alert("Too many reports submitted. Please wait before reporting again.");
      } else {
        alert("Failed to submit report. Please try again.");
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

  // Filter posts based on 3 Primary Streams & Filters
  const filteredPosts = posts.filter((p) => {
    // 1. Primary Stream filter
    if (streamTab === "CONNECTED" && !p.isConnection && p.visibility !== "CONNECTIONS")
      return false;
    if (streamTab === "ALUMNI" && !p.isAlumni) return false;

    // 2. Audience filter pills
    if (audiencePill === "MY_CAMPUS" && p.visibility !== "CAMPUS") return false;
    if (audiencePill === "FRIENDS" && !p.isConnection) return false;
    if (audiencePill === "ALUMNI" && !p.isAlumni) return false;

    // 3. Category dropdown filter
    if (categoryFilter !== "ALL" && p.category !== categoryFilter) return false;

    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      {/* 2-Section Instagram Web Architecture: Left Feed Column + Right Profile & Notifications Rail */}
      <div className="flex justify-center gap-8 items-start">
        {/* ── LEFT / CENTER SECTION: FEED COLUMN (max-w-[630px] flex-1) ── */}
        <div className="w-full max-w-[630px] space-y-4">
          {/* Top 3 Primary Stream Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <button
              type="button"
              onClick={() => setStreamTab("GENERAL")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                streamTab === "GENERAL"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>General Posts</span>
            </button>

            <button
              type="button"
              onClick={() => setStreamTab("CONNECTED")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                streamTab === "CONNECTED"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Connected Users</span>
            </button>

            <button
              type="button"
              onClick={() => setStreamTab("ALUMNI")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                streamTab === "ALUMNI"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Alumni Posts</span>
            </button>
          </div>

          {/* Stream Filters Row: Audience Pills + Category Dropdown + AdvancedSelectList */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            {/* Audience Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {[
                { id: "ALL" as const, label: "All" },
                { id: "MY_CAMPUS" as const, label: "MyCampus" },
                { id: "FRIENDS" as const, label: "Friends" },
                { id: "ALUMNI" as const, label: "Alumni" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setAudiencePill(pill.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                    audiencePill === pill.id
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Geographic Filter & Category Dropdown */}
            <div className="flex items-center gap-1.5 ml-auto">
              <AdvancedSelectList
                currentSelection={geoScope}
                onSelect={(sel) => setGeoScope(sel)}
              />

              <select
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value as "ALL" | "GENERAL" | "HACKATHON" | "PROJECT")
                }
                aria-label="Filter posts by category"
                className="text-xs font-semibold bg-white border border-slate-200 rounded-full px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Categories</option>
                <option value="GENERAL">General</option>
                <option value="HACKATHON">Hackathon/Competition</option>
                <option value="PROJECT">Project</option>
              </select>
            </div>
          </div>

          {/* Inline Post Composer (+ Add New Post) */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Avatar name={session?.user?.name ?? "Student"} size="md" />
                <div className="flex-1 min-w-0">
                  <textarea
                    rows={2}
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder="Share something with your campus or network…"
                    className="w-full text-sm placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                  />
                </div>
              </div>

              {postError && <p className="text-xs text-rose-600 font-medium pl-12">{postError}</p>}

              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  {/* Category Pill in Composer */}
                  <select
                    value={composerCategory}
                    onChange={(e) =>
                      setComposerCategory(e.target.value as "GENERAL" | "HACKATHON" | "PROJECT")
                    }
                    aria-label="Post category selection"
                    className="text-xs bg-slate-100 text-slate-700 font-semibold rounded-lg px-2 py-1 border-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="GENERAL">General</option>
                    <option value="HACKATHON">Hackathon</option>
                    <option value="PROJECT">Project</option>
                  </select>

                  {/* Visibility Pill */}
                  <select
                    value={visibility}
                    onChange={(e) =>
                      setVisibility(e.target.value as "PUBLIC" | "CAMPUS" | "CONNECTIONS")
                    }
                    aria-label="Post visibility selection"
                    className="text-xs bg-slate-100 text-slate-700 font-semibold rounded-lg px-2 py-1 border-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="PUBLIC">Public</option>
                    <option value="CAMPUS">My Campus</option>
                    <option value="CONNECTIONS">Connections Only</option>
                  </select>
                </div>

                <Button
                  type="button"
                  disabled={posting || !postContent.trim()}
                  onClick={handleCreatePost}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 px-3 py-1.5"
                >
                  <Send className="h-3 w-3" />
                  <span>{posting ? "Posting…" : "Post"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

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
                  <div className="h-4 w-3/4 bg-slate-100 rounded" />
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
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => {
                const author = post.author;
                const authorName = author.displayName ?? author.username ?? "Anonymous Student";
                const isLiked = !!likedPosts[post.id];
                const likeCount = (likeCounts[post.id] ?? 0) + (post.id.length % 5);
                const comments = postComments[post.id] ?? [];
                const commentsExpanded = !!expandedComments[post.id];

                // Plan Rule: Visual Color Differentiation
                // - Default: Other user's post
                // - Blue accent/tint: Connected user's post
                // - Gold accent/tint: Alumni's post
                let cardTint = "bg-white border-slate-200/90 shadow-2xs";
                let badgeContent = null;

                if (post.isAlumni) {
                  cardTint = "bg-amber-50/20 border-amber-200/90 shadow-sm shadow-amber-500/5";
                  badgeContent = (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      🎓 Alumni
                    </span>
                  );
                } else if (post.isConnection) {
                  cardTint = "bg-blue-50/20 border-blue-200/90 shadow-sm shadow-blue-500/5";
                  badgeContent = (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                      👥 Connected
                    </span>
                  );
                }

                return (
                  <Card
                    key={post.id}
                    id={`post-${post.id}`}
                    className={`rounded-2xl transition-all ${cardTint}`}
                  >
                    {/* Card Header */}
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          href={`/u/${author.username ?? author.id}` as Route}
                          className="flex items-center gap-3 group flex-1 min-w-0"
                        >
                          <Avatar src={author.avatarUrl} name={authorName} size="md" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                {authorName}
                              </span>
                              {author.verificationStatus === "VERIFIED" && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              )}
                              {badgeContent}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate mt-0.5">
                              <span>@{author.username ?? "user"}</span>
                              {author.campus && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{author.campus.name}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>{formatTimeAgo(post.createdAt)}</span>
                            </div>
                          </div>
                        </Link>

                        {/* Overflow Menu */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id)
                            }
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {activeMenuPostId === post.id && (
                            <div
                              ref={menuRef}
                              className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 text-xs"
                            >
                              <button
                                type="button"
                                onClick={() => handleCopyLink(post.id)}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                              >
                                {copiedPostId === post.id ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                    <span>Copied link!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Copy link</span>
                                  </>
                                )}
                              </button>

                              {author.id !== session?.user?.id && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleBlockUser(author.id, authorName)}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                                  >
                                    <UserX className="h-3.5 w-3.5 text-slate-400" />
                                    <span>Block user</span>
                                  </button>

                                  <div className="my-1 border-t border-slate-100" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReportingPostId(post.id);
                                      setActiveMenuPostId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-600 hover:bg-rose-50"
                                  >
                                    <Flag className="h-3.5 w-3.5 text-rose-500" />
                                    <span>Report post</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Post Category Tag */}
                      {post.category && (
                        <div className="mt-2">
                          <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {post.category === "HACKATHON"
                              ? "🏆 Hackathon / Competition"
                              : post.category === "PROJECT"
                                ? "🚀 Project Collaboration"
                                : "💡 General"}
                          </span>
                        </div>
                      )}
                    </CardHeader>

                    {/* Post Content */}
                    <CardContent className="p-4 pt-1 pb-3 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {post.body ?? post.content}
                    </CardContent>

                    {/* Card Footer / Interactions */}
                    <CardFooter className="p-4 pt-2 border-t border-slate-100 flex flex-col gap-3">
                      <div className="w-full flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => handleToggleLike(post.id)}
                            className={`flex items-center gap-1.5 font-semibold transition-colors ${
                              isLiked ? "text-rose-600" : "text-slate-600 hover:text-rose-600"
                            }`}
                          >
                            <Heart
                              className={`h-4 w-4 ${isLiked ? "fill-rose-600 text-rose-600" : ""}`}
                            />
                            <span>{likeCount}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleComments(post.id)}
                            className="flex items-center gap-1.5 font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span>{(post._count?.comments ?? 0) + comments.length}</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyLink(post.id)}
                          className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          <span>Share</span>
                        </button>
                      </div>

                      {/* Inline Comments Section */}
                      {commentsExpanded && (
                        <div className="w-full pt-2 border-t border-slate-100 space-y-2">
                          {comments.map((c) => (
                            <div
                              key={c.id}
                              className="bg-slate-50 p-2 rounded-xl text-xs space-y-0.5"
                            >
                              <div className="flex items-center justify-between font-semibold text-slate-900">
                                <span>{c.author}</span>
                                <span className="text-[10px] text-slate-400">{c.time}</span>
                              </div>
                              <p className="text-slate-700">{c.text}</p>
                            </div>
                          ))}

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
                              placeholder="Write a comment…"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddComment(post.id);
                              }}
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddComment(post.id)}
                              className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}

              <div ref={sentinelRef} className="py-4 text-center text-xs text-slate-400">
                {loading && <span>Loading more posts…</span>}
                {!hasMore && posts.length > 0 && <span>You have reached the end of the feed.</span>}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT STICKY SECTION: "NOTIFICATIONS BEHIND PROFILE" (w-[340px] sticky top-6) ── */}
        <aside className="hidden lg:flex flex-col gap-4 w-[340px] sticky top-6 self-start shrink-0">
          {/* User's Mini Profile Card */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="h-16 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 relative">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]" />
            </div>

            <CardContent className="pt-0 px-4 pb-4">
              <div className="flex flex-col items-center -mt-8 text-center">
                <div className="ring-4 ring-white rounded-full shadow-xs">
                  <Avatar name={session?.user?.name ?? "Student"} size="lg" online={true} />
                </div>

                <div className="mt-2 flex items-center justify-center gap-1 w-full">
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    {session?.user?.name ?? "Student"}
                  </h3>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                </div>

                <p className="text-xs text-slate-500 truncate">
                  @{session?.user?.email?.split("@")[0] ?? "student"}
                </p>

                <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-0.5">
                  <GraduationCap className="h-3 w-3" />
                  <span>NIAT S-VYASA Campus</span>
                </div>

                <Link
                  href={`/u/${session?.user?.email?.split("@")[0] ?? session?.user?.id}` as Route}
                  className="mt-3 w-full py-1.5 text-xs font-semibold text-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  View Profile
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Panel Docked Behind / Underneath Profile (Instagram Model) */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
            <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-900">Notifications Feed</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                Live
              </span>
            </CardHeader>

            {/* Filter Tabs inside Notifications Dock */}
            <div className="p-2 border-b border-slate-100 flex items-center gap-1 text-[11px]">
              {(["ALL", "ALERTS", "ACADEMIC"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setRightRailTab(tab)}
                  className={`flex-1 py-1 rounded-lg font-semibold transition-colors ${
                    rightRailTab === tab
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab === "ALL" ? "All" : tab === "ALERTS" ? "Campus" : "CIA/IA"}
                </button>
              ))}
            </div>

            <CardContent className="p-2 space-y-1.5 max-h-[380px] overflow-y-auto text-xs">
              {/* Item 1: Urgent CIA deadline */}
              {(rightRailTab === "ALL" || rightRailTab === "ACADEMIC") && (
                <Link
                  href="/campus"
                  className="block p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 hover:bg-amber-100/50 transition-colors group"
                >
                  <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-amber-800">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> CIA 2 English
                    </span>
                    <span className="text-amber-600">3 days left</span>
                  </div>
                  <p className="text-xs font-medium text-slate-800 mt-1 leading-snug">
                    Submission date extended by 1 day. New deadline: Nov 15.
                  </p>
                </Link>
              )}

              {/* Item 2: Live Club Event */}
              {(rightRailTab === "ALL" || rightRailTab === "ALERTS") && (
                <Link
                  href="/clubs/arts"
                  className="block p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-indigo-50/50 hover:border-indigo-100 transition-colors group"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                    <span className="text-indigo-600">Arts Club</span>
                    <span>Today 3:00 PM</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-900 mt-0.5 group-hover:text-indigo-600">
                    Creative Showcase & Design Critique
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Room 3 • First Floor</p>
                </Link>
              )}

              {/* Item 3: Connection Request */}
              {(rightRailTab === "ALL" || rightRailTab === "ALERTS") && (
                <Link
                  href="/network"
                  className="block p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-indigo-50/50 transition-colors group"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-semibold text-indigo-600">Network Alert</span>
                    <span>10m ago</span>
                  </div>
                  <p className="text-xs font-medium text-slate-800 mt-0.5">
                    Bob Krishnan sent you a connection request.
                  </p>
                </Link>
              )}

              {/* Item 4: IA 1 Exam Schedule */}
              {(rightRailTab === "ALL" || rightRailTab === "ACADEMIC") && (
                <Link
                  href="/campus"
                  className="block p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-indigo-50/50 transition-colors"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-semibold text-purple-600">Exam Office</span>
                    <span>Nov 20</span>
                  </div>
                  <p className="text-xs font-medium text-slate-800 mt-0.5">
                    IA 1 Question Bank & Timetable released for CS401.
                  </p>
                </Link>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

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
