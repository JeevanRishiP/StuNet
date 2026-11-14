"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { Route } from "next";
import {
  Code2,
  ExternalLink,
  GitFork,
  Star,
  Users,
  Briefcase,
  Heart,
  MessageSquare,
  Share2,
  AlertTriangle,
  Send,
  Plus,
  Trash2,
  Edit,
  Clock,
  ArrowLeft,
  CheckCircle2,
  Mail,
  Sparkles,
} from "lucide-react";
import { Avatar, Button, Card, CardContent, CardHeader, Modal } from "@stunet/ui";

interface ProjectMember {
  userId: string;
  role: "MAINTAINER" | "CORE_CONTRIBUTOR" | "CONTRIBUTOR";
  position: string | null;
  user: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
    role: string;
  };
}

interface ProjectPost {
  id: string;
  body: string | null;
  createdAt: string;
  likeCount: number;
  author: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
  };
  _count: { comments: number };
  postLikes?: { userId: string }[];
}

interface ProjectDetails {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  githubUrl: string;
  starsCount: number;
  contributorsCount: number;
  forksCount: number;
  primaryLanguage: string | null;
  license: string | null;
  isOpenForContributors: boolean;
  impactScore: number;
  createdAt: string;
  followersCount: number;
  postsCount: number;
  opportunitiesCount: number;
  viewerHasFollowed: boolean;
  viewerIsMaintainer: boolean;
  canPost: boolean;
  canManageTeam: boolean;
  owner: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
    role: string;
  };
  members: ProjectMember[];
  opportunities: any[];
  posts: ProjectPost[];
}

export default function ProjectDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;
  const isGuest = !session?.user || Boolean(session.user.isGuest || session.user.role === "GUEST");

  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"posts" | "team" | "details" | "opportunities">(
    "posts",
  );

  // Follow
  const [isFollowed, setIsFollowed] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  // Interest Modal
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [interestRole, setInterestRole] = useState("CONTRIBUTOR");
  const [interestMessage, setInterestMessage] = useState("");
  const [interestEmail, setInterestEmail] = useState("");
  const [interestSubmitted, setInterestSubmitted] = useState(false);
  const [interestSubmitting, setInterestSubmitting] = useState(false);

  // Edit Project Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editTagline, setEditTagline] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editGithubUrl, setEditGithubUrl] = useState("");
  const [editPrimaryLanguage, setEditPrimaryLanguage] = useState("");
  const [editStars, setEditStars] = useState(0);
  const [editContributors, setEditContributors] = useState(1);
  const [editForks, setEditForks] = useState(0);
  const [editIsOpen, setEditIsOpen] = useState(true);
  const [editSaving, setEditSaving] = useState(false);

  // Create Post Modal (as Project)
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [postSubmitting, setPostSubmitting] = useState(false);

  // Interactive Posts State
  const [postLikedMap, setPostLikedMap] = useState<Record<string, boolean>>({});
  const [postLikeCountMap, setPostLikeCountMap] = useState<Record<string, number>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, any[]>>({});
  const [loadingCommentsMap, setLoadingCommentsMap] = useState<Record<string, boolean>>({});
  const [commentInputMap, setCommentInputMap] = useState<Record<string, string>>({});
  const [submittingCommentMap, setSubmittingCommentMap] = useState<Record<string, boolean>>({});

  // Report Modal
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("SPAM");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchProjectDetails = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/initiatives/projects/${projectId}`);
      if (!res.ok) {
        if (res.status === 404) router.push("/initiatives");
        return;
      }
      const data = await res.json();
      const p: ProjectDetails = data.project;
      setProject(p);
      setIsFollowed(p.viewerHasFollowed);
      setFollowersCount(p.followersCount);

      // Pre-populate edit form
      setEditName(p.name);
      setEditTagline(p.tagline || "");
      setEditDescription(p.description || "");
      setEditGithubUrl(p.githubUrl || "");
      setEditPrimaryLanguage(p.primaryLanguage || "");
      setEditStars(p.starsCount);
      setEditContributors(p.contributorsCount);
      setEditForks(p.forksCount);
      setEditIsOpen(p.isOpenForContributors);

      // Likes mapping
      const initialLikes: Record<string, boolean> = {};
      const initialLikeCounts: Record<string, number> = {};
      (p.posts || []).forEach((post) => {
        initialLikes[post.id] = (post.postLikes && post.postLikes.length > 0) || false;
        initialLikeCounts[post.id] = post.likeCount || 0;
      });
      setPostLikedMap(initialLikes);
      setPostLikeCountMap(initialLikeCounts);
    } catch (err) {
      console.error("Error loading project details:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, router]);

  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  // Toggle Follow
  const handleToggleFollow = async () => {
    if (isGuest) {
      showToast("Please log in to follow this project");
      return;
    }
    const prevFollowed = isFollowed;
    const prevCount = followersCount;
    setIsFollowed(!prevFollowed);
    setFollowersCount(prevFollowed ? prevCount - 1 : prevCount + 1);

    try {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "PROJECT",
          entityId: projectId,
          action: prevFollowed ? "UNFOLLOW" : "FOLLOW",
        }),
      });
      if (!res.ok) {
        setIsFollowed(prevFollowed);
        setFollowersCount(prevCount);
        showToast("Failed to update follow status");
      } else {
        showToast(prevFollowed ? "Unfollowed project" : "Following project!");
      }
    } catch {
      setIsFollowed(prevFollowed);
      setFollowersCount(prevCount);
      showToast("Network error. Please try again.");
    }
  };

  // Submit Interest
  const handleSendInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      showToast("Please log in to submit your interest");
      return;
    }
    setInterestSubmitting(true);
    try {
      const res = await fetch("/api/initiatives/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          interestType: interestRole,
          message: interestMessage,
          email: interestEmail || session?.user?.email || null,
        }),
      });
      if (res.ok) {
        setInterestSubmitted(true);
        setTimeout(() => {
          setIsInterestModalOpen(false);
          setInterestSubmitted(false);
          setInterestMessage("");
          showToast("Interest request sent to the maintainers!");
        }, 1200);
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to send interest request");
      }
    } catch {
      showToast("Network error while submitting interest");
    } finally {
      setInterestSubmitting(false);
    }
  };

  // Update Project
  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      const res = await fetch(`/api/initiatives/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          tagline: editTagline || null,
          description: editDescription || null,
          githubUrl: editGithubUrl,
          primaryLanguage: editPrimaryLanguage || null,
          starsCount: Number(editStars),
          contributorsCount: Number(editContributors),
          forksCount: Number(editForks),
          isOpenForContributors: editIsOpen,
        }),
      });
      if (res.ok) {
        showToast("Project details updated!");
        setIsEditModalOpen(false);
        fetchProjectDetails();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to update project details");
      }
    } catch {
      showToast("Network error while saving project");
    } finally {
      setEditSaving(false);
    }
  };

  // Create Post
  const handleCreateProjectPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;
    setPostSubmitting(true);
    try {
      const bodyWithTitle = postTitle.trim()
        ? `# ${postTitle.trim()}\n\n${postContent.trim()}`
        : postContent.trim();
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: bodyWithTitle,
          visibility: "PUBLIC",
          openSourceProjectId: projectId,
        }),
      });
      if (res.ok) {
        showToast("Post published on behalf of project!");
        setIsPostModalOpen(false);
        setPostTitle("");
        setPostContent("");
        fetchProjectDetails();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to create post");
      }
    } catch {
      showToast("Network error while posting");
    } finally {
      setPostSubmitting(false);
    }
  };

  // Like Post
  const handleToggleLike = async (postId: string) => {
    if (isGuest) {
      showToast("Please log in to like posts");
      return;
    }
    const currentLiked = postLikedMap[postId] || false;
    const currentCount = postLikeCountMap[postId] || 0;
    setPostLikedMap((prev) => ({ ...prev, [postId]: !currentLiked }));
    setPostLikeCountMap((prev) => ({
      ...prev,
      [postId]: currentLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
    }));

    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      if (!res.ok) {
        setPostLikedMap((prev) => ({ ...prev, [postId]: currentLiked }));
        setPostLikeCountMap((prev) => ({ ...prev, [postId]: currentCount }));
      }
    } catch {
      setPostLikedMap((prev) => ({ ...prev, [postId]: currentLiked }));
      setPostLikeCountMap((prev) => ({ ...prev, [postId]: currentCount }));
    }
  };

  // Expand Comments
  const handleToggleComments = async (postId: string) => {
    const isCurrentlyExpanded = expandedComments[postId];
    setExpandedComments((prev) => ({ ...prev, [postId]: !isCurrentlyExpanded }));

    if (!isCurrentlyExpanded && !commentsMap[postId]) {
      setLoadingCommentsMap((prev) => ({ ...prev, [postId]: true }));
      try {
        const res = await fetch(`/api/posts/${postId}/comments`);
        if (res.ok) {
          const d = await res.json();
          setCommentsMap((prev) => ({ ...prev, [postId]: d.comments || [] }));
        }
      } catch (err) {
        console.error("Failed to fetch comments", err);
      } finally {
        setLoadingCommentsMap((prev) => ({ ...prev, [postId]: false }));
      }
    }
  };

  // Submit Comment
  const handleAddComment = async (postId: string) => {
    const text = (commentInputMap[postId] || "").trim();
    if (!text) return;
    if (isGuest) {
      showToast("Please log in to comment");
      return;
    }

    setSubmittingCommentMap((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const d = await res.json();
        const newComment = d.comment || {
          id: `tmp_${Date.now()}`,
          content: text,
          createdAt: new Date().toISOString(),
          user: {
            id: session?.user?.id,
            displayName: session?.user?.name,
            username: session?.user?.username,
            avatarUrl: session?.user?.image,
          },
        };
        setCommentsMap((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), newComment],
        }));
        setCommentInputMap((prev) => ({ ...prev, [postId]: "" }));
      } else {
        showToast("Failed to post comment");
      }
    } catch {
      showToast("Network error while adding comment");
    } finally {
      setSubmittingCommentMap((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Share Post
  const handleSharePost = (postId: string) => {
    const url = `${window.location.origin}/initiatives/projects/${projectId}#post-${postId}`;
    navigator.clipboard.writeText(url);
    showToast("Link copied to clipboard!");
  };

  // Submit Report
  const handleSubmitReport = async () => {
    if (!reportPostId) return;
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "POST",
          entityId: reportPostId,
          reason: reportReason,
          details: reportDetails,
        }),
      });
      if (res.ok) {
        setReportSubmitted(true);
        setTimeout(() => {
          setReportPostId(null);
          setReportSubmitted(false);
          setReportDetails("");
          showToast("Post reported to community moderators");
        }, 1200);
      } else {
        showToast("Failed to submit report");
      }
    } catch {
      showToast("Network error submitting report");
    }
  };

  function formatTimeAgo(dateStr: string) {
    const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diffSec < 60) return "just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Code2 className="h-8 w-8 animate-spin text-emerald-600" />
          <span className="text-xs text-slate-500 font-medium">Loading project profile…</span>
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24 px-4 sm:px-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-xs font-semibold shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Back to Initiatives navigation */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href={"/initiatives" as Route}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Initiatives & Leaderboards</span>
        </Link>
        <span className="text-[11px] font-mono font-medium text-slate-400">
          Rank #{project.impactScore > 0 ? "Top Project" : "Community"}
        </span>
      </div>

      {/* Hero Header Card */}
      <Card className="overflow-hidden border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <div className="h-32 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 relative">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white uppercase tracking-wider">
              {project.primaryLanguage || "Open Source"}
            </span>
            {project.isOpenForContributors && (
              <span className="rounded-full bg-emerald-500 text-white px-3 py-1 text-[11px] font-bold shadow-xs">
                Open for Contributors
              </span>
            )}
          </div>
        </div>

        <CardContent className="relative px-6 pb-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-4">
            <div className="flex items-end gap-4">
              <div className="h-24 w-24 rounded-2xl bg-white dark:bg-slate-900 border-4 border-white dark:border-slate-900 shadow-md flex items-center justify-center overflow-hidden shrink-0">
                {project.logoUrl ? (
                  <img
                    src={project.logoUrl}
                    alt={project.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Code2 className="h-10 w-10 text-emerald-600" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                    {project.name}
                  </h1>
                  <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    Project
                  </span>
                </div>
                {project.tagline && (
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl">
                    {project.tagline}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 self-start sm:self-end shrink-0 flex-wrap">
              {/* Follow Button */}
              <button
                type="button"
                onClick={handleToggleFollow}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                  isFollowed
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                {isFollowed ? "Following" : "Follow"} ({followersCount})
              </button>

              {/* I am Interested Button */}
              <button
                type="button"
                onClick={() => setIsInterestModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>I am Interested</span>
              </button>

              {/* Maintainer Actions */}
              {project.viewerIsMaintainer && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Edit Project"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPostModalOpen(true)}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs hover:opacity-90 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Post as Project</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Quick Metrics & Links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                <span>GitHub Stars</span>
              </span>
              <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                {project.starsCount.toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Users className="h-3 w-3 text-emerald-600" />
                <span>Contributors</span>
              </span>
              <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                {project.contributorsCount.toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <GitFork className="h-3 w-3 text-indigo-500" />
                <span>Forks</span>
              </span>
              <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                {project.forksCount.toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Code2 className="h-3 w-3 text-slate-600" />
                <span>Repository</span>
              </span>
              <div className="mt-0.5">
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 truncate max-w-full"
                >
                  <span>Open GitHub</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("posts")}
          className={`pb-3 relative cursor-pointer ${
            activeTab === "posts"
              ? "text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Posts & Releases ({project.posts?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("team")}
          className={`pb-3 relative cursor-pointer ${
            activeTab === "team"
              ? "text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Maintainers & Team ({1 + (project.members?.length || 0)})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("details")}
          className={`pb-3 relative cursor-pointer ${
            activeTab === "details"
              ? "text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          About & Tech Stack
        </button>
      </div>

      {/* Tab Content: Posts */}
      {activeTab === "posts" && (
        <div className="space-y-4">
          {project.viewerIsMaintainer && (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center bg-slate-50/50 dark:bg-slate-900/50">
              <p className="text-xs text-slate-500 mb-2">
                As a project maintainer, you can post releases, architecture decisions, and
                contributor calls.
              </p>
              <button
                type="button"
                onClick={() => setIsPostModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Publish Update for {project.name}</span>
              </button>
            </div>
          )}

          {!project.posts || project.posts.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-2">
              <Code2 className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No project posts yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Follow {project.name} to receive updates on new features, GitHub releases, and
                contributor opportunities!
              </p>
            </div>
          ) : (
            project.posts.map((post) => {
              const isLiked = postLikedMap[post.id] || false;
              const likeCount = postLikeCountMap[post.id] ?? post.likeCount ?? 0;
              const isExpanded = expandedComments[post.id] || false;
              const comments = commentsMap[post.id] || [];
              const isLoadingComments = loadingCommentsMap[post.id] || false;
              const commentInput = commentInputMap[post.id] || "";
              const isSubmittingComment = submittingCommentMap[post.id] || false;

              return (
                <Card
                  key={post.id}
                  id={`post-${post.id}`}
                  className="overflow-hidden border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
                >
                  <CardContent className="p-5 space-y-3.5">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 flex items-center justify-center overflow-hidden shrink-0">
                          {project.logoUrl ? (
                            <img
                              src={project.logoUrl}
                              alt={project.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Code2 className="h-5 w-5 text-emerald-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {project.name}
                            </span>
                            <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                              Project
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <span>
                              Posted by {post.author.displayName || `@${post.author.username}`}
                            </span>
                            <span>•</span>
                            <Clock className="h-2.5 w-2.5" />
                            <span>{formatTimeAgo(post.createdAt)}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                      {post.body}
                    </div>

                    {/* Interactive Action Bar */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-4">
                        {/* Like */}
                        <button
                          type="button"
                          onClick={() => handleToggleLike(post.id)}
                          className={`flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                            isLiked
                              ? "text-rose-600 dark:text-rose-400"
                              : "hover:text-rose-600 dark:hover:text-rose-400 text-slate-500"
                          }`}
                        >
                          <Heart
                            className={`h-4 w-4 ${isLiked ? "fill-rose-600 text-rose-600" : ""}`}
                          />
                          <span>{likeCount}</span>
                        </button>

                        {/* Comment */}
                        <button
                          type="button"
                          onClick={() => handleToggleComments(post.id)}
                          className="flex items-center gap-1 font-semibold hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span>{post._count?.comments || 0}</span>
                        </button>

                        {/* Share */}
                        <button
                          type="button"
                          onClick={() => handleSharePost(post.id)}
                          className="flex items-center gap-1 font-semibold hover:text-indigo-600 transition-colors cursor-pointer"
                        >
                          <Share2 className="h-4 w-4" />
                          <span>Share</span>
                        </button>
                      </div>

                      {/* Report */}
                      <button
                        type="button"
                        onClick={() => setReportPostId(post.id)}
                        className="flex items-center gap-1 text-[11px] hover:text-rose-600 transition-colors cursor-pointer"
                        title="Report post"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Report</span>
                      </button>
                    </div>

                    {/* Expandable Comments Section */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        {isLoadingComments ? (
                          <div className="text-center py-2 text-xs text-slate-400">
                            Loading comments…
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {comments.length === 0 ? (
                              <p className="text-[11px] text-slate-400 italic">
                                No comments yet. Be the first to share your feedback!
                              </p>
                            ) : (
                              comments.map((c) => (
                                <div
                                  key={c.id}
                                  className="flex items-start gap-2 text-xs bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl"
                                >
                                  <Avatar
                                    src={c.user?.avatarUrl || undefined}
                                    name={c.user?.displayName || "User"}
                                    size="sm"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-slate-900 dark:text-slate-100">
                                        {c.user?.displayName || `@${c.user?.username}`}
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        {formatTimeAgo(c.createdAt)}
                                      </span>
                                    </div>
                                    <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                                      {c.content}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}

                        {/* Add Comment Input */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={commentInput}
                            onChange={(e) =>
                              setCommentInputMap((prev) => ({ ...prev, [post.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleAddComment(post.id);
                              }
                            }}
                            placeholder="Write a comment…"
                            className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
                          />
                          <button
                            type="button"
                            disabled={!commentInput.trim() || isSubmittingComment}
                            onClick={() => handleAddComment(post.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50 cursor-pointer transition-colors"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Tab Content: Team */}
      {activeTab === "team" && (
        <div className="space-y-4">
          <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Project Maintainers & Contributors
              </h2>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Creator / Lead Maintainer */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <Link
                  href={`/u/${project.owner.username}` as Route}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <Avatar
                    src={project.owner.avatarUrl || undefined}
                    name={project.owner.displayName || "Owner"}
                    size="md"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {project.owner.displayName || `@${project.owner.username}`}
                      </span>
                      <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                        Lead Maintainer
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      @{project.owner.username}
                    </span>
                  </div>
                </Link>
                <Link
                  href={`/u/${project.owner.username}` as Route}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  View Profile
                </Link>
              </div>

              {/* Roster of members */}
              {project.members && project.members.length > 0 ? (
                project.members.map((m) => (
                  <div
                    key={m.userId}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                  >
                    <Link
                      href={`/u/${m.user.username}` as Route}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                      <Avatar
                        src={m.user.avatarUrl || undefined}
                        name={m.user.displayName || "Member"}
                        size="md"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {m.user.displayName || `@${m.user.username}`}
                          </span>
                          <span className="rounded-md bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 text-[9px] font-bold text-slate-700 dark:text-slate-300">
                            {m.role}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          @{m.user.username}
                        </span>
                      </div>
                    </Link>
                    <Link
                      href={`/u/${m.user.username}` as Route}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      View Profile
                    </Link>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-slate-400">
                  No additional contributors listed. Use "I am Interested" to join the team!
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Content: Details */}
      {activeTab === "details" && (
        <div className="space-y-4">
          <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                About {project.name}
              </h2>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Description
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                  {project.description || "No full description provided by maintainers yet."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Primary Language
                  </span>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {project.primaryLanguage || "TypeScript / Python / Polyglot"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Software License
                  </span>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {project.license || "MIT License"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: I am Interested */}
      <Modal
        isOpen={isInterestModalOpen}
        onClose={() => setIsInterestModalOpen(false)}
        title={`Express Interest in ${project.name}`}
      >
        <form onSubmit={handleSendInterest} className="space-y-4">
          {interestSubmitted ? (
            <div className="text-center py-6 space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Your interest has been submitted!
              </p>
              <p className="text-[11px] text-slate-500">
                The lead maintainer will review your note and contact you.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  How would you like to contribute?
                </label>
                <select
                  value={interestRole}
                  onChange={(e) => setInterestRole(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="CONTRIBUTOR">Code Contributor (Bug fixes, features, PRs)</option>
                  <option value="CORE_TEAM">Core Maintainer / Reviewer</option>
                  <option value="DOCUMENTATION">Documentation & Tutorials</option>
                  <option value="TESTING_DESIGN">Testing & UI/UX Design</option>
                  <option value="SPONSOR">Sponsor / Advisor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Brief Note to Maintainers
                </label>
                <textarea
                  rows={3}
                  required
                  value={interestMessage}
                  onChange={(e) => setInterestMessage(e.target.value)}
                  placeholder="Share your GitHub profile, past experience, or why you'd like to collaborate…"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Email (Optional)
                </label>
                <input
                  type="email"
                  value={interestEmail}
                  onChange={(e) => setInterestEmail(e.target.value)}
                  placeholder={session?.user?.email || "your.email@example.com"}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInterestModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={interestSubmitting || !interestMessage.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  {interestSubmitting ? "Sending…" : "Send Interest Request"}
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* Modal: Edit Project */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Project Details"
      >
        <form onSubmit={handleUpdateProject} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Project Name
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tagline
            </label>
            <input
              type="text"
              value={editTagline}
              onChange={(e) => setEditTagline(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              GitHub URL
            </label>
            <input
              type="url"
              required
              value={editGithubUrl}
              onChange={(e) => setEditGithubUrl(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                GitHub Stars
              </label>
              <input
                type="number"
                min={0}
                value={editStars}
                onChange={(e) => setEditStars(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Contributors
              </label>
              <input
                type="number"
                min={1}
                value={editContributors}
                onChange={(e) => setEditContributors(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Forks
              </label>
              <input
                type="number"
                min={0}
                value={editForks}
                onChange={(e) => setEditForks(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Primary Language
            </label>
            <input
              type="text"
              value={editPrimaryLanguage}
              onChange={(e) => setEditPrimaryLanguage(e.target.value)}
              placeholder="e.g. TypeScript, Rust, Python"
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={editSaving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {editSaving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Post as Project */}
      <Modal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
        title={`Post Update as ${project.name}`}
      >
        <form onSubmit={handleCreateProjectPost} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Post Title (Optional)
            </label>
            <input
              type="text"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              placeholder="e.g. v2.0 Released or Calling Rust Developers!"
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Post Body
            </label>
            <textarea
              rows={4}
              required
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Share what's new with the project, roadmap updates, or open issues…"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsPostModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={postSubmitting || !postContent.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {postSubmitting ? "Publishing…" : "Publish Post"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Report Post */}
      <Modal
        isOpen={Boolean(reportPostId)}
        onClose={() => setReportPostId(null)}
        title="Report Post"
      >
        <div className="space-y-4">
          {reportSubmitted ? (
            <div className="text-center py-4 space-y-1">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Report received
              </p>
              <p className="text-[11px] text-slate-500">Thank you for keeping StuNet safe.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for reporting
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                >
                  <option value="SPAM">Spam or misleading information</option>
                  <option value="HARASSMENT">Harassment or hate speech</option>
                  <option value="INAPPROPRIATE">Inappropriate or offensive content</option>
                  <option value="COPYRIGHT">Copyright or IP infringement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Additional Details (Optional)
                </label>
                <textarea
                  rows={2}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide context for moderators…"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setReportPostId(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitReport}
                  className="bg-rose-600 hover:bg-rose-500 text-white"
                >
                  Submit Report
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
