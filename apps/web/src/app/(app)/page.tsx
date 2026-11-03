"use client";

/**
 * Home Feed — /  (app group)
 * - Create post form
 * - Infinite-scroll feed (cursor pagination)
 * - Report button on each post (wired into /api/reports)
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";

interface Post {
  id: string;
  content?: string;
  body?: string;
  visibility: string;
  createdAt: string;
  authorId: string;
  author: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  _count: { comments: number };
}

interface FeedResponse {
  posts?: Post[];
  items?: Post[];
  nextCursor?: string | null;
}

export default function FeedPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "CONNECTIONS" | "CAMPUS">("PUBLIC");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "15" });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/posts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load feed");
      const data: FeedResponse = await res.json();
      const incoming = Array.isArray(data.posts)
        ? data.posts
        : Array.isArray(data.items)
          ? data.items
          : [];
      setPosts((prev) => [...prev, ...incoming]);
      setCursor(data.nextCursor ?? null);
      setHasMore(Boolean(data.nextCursor));
    } catch {
      // silently fail — user can scroll again
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, cursor]);

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

  // Initial load
  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePost() {
    if (!postContent.trim()) return;
    setPosting(true);
    setPostError(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: postContent.trim(), visibility }),
      });
      if (res.status === 429) {
        setPostError("You're posting too fast — please wait a moment.");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setPostError((body as { error?: string }).error ?? "Failed to create post.");
        return;
      }
      const newPost: Post = await res.json();
      setPosts((prev) => [newPost, ...prev]);
      setPostContent("");
    } finally {
      setPosting(false);
    }
  }

  async function handleReport(postId: string) {
    const reason = window.prompt(
      "Report reason:\nSPAM | HARASSMENT | HATE_SPEECH | MISINFORMATION | INAPPROPRIATE_CONTENT | IMPERSONATION | OTHER",
    );
    if (!reason) return;
    const validReasons = [
      "SPAM",
      "HARASSMENT",
      "HATE_SPEECH",
      "MISINFORMATION",
      "INAPPROPRIATE_CONTENT",
      "IMPERSONATION",
      "OTHER",
    ];
    if (!validReasons.includes(reason.toUpperCase())) {
      alert("Invalid reason — please enter one of the listed values.");
      return;
    }
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: "POST", postId, reason: reason.toUpperCase() }),
    });
    if (res.ok) {
      alert("Report submitted. Thank you.");
    } else if (res.status === 429) {
      alert("Too many reports — please wait before submitting another.");
    } else {
      alert("Failed to submit report. Please try again.");
    }
  }

  if (!session) return null;

  return (
    <div className="space-y-6">
      {/* Create post */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
        <textarea
          value={postContent}
          onChange={(e) => setPostContent(e.target.value)}
          placeholder="Share something with your campus…"
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={5000}
        />
        {postError && <p className="text-red-500 text-xs">{postError}</p>}
        <div className="flex items-center justify-between">
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as "PUBLIC" | "CONNECTIONS" | "CAMPUS")}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="PUBLIC">Public</option>
            <option value="CAMPUS">Campus only</option>
            <option value="CONNECTIONS">Connections only</option>
          </select>
          <button
            onClick={handlePost}
            disabled={posting || !postContent.trim()}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg disabled:opacity-50 hover:bg-blue-700"
          >
            {posting ? "Posting…" : "Post"}
          </button>
        </div>
      </div>

      {/* Feed */}
      {posts.map((post) => (
        <article
          key={post.id}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-2"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-sm text-gray-900">
                {post.author.displayName ?? post.author.username ?? "Anonymous"}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(post.createdAt).toLocaleDateString()} · {post.visibility}
              </p>
            </div>
            {/* Report — only shown for posts not authored by viewer */}
            {post.authorId !== session.user?.id && (
              <button
                onClick={() => handleReport(post.id)}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                Report
              </button>
            )}
          </div>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{post.body ?? post.content}</p>
          <p className="text-xs text-gray-400">
            {post._count.comments} comment{post._count.comments !== 1 ? "s" : ""}
          </p>
        </article>
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-4" />

      {loading && <p className="text-center text-sm text-gray-400 py-4">Loading…</p>}
      {!hasMore && posts.length > 0 && (
        <p className="text-center text-sm text-gray-400 py-4">You&apos;ve reached the end.</p>
      )}
      {!loading && posts.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-8">
          No posts yet — be the first to share something!
        </p>
      )}
    </div>
  );
}
