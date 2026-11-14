"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CornerDownRight, Send, MessageSquare } from "lucide-react";
import { Avatar, Button } from "@stunet/ui";

interface CommentAuthor {
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  role?: string;
}

interface PollComment {
  id: string;
  content: string;
  createdAt: string;
  user: CommentAuthor;
  replies?: PollComment[];
}

interface PollCommentSectionProps {
  postId: string;
  isOpen: boolean;
  isGuest: boolean;
  onCommentCountChange?: (count: number) => void;
}

function formatTimeAgo(isoString?: string) {
  if (!isoString) return "Recently";
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

export default function PollCommentSection({
  postId,
  isOpen,
  isGuest,
  onCommentCountChange,
}: PollCommentSectionProps) {
  const [comments, setComments] = useState<PollComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (res.ok) {
        const json = await res.json();
        const items = (json.items as PollComment[]) || [];
        setComments(items);
        onCommentCountChange?.(items.length);
      }
    } catch (err) {
      console.error("Failed to load poll comments", err);
    } finally {
      setLoading(false);
    }
  }, [postId, onCommentCountChange]);

  useEffect(() => {
    if (isOpen) {
      void fetchComments();
    }
  }, [isOpen, fetchComments]);

  async function handleAddComment() {
    if (isGuest || !inputText.trim() || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: inputText.trim(),
          parentCommentId: replyingToId,
        }),
      });

      if (res.ok) {
        const newComment: PollComment = await res.json();
        setComments((prev) => {
          let updated: PollComment[];
          if (replyingToId) {
            updated = prev.map((c) =>
              c.id === replyingToId ? { ...c, replies: [...(c.replies ?? []), newComment] } : c,
            );
          } else {
            updated = [...prev, newComment];
          }
          onCommentCountChange?.(updated.length);
          return updated;
        });
        setInputText("");
        setReplyingToId(null);
      }
    } catch (err) {
      console.error("Failed to add comment", err);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5 animate-in fade-in duration-150">
      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
        <span className="flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Discussion & Comments ({comments.length})</span>
        </span>
      </div>

      {loading ? (
        <div className="py-3 text-center text-xs text-slate-400">Loading comments…</div>
      ) : comments.length === 0 ? (
        <p className="text-[11px] text-slate-400 dark:text-slate-500 py-1 italic">
          No comments yet on this poll. Be the first to share your perspective!
        </p>
      ) : (
        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
          {comments.map((comment) => (
            <div key={comment.id} className="space-y-1.5 text-xs">
              <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                <Avatar src={comment.user.avatarUrl} name={comment.user.displayName} size="xs" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-[11px] truncate">
                      {comment.user.displayName}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatTimeAgo(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-xs mt-0.5 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                  {!isGuest && (
                    <button
                      type="button"
                      onClick={() =>
                        setReplyingToId(replyingToId === comment.id ? null : comment.id)
                      }
                      className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                    >
                      <CornerDownRight className="h-2.5 w-2.5" />
                      <span>{replyingToId === comment.id ? "Cancel Reply" : "Reply"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="pl-6 space-y-1.5">
                  {comment.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="flex items-start gap-2 bg-slate-50/80 dark:bg-slate-850 p-2 rounded-xl border border-slate-100 dark:border-slate-800/60"
                    >
                      <Avatar src={reply.user.avatarUrl} name={reply.user.displayName} size="xs" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-[11px] truncate">
                            {reply.user.displayName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatTimeAgo(reply.createdAt)}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-xs mt-0.5 whitespace-pre-wrap">
                          {reply.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Comment Input */}
      {isGuest ? (
        <div className="pt-1 text-center text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/60 py-2 rounded-xl">
          <Link
            href="/login"
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Sign in
          </Link>{" "}
          to comment on this poll.
        </div>
      ) : (
        <div className="flex items-center gap-1.5 pt-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleAddComment();
              }
            }}
            placeholder={replyingToId ? "Write a reply…" : "Write a comment on this poll…"}
            className="flex-1 text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <Button
            type="button"
            onClick={handleAddComment}
            disabled={!inputText.trim() || submitting}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl"
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
