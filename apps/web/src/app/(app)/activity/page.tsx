"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  MessageSquare,
  BarChart3,
  ArrowLeft,
  Pencil,
  Trash2,
  Check,
  Lock,
  RefreshCw,
  Clock,
} from "lucide-react";
import { Card, Button, Avatar } from "@stunet/ui";
import PollCreatorHeader from "@/components/PollCreatorHeader";

interface LikedItem {
  id: string;
  postId: string;
  createdAt: string;
  post: {
    id: string;
    body: string | null;
    likeCount: number;
    commentCount: number;
    createdAt: string;
    imageUrls: string[];
    author: {
      id: string;
      displayName: string;
      username: string | null;
      avatarUrl: string | null;
      role: string;
    };
    isPoll: boolean;
    pollQuestion: string | null;
  };
}

interface UserCommentItem {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  postSnippet: string;
  postAuthorName: string;
}

interface UserPollAnswerItem {
  id: string;
  postId: string;
  question: string;
  pollType?: string;
  complaintLevel?: string | null;
  section?: string | null;
  submissionMode: "SINGLE_SUBMIT" | "MULTIPLE_SUBMIT";
  allowMultipleAnswers: boolean;
  isDeleted: boolean;
  selectedOptionIds: string[];
  options: Array<{
    id: string;
    text: string;
    sortOrder: number;
    votes: number;
    percent: number;
  }>;
  totalVotes: number;
  closesAt?: string | null;
  createdAt: string;
  authorName: string;
  authorUsername?: string | null;
  authorAvatarUrl?: string | null;
  authorRole: string;
  authorCampus?: { name: string } | null;
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

export default function YourActivityPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"LIKES" | "COMMENTS" | "POLLS">("LIKES");
  const [loading, setLoading] = useState(true);

  const [likes, setLikes] = useState<LikedItem[]>([]);
  const [comments, setComments] = useState<UserCommentItem[]>([]);
  const [votes, setVotes] = useState<UserPollAnswerItem[]>([]);

  // Editing state for comments
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  // Voting state for polls
  const [votingPollId, setVotingPollId] = useState<string | null>(null);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me/activity");
      if (res.ok) {
        const data = await res.json();
        setLikes(data.likes || []);
        setComments(data.comments || []);
        setVotes(data.votes || []);
      }
    } catch (err) {
      console.error("Failed to fetch activity", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  // Handle unlike toggle
  async function handleToggleLike(postId: string) {
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      if (res.ok) {
        setLikes((prev) => prev.filter((item) => item.postId !== postId));
      }
    } catch (err) {
      console.error("Failed to toggle like", err);
    }
  }

  // Handle comment delete
  async function handleDeleteComment(commentId: string) {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      const res = await fetch(`/api/users/me/activity/comments/${commentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch (err) {
      console.error("Failed to delete comment", err);
    }
  }

  // Handle comment edit save
  async function handleSaveCommentEdit(commentId: string) {
    if (!editContent.trim() || savingComment) return;
    setSavingComment(true);
    try {
      const res = await fetch(`/api/users/me/activity/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, content: json.comment.content } : c)),
        );
        setEditingCommentId(null);
        setEditContent("");
      }
    } catch (err) {
      console.error("Failed to edit comment", err);
    } finally {
      setSavingComment(false);
    }
  }

  // Handle changing poll vote (for MULTIPLE_SUBMIT polls)
  async function handleChangeVote(pollId: string, optionId: string) {
    if (votingPollId) return;
    setVotingPollId(pollId);
    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedOptionIds: [optionId] }),
      });
      if (res.ok) {
        await loadActivity();
      }
    } catch (err) {
      console.error("Failed to update vote", err);
    } finally {
      setVotingPollId(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Your Activity</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Review and manage your interactions, likes, comments, and poll responses.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-1.5 shadow-2xs">
        <div className="grid grid-cols-3 gap-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("LIKES")}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "LIKES"
                ? "bg-rose-500 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <Heart className="h-4 w-4" />
            <span>Likes ({likes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("COMMENTS")}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "COMMENTS"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Comments ({comments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("POLLS")}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "POLLS"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Poll Answers ({votes.length})</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <Card className="p-12 text-center text-xs text-slate-400">Loading your activity…</Card>
      ) : (
        <div className="space-y-4">
          {/* TAB 1: LIKES */}
          {activeTab === "LIKES" && (
            <div className="space-y-3">
              {likes.length === 0 ? (
                <Card className="p-10 text-center space-y-2">
                  <Heart className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    No liked posts or polls yet
                  </p>
                  <p className="text-xs text-slate-500">
                    Tap the heart icon on any post or poll to save it here.
                  </p>
                </Card>
              ) : (
                likes.map((item) => (
                  <Card
                    key={item.id}
                    className="p-4 border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Avatar
                        src={item.post.author.avatarUrl}
                        name={item.post.author.displayName}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {item.post.author.displayName}
                          </span>
                          {item.post.isPoll && (
                            <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              Poll
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            • Liked {formatTimeAgo(item.createdAt)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 line-clamp-2">
                          {item.post.isPoll ? item.post.pollQuestion : item.post.body}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleLike(item.postId)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
                    >
                      <Heart className="h-3.5 w-3.5 fill-current" />
                      <span>Unlike</span>
                    </button>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* TAB 2: COMMENTS */}
          {activeTab === "COMMENTS" && (
            <div className="space-y-3">
              {comments.length === 0 ? (
                <Card className="p-10 text-center space-y-2">
                  <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    No comments yet
                  </p>
                  <p className="text-xs text-slate-500">
                    Your comments and discussions will be listed here.
                  </p>
                </Card>
              ) : (
                comments.map((comment) => (
                  <Card
                    key={comment.id}
                    className="p-4 border-slate-200 dark:border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        On {comment.postAuthorName}&apos;s post: &ldquo;{comment.postSnippet}
                        …&rdquo;
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(comment.createdAt)}
                      </span>
                    </div>

                    {editingCommentId === comment.id ? (
                      <div className="space-y-2 pt-1">
                        <textarea
                          rows={2}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingCommentId(null);
                              setEditContent("");
                            }}
                            className="text-xs"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            disabled={savingComment || !editContent.trim()}
                            onClick={() => handleSaveCommentEdit(comment.id)}
                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                          >
                            {savingComment ? "Saving…" : "Save Changes"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap flex-1">
                          {comment.content}
                        </p>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditContent(comment.content);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit Comment"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Delete Comment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          )}

          {/* TAB 3: POLL ANSWERS */}
          {activeTab === "POLLS" && (
            <div className="space-y-4">
              {votes.length === 0 ? (
                <Card className="p-10 text-center space-y-2">
                  <BarChart3 className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    No poll answers yet
                  </p>
                  <p className="text-xs text-slate-500">
                    Vote in community or complaint polls to review your answers here.
                  </p>
                </Card>
              ) : (
                votes.map((item) => {
                  const isChangeable = item.submissionMode === "MULTIPLE_SUBMIT" && !item.isDeleted;

                  return (
                    <Card
                      key={item.id}
                      className="border-slate-200/90 dark:border-slate-800 dark:bg-slate-900 shadow-2xs p-5 rounded-2xl space-y-3"
                    >
                      {/* Deleted Poll Tag & Creator Anonymization */}
                      {item.isDeleted ? (
                        <div className="flex items-center justify-between pb-2 border-b border-rose-200/50 dark:border-rose-950">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-900">
                              [Deleted Poll]
                            </span>
                            <span className="text-[11px] font-bold text-slate-500">
                              Author identity anonymized upon expiration
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {formatTimeAgo(item.createdAt)}
                          </span>
                        </div>
                      ) : (
                        <PollCreatorHeader
                          authorName={item.authorName}
                          authorUsername={item.authorUsername}
                          authorAvatarUrl={item.authorAvatarUrl}
                          authorRole={item.authorRole}
                          authorCampus={item.authorCampus}
                          createdAt={item.createdAt}
                          rightBadge={
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isChangeable
                                  ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              {isChangeable ? (
                                <>
                                  <RefreshCw className="h-2.5 w-2.5" />
                                  <span>Vote Changeable</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="h-2.5 w-2.5" />
                                  <span>One-Time Submit</span>
                                </>
                              )}
                            </span>
                          }
                        />
                      )}

                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {item.question}
                      </h3>

                      {/* Options with Selected Answer Highlighted */}
                      <div className="space-y-1.5 pt-1">
                        {item.options.map((opt) => {
                          const isSelected = item.selectedOptionIds.includes(opt.id);

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              disabled={!isChangeable || votingPollId === item.id}
                              onClick={() => {
                                if (isChangeable) {
                                  void handleChangeVote(item.id, opt.id);
                                }
                              }}
                              className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all relative overflow-hidden ${
                                isSelected
                                  ? "border-emerald-600 dark:border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/60 font-bold text-emerald-950 dark:text-emerald-200 ring-1 ring-emerald-500"
                                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                              } ${isChangeable ? "cursor-pointer hover:border-slate-300" : "cursor-default"}`}
                            >
                              <div
                                className="absolute inset-y-0 left-0 bg-emerald-100/70 dark:bg-emerald-900/40 transition-all duration-700"
                                style={{ width: `${opt.percent}%` }}
                              />

                              <div className="relative flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 pr-1">
                                  <div
                                    className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? "border-emerald-600 bg-emerald-600 text-white"
                                        : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                    }`}
                                  >
                                    {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                  </div>
                                  <span className="truncate">{opt.text}</span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isSelected && (
                                    <span className="text-[9px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-200/70 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">
                                      Your Answer
                                    </span>
                                  )}
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {opt.percent}% ({opt.votes})
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800">
                        <span>{item.totalVotes} total community responses</span>
                        {!isChangeable && !item.isDeleted && (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            <span>Locked (Single Submit)</span>
                          </span>
                        )}
                        {isChangeable && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <RefreshCw className="h-3 w-3" />
                            <span>Click another option to change your answer</span>
                          </span>
                        )}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
