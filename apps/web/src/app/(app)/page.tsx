"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Globe,
  School,
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
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import {
  Avatar,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Modal,
  Textarea,
} from "@stunet/ui";

interface PostAuthor {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  headline?: string | null;
  verificationStatus?: "PENDING" | "VERIFIED" | "REJECTED";
  campus?: { slug: string; name: string } | null;
}

interface Post {
  id: string;
  content?: string;
  body?: string;
  type?: string;
  visibility: "PUBLIC" | "CONNECTIONS" | "CAMPUS";
  createdAt: string;
  authorId: string;
  author: PostAuthor;
  _count: { comments: number };
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

  // Composer state
  const [postContent, setPostContent] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "CAMPUS" | "CONNECTIONS">("PUBLIC");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // Filter tabs
  const [activeTab, setActiveTab] = useState<"ALL" | "CAMPUS" | "CONNECTIONS">("ALL");

  // Like interaction state (client-side toggle)
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

  // Close overflow menus on outside click
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
      const params = new URLSearchParams({ limit: "15" });
      if (cursor) params.set("cursor", cursor);
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

      setCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.nextCursor));
    } catch {
      // silently fail — user can retry
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [loading, hasMore, cursor]);

  // Initial load
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
        body: JSON.stringify({ body: postContent.trim(), visibility }),
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

  const filteredPosts = posts.filter((p) => {
    if (activeTab === "CAMPUS") return p.visibility === "CAMPUS";
    if (activeTab === "CONNECTIONS") return p.visibility === "CONNECTIONS";
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Feed Filter Tabs */}
      <div className="flex items-center gap-1 rounded-2xl bg-white p-1.5 border border-slate-200/90 shadow-xs">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
            activeTab === "ALL"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>All Posts</span>
        </button>

        <button
          onClick={() => setActiveTab("CAMPUS")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
            activeTab === "CAMPUS"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <School className="h-3.5 w-3.5" />
          <span>Campus Only</span>
        </button>

        <button
          onClick={() => setActiveTab("CONNECTIONS")}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
            activeTab === "CONNECTIONS"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>My Network</span>
        </button>
      </div>

      {/* Post Composer Card */}
      <Card className="border-slate-200/90 shadow-sm overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-3">
            <Avatar
              src={session?.user?.image}
              name={
                session?.user?.name ?? (session?.user as { username?: string })?.username ?? "You"
              }
              size="md"
              online={true}
            />
            <div className="flex-1">
              <Textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Share a thought, project update, academic doubt, or club announcement with your campus…"
                rows={3}
                className="border-slate-200/80 bg-slate-50/50 focus:bg-white text-sm"
                maxLength={5000}
              />
            </div>
          </div>

          {postError && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 p-2 text-xs text-rose-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{postError}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
            {/* Visibility Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500">Audience:</span>
              <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setVisibility("PUBLIC")}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] transition-colors ${
                    visibility === "PUBLIC"
                      ? "bg-white font-semibold text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Globe className="h-3 w-3" />
                  <span>Public</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("CAMPUS")}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] transition-colors ${
                    visibility === "CAMPUS"
                      ? "bg-white font-semibold text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <School className="h-3 w-3" />
                  <span>Campus</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("CONNECTIONS")}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] transition-colors ${
                    visibility === "CONNECTIONS"
                      ? "bg-white font-semibold text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Users className="h-3 w-3" />
                  <span>Network</span>
                </button>
              </div>
            </div>

            {/* Actions & Submit */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">{postContent.length}/5000</span>
              <Button
                variant="gradient"
                size="sm"
                onClick={handleCreatePost}
                disabled={posting || !postContent.trim()}
                className="gap-1.5 shadow-sm"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{posting ? "Publishing…" : "Post"}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Initial Loading Skeletons */}
      {initialLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-200 shimmer" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-32 rounded bg-slate-200 shimmer" />
                  <div className="h-2.5 w-20 rounded bg-slate-100 shimmer" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-slate-200 shimmer" />
                <div className="h-3 w-4/5 rounded bg-slate-200 shimmer" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Posts Stream */}
      {!initialLoading && filteredPosts.length === 0 && (
        <Card className="p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3">
            <Sparkles className="h-7 w-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No posts in this stream yet</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Be the first to share something with your campus peers, or switch to the &quot;All
            Posts&quot; tab!
          </p>
        </Card>
      )}

      {filteredPosts.map((post) => {
        const isAuthor = post.authorId === session?.user?.id;
        const isLiked = Boolean(likedPosts[post.id]);
        const countLike = likeCounts[post.id] ?? 0;
        const isCommentsOpen = Boolean(expandedComments[post.id]);
        const commentsList = postComments[post.id] ?? [];
        const isMenuOpen = activeMenuPostId === post.id;

        return (
          <Card
            key={post.id}
            id={`post-${post.id}`}
            className="border-slate-200/90 shadow-sm transition-all hover:border-slate-300"
          >
            {/* Header */}
            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Link href={`/u/${post.author.username ?? post.author.id}`}>
                    <Avatar
                      src={post.author.avatarUrl}
                      name={post.author.displayName ?? post.author.username ?? "Anonymous"}
                      size="md"
                    />
                  </Link>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link
                        href={`/u/${post.author.username ?? post.author.id}`}
                        className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                      >
                        {post.author.displayName ?? post.author.username ?? "Anonymous"}
                      </Link>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="text-xs text-slate-400">
                        @{post.author.username ?? "user"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(post.createdAt)}
                      </span>
                      <span>·</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-600">
                        {post.visibility === "CAMPUS"
                          ? "🏫 Campus"
                          : post.visibility === "CONNECTIONS"
                            ? "👥 Network"
                            : "🌐 Public"}
                      </span>
                      {post.author.campus && (
                        <>
                          <span>·</span>
                          <span className="text-[10px] text-indigo-600 font-medium">
                            {post.author.campus.slug.toUpperCase()}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* More options menu */}
                <div className="relative">
                  <button
                    onClick={() => setActiveMenuPostId(isMenuOpen ? null : post.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    aria-label="Post actions"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>

                  {isMenuOpen && (
                    <div
                      ref={menuRef}
                      className="absolute right-0 top-8 z-30 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg animate-in fade-in zoom-in-95"
                    >
                      <button
                        onClick={() => handleCopyLink(post.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        {copiedPostId === post.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-600 font-medium">Copied link!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-slate-500" />
                            <span>Copy link</span>
                          </>
                        )}
                      </button>

                      {!isAuthor && (
                        <>
                          <button
                            onClick={() => {
                              setActiveMenuPostId(null);
                              setReportingPostId(post.id);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Flag className="h-3.5 w-3.5" />
                            <span>Report post</span>
                          </button>

                          <button
                            onClick={() =>
                              handleBlockUser(
                                post.authorId,
                                post.author.displayName ?? post.author.username ?? "user",
                              )
                            }
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            <span>Block user</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            {/* Post Content */}
            <CardContent className="p-4 pt-2 pb-3">
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                {post.body ?? post.content}
              </p>
            </CardContent>

            {/* Footer / Engagement */}
            <CardFooter className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                {/* Like Button */}
                <button
                  onClick={() => handleToggleLike(post.id)}
                  className={`flex items-center gap-1.5 py-1 px-2 rounded-lg transition-colors ${
                    isLiked
                      ? "text-rose-600 font-bold bg-rose-50"
                      : "hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? "fill-rose-600 text-rose-600" : ""}`} />
                  <span>{countLike > 0 ? countLike : "Like"}</span>
                </button>

                {/* Comment Button */}
                <button
                  onClick={() => handleToggleComments(post.id)}
                  className="flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>
                    {(post._count?.comments ?? 0) + commentsList.length}{" "}
                    {(post._count?.comments ?? 0) + commentsList.length === 1
                      ? "comment"
                      : "comments"}
                  </span>
                </button>
              </div>

              {/* Share Button */}
              <button
                onClick={() => handleCopyLink(post.id)}
                className="flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
            </CardFooter>

            {/* Inline Comments Section */}
            {isCommentsOpen && (
              <div className="bg-slate-50/70 p-4 border-t border-slate-100 space-y-3 animate-in fade-in">
                {commentsList.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <Avatar name={c.author} size="sm" />
                    <div className="rounded-2xl bg-white border border-slate-200/80 p-2.5 text-xs flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">{c.author}</span>
                        <span className="text-[10px] text-slate-400">{c.time}</span>
                      </div>
                      <p className="mt-1 text-slate-700">{c.text}</p>
                    </div>
                  </div>
                ))}

                {/* Add Comment Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentInputs[post.id] ?? ""}
                    onChange={(e) =>
                      setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddComment(post.id);
                    }}
                    placeholder="Write a comment…"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleAddComment(post.id)}
                    disabled={!commentInputs[post.id]?.trim()}
                  >
                    Reply
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-6" />

      {loading && !initialLoading && (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-400">
          <div className="h-3 w-3 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <span>Loading more posts…</span>
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xs">
          <Sparkles className="mx-auto h-5 w-5 text-indigo-500" />
          <p className="mt-2 text-xs font-bold text-slate-800">You&apos;re all caught up!</p>
          <p className="text-[11px] text-slate-400">
            Check out the Clubs or Campus Hub to see more activity.
          </p>
        </div>
      )}

      {/* Report Post Modal */}
      <Modal
        isOpen={Boolean(reportingPostId)}
        onClose={() => {
          setReportingPostId(null);
          setReportSuccess(false);
          setReportDetails("");
        }}
        title="Report Post"
        description="Help keep our campus community safe. Reports are reviewed by administrators."
        maxWidth="md"
      >
        {reportSuccess ? (
          <div className="py-6 text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Thank you for reporting</h4>
            <p className="text-xs text-slate-500">
              Our campus trust & safety team has received your report and will take action.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">
                Why are you reporting this post?
              </label>
              <div className="space-y-1.5">
                {[
                  { value: "SPAM", label: "Spam or irrelevant advertising" },
                  { value: "HARASSMENT", label: "Harassment, bullying, or intimidation" },
                  { value: "HATE_SPEECH", label: "Hate speech or discrimination" },
                  { value: "MISINFORMATION", label: "Academic misinformation or fake alert" },
                  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate or explicit content" },
                  { value: "IMPERSONATION", label: "Impersonation of another student or staff" },
                  { value: "OTHER", label: "Other violation of code of conduct" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs cursor-pointer transition-colors ${
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
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Additional details (optional)
              </label>
              <Textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Provide context to help moderators evaluate this report…"
                rows={2}
                maxLength={500}
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReportingPostId(null)}
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
