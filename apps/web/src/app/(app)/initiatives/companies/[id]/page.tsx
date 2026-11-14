"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { Route } from "next";
import {
  Building2,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Users,
  Briefcase,
  Heart,
  MessageSquare,
  Share2,
  AlertTriangle,
  Send,
  Plus,
  UserPlus,
  Trash2,
  Edit,
  Clock,
  ArrowLeft,
  CheckCircle2,
  Mail,
  Sparkles,
} from "lucide-react";
import { Avatar, Button, Card, CardContent, CardHeader, Modal } from "@stunet/ui";

interface CompanyMember {
  userId: string;
  ownerType: "FOUNDER" | "CO_FOUNDER" | "FOUNDING_MEMBER" | "EMPLOYEE" | "ADVISOR";
  position: string | null;
  showOnProfile: boolean;
  user: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
    role: string;
  };
}

interface CompanyPost {
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

interface CompanyDetails {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  stage: string;
  verifiedRevenue: number;
  revenueCurrency: string;
  isRevenueVerified: boolean;
  verificationProofUrl: string | null;
  hiringStatus: boolean;
  createdAt: string;
  followersCount: number;
  postsCount: number;
  opportunitiesCount: number;
  viewerHasFollowed: boolean;
  viewerRole: string | null;
  canPost: boolean;
  canManageTeam: boolean;
  roles: CompanyMember[];
  opportunities: any[];
  posts: CompanyPost[];
}

export default function CompanyDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const companyId = params?.id as string;
  const isGuest = !session?.user || Boolean(session.user.isGuest || session.user.role === "GUEST");

  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"posts" | "team" | "details" | "opportunities">(
    "posts",
  );

  // Follow
  const [isFollowed, setIsFollowed] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followWorking, setFollowWorking] = useState(false);

  // Interest Modal
  const [interestModalOpen, setInterestModalOpen] = useState(false);
  const [interestType, setInterestType] = useState<
    "CO_FOUNDER" | "TEAM_MEMBER" | "INTERN" | "COLLABORATE" | "OTHER"
  >("TEAM_MEMBER");
  const [interestMessage, setInterestMessage] = useState("");
  const [interestEmail, setInterestEmail] = useState("");
  const [interestSubmitting, setInterestSubmitting] = useState(false);
  const [interestSuccess, setInterestSuccess] = useState(false);
  const [interestError, setInterestError] = useState<string | null>(null);

  // Edit Company Details Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    tagline: "",
    description: "",
    websiteUrl: "",
    linkedinUrl: "",
    logoUrl: "",
    stage: "IDEA",
    verifiedRevenue: 0,
    revenueCurrency: "INR",
    verificationProofUrl: "",
    hiringStatus: false,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Team Management Modal
  const [manageTeamModalOpen, setManageTeamModalOpen] = useState(false);
  const [newMemberUsername, setNewMemberUsername] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("CO_FOUNDER");
  const [newMemberPosition, setNewMemberPosition] = useState("");
  const [teamActionLoading, setTeamActionLoading] = useState(false);
  const [teamActionError, setTeamActionError] = useState<string | null>(null);

  // Create Post Modal for company
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // Post engagement states: likes, comments, report
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, any[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);
  const [shareCopiedPostId, setShareCopiedPostId] = useState<string | null>(null);

  const loadCompany = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/initiatives/companies/${companyId}`);
      if (res.ok) {
        const data = await res.json();
        const c: CompanyDetails = data.company;
        setCompany(c);
        setIsFollowed(c.viewerHasFollowed);
        setFollowersCount(c.followersCount);

        // Prepopulate edit form
        setEditForm({
          name: c.name,
          tagline: c.tagline ?? "",
          description: c.description ?? "",
          websiteUrl: c.websiteUrl ?? "",
          linkedinUrl: c.linkedinUrl ?? "",
          logoUrl: c.logoUrl ?? "",
          stage: c.stage,
          verifiedRevenue: c.verifiedRevenue,
          revenueCurrency: c.revenueCurrency,
          verificationProofUrl: c.verificationProofUrl ?? "",
          hiringStatus: c.hiringStatus,
        });

        // Prepopulate like counts
        const initialLikes: Record<string, boolean> = {};
        const initialCounts: Record<string, number> = {};
        for (const p of c.posts ?? []) {
          initialCounts[p.id] = p.likeCount;
          initialLikes[p.id] = Boolean(p.postLikes && p.postLikes.length > 0);
        }
        setLikedPosts(initialLikes);
        setLikeCounts(initialCounts);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  // Toggle Follow
  async function handleToggleFollow() {
    if (isGuest) return;
    setFollowWorking(true);
    try {
      const res = await fetch(`/api/initiatives/companies/${companyId}/follow`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowed(data.following);
        setFollowersCount(data.followersCount);
      }
    } finally {
      setFollowWorking(false);
    }
  }

  // Submit Interest ("I am Interested")
  async function handleSubmitInterest(e: React.FormEvent) {
    e.preventDefault();
    setInterestSubmitting(true);
    setInterestError(null);

    try {
      const res = await fetch("/api/initiatives/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          interestType,
          message: interestMessage.trim() || undefined,
          email: interestEmail.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setInterestError(err.error ?? "Failed to submit interest request.");
        return;
      }

      setInterestSuccess(true);
      setTimeout(() => {
        setInterestModalOpen(false);
        setInterestSuccess(false);
        setInterestMessage("");
      }, 1500);
    } catch {
      setInterestError("Network error sending interest request.");
    } finally {
      setInterestSubmitting(false);
    }
  }

  // Save Edit Company
  async function handleSaveCompany(e: React.FormEvent) {
    e.preventDefault();
    setEditSubmitting(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/initiatives/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          verifiedRevenue: Number(editForm.verifiedRevenue) || 0,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setEditError(err.error ?? "Failed to save company details.");
        return;
      }

      setEditModalOpen(false);
      loadCompany();
    } catch {
      setEditError("Failed to save changes.");
    } finally {
      setEditSubmitting(false);
    }
  }

  // Add Member
  async function handleAddMember() {
    if (!newMemberUsername.trim()) return;
    setTeamActionLoading(true);
    setTeamActionError(null);

    try {
      const res = await fetch(`/api/initiatives/companies/${companyId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernameOrId: newMemberUsername.trim(),
          ownerType: newMemberRole,
          position: newMemberPosition.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setTeamActionError(err.error ?? "Failed to add member.");
        return;
      }

      setNewMemberUsername("");
      setNewMemberPosition("");
      loadCompany();
    } catch {
      setTeamActionError("Failed to add member.");
    } finally {
      setTeamActionLoading(false);
    }
  }

  // Remove Member
  async function handleRemoveMember(userId: string) {
    setTeamActionLoading(true);
    setTeamActionError(null);
    try {
      const res = await fetch(`/api/initiatives/companies/${companyId}/members?userId=${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setTeamActionError(err.error ?? "Failed to remove member.");
        return;
      }
      loadCompany();
    } catch {
      setTeamActionError("Failed to remove member.");
    } finally {
      setTeamActionLoading(false);
    }
  }

  // Publish Post as Company
  async function handleCreateCompanyPost(e: React.FormEvent) {
    e.preventDefault();
    if (!postBody.trim() && !postTitle.trim()) return;
    setPostSubmitting(true);
    setPostError(null);

    const fullText = postTitle.trim()
      ? `# ${postTitle.trim()}\n\n${postBody.trim()}`
      : postBody.trim();

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: fullText,
          companyId,
          visibility: "PUBLIC",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setPostError(err.error ?? "Failed to publish post.");
        return;
      }

      setCreatePostOpen(false);
      setPostTitle("");
      setPostBody("");
      loadCompany();
    } catch {
      setPostError("Failed to publish post.");
    } finally {
      setPostSubmitting(false);
    }
  }

  // Like Post
  async function handleLikePost(postId: string) {
    if (isGuest) return;
    const currentlyLiked = likedPosts[postId] ?? false;
    const currentCount = likeCounts[postId] ?? 0;

    setLikedPosts((prev) => ({ ...prev, [postId]: !currentlyLiked }));
    setLikeCounts((prev) => ({
      ...prev,
      [postId]: currentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
    }));

    try {
      await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    } catch {
      // rollback
      setLikedPosts((prev) => ({ ...prev, [postId]: currentlyLiked }));
      setLikeCounts((prev) => ({ ...prev, [postId]: currentCount }));
    }
  }

  // Expand Comments
  async function handleToggleComments(postId: string) {
    const isExpanded = expandedComments[postId];
    if (isExpanded) {
      setExpandedComments((prev) => ({ ...prev, [postId]: false }));
      return;
    }
    setExpandedComments((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch(`/api/posts/${postId}`);
      if (res.ok) {
        const data = await res.json();
        setCommentsMap((prev) => ({ ...prev, [postId]: data.post?.comments ?? [] }));
      }
    } catch {
      // ignore
    }
  }

  // Add Comment
  async function handleAddComment(postId: string) {
    const text = commentInputs[postId]?.trim();
    if (!text || isGuest) return;

    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      if (res.ok) {
        const data = await res.json();
        setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
        setCommentsMap((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] ?? []), data.comment ?? data],
        }));
      }
    } catch {
      // ignore
    }
  }

  // Share Post
  function handleSharePost(postId: string) {
    const shareUrl = `${window.location.origin}/p/${postId}`;
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setShareCopiedPostId(postId);
      setTimeout(() => setShareCopiedPostId(null), 2000);
    });
  }

  // Format currency
  function formatRevenue(amount: number, currency: string = "INR") {
    if (amount <= 0) return "Pre-revenue / Bootstrapping";
    if (currency === "INR") {
      if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr Verified ARR`;
      if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} Lakh Verified ARR`;
      return `₹${amount.toLocaleString()} Verified ARR`;
    }
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M Verified ARR`;
    return `$${amount.toLocaleString()} Verified ARR`;
  }

  function formatTimeAgo(dateStr: string) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 text-xs">
        <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Loading company details...
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-3">
        <Building2 className="h-10 w-10 text-slate-400 mx-auto" />
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Company Not Found
        </h2>
        <Button onClick={() => router.push("/initiatives")} className="text-xs">
          Return to Initiatives
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/initiatives")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Initiatives Hub</span>
        </button>

        {company.canPost && (
          <Button
            onClick={() => setCreatePostOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Post as {company.name}</span>
          </Button>
        )}
      </div>

      {/* Hero / Company Header Card */}
      <Card className="rounded-3xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-sm bg-white dark:bg-slate-900">
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
            <div className="flex items-start gap-4 flex-1">
              <Avatar
                src={company.logoUrl}
                name={company.name}
                size="xl"
                className="shrink-0 rounded-2xl ring-4 ring-slate-100 dark:ring-slate-800"
              />

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 truncate">
                    {company.name}
                  </h1>

                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {company.stage}
                  </span>

                  {company.hiringStatus && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse">
                      Hiring Now
                    </span>
                  )}
                </div>

                {company.tagline && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                    {company.tagline}
                  </p>
                )}

                {/* Verified Revenue Banner */}
                <div className="pt-1 flex items-center gap-2 flex-wrap">
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      company.isRevenueVerified
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {company.isRevenueVerified ? (
                      <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-slate-400" />
                    )}
                    <span>{formatRevenue(company.verifiedRevenue, company.revenueCurrency)}</span>
                  </div>

                  {company.websiteUrl && (
                    <a
                      href={company.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                    >
                      <span>Website</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}

                  {company.linkedinUrl && (
                    <a
                      href={company.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors"
                    >
                      <span>LinkedIn</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Actions: Follow, I am Interested, Manage */}
            <div className="flex flex-wrap sm:flex-col items-stretch sm:items-end gap-2.5 shrink-0 w-full sm:w-auto">
              {!isGuest && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleToggleFollow}
                    disabled={followWorking}
                    variant={isFollowed ? "outline" : "default"}
                    className={`text-xs px-4 py-2 rounded-xl font-bold transition-all ${
                      isFollowed
                        ? "border-slate-300 text-slate-700 hover:text-red-600"
                        : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                    }`}
                  >
                    {isFollowed ? "Following" : "+ Follow"}
                  </Button>

                  <Button
                    onClick={() => setInterestModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>I am Interested</span>
                  </Button>
                </div>
              )}

              {/* Founder management actions */}
              {company.canManageTeam && (
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setEditModalOpen(true)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Edit Company</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setManageTeamModalOpen(true)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Manage Team</span>
                  </Button>
                </div>
              )}

              <div className="text-[11px] text-slate-500 font-medium">
                <span>{followersCount} followers</span> • <span>{company.posts.length} posts</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {company.description && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {company.description}
            </div>
          )}
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("posts")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "posts"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <span>Company Posts</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "posts" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}
          >
            {company.posts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("team")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "team"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Founders & Team</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "team" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}
          >
            {company.roles.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("opportunities")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "opportunities"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span>Open Roles</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "opportunities" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}
          >
            {company.opportunities.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("details")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === "details"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Revenue & Verification</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: COMPANY POSTS
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "posts" && (
        <div className="space-y-4">
          {company.posts.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 space-y-2">
              <MessageSquare className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                No posts published by this company yet.
              </p>
              {company.canPost && (
                <Button
                  onClick={() => setCreatePostOpen(true)}
                  className="text-xs mt-2 bg-indigo-600 text-white"
                >
                  Create First Post
                </Button>
              )}
            </div>
          ) : (
            company.posts.map((post) => {
              const isLiked = likedPosts[post.id] ?? false;
              const likeCount = likeCounts[post.id] ?? post.likeCount ?? 0;
              const commentsExpanded = expandedComments[post.id] ?? false;
              const postComments = commentsMap[post.id] ?? [];

              return (
                <Card
                  key={post.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3"
                >
                  {/* Post Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={company.logoUrl}
                        name={company.name}
                        size="md"
                        className="rounded-xl ring-1 ring-slate-200 dark:ring-slate-700"
                      />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {company.name}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200">
                            Startup
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          By @{post.author.username} • {formatTimeAgo(post.createdAt)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReportingPostId(post.id)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                      title="Report Post"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Post Body */}
                  <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                    {post.body}
                  </div>

                  {/* Actions: Like, Comment, Share, Report */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-4">
                      {/* Like */}
                      <button
                        type="button"
                        onClick={() => handleLikePost(post.id)}
                        className={`flex items-center gap-1.5 font-semibold transition-colors cursor-pointer ${
                          isLiked ? "text-rose-600 font-bold" : "hover:text-rose-600"
                        }`}
                      >
                        <Heart
                          className={`h-4 w-4 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`}
                        />
                        <span>{likeCount}</span>
                      </button>

                      {/* Comment */}
                      <button
                        type="button"
                        onClick={() => handleToggleComments(post.id)}
                        className="flex items-center gap-1.5 font-semibold hover:text-indigo-600 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>{post._count.comments} Comments</span>
                      </button>

                      {/* Share */}
                      <button
                        type="button"
                        onClick={() => handleSharePost(post.id)}
                        className="flex items-center gap-1.5 font-semibold hover:text-indigo-600 transition-colors cursor-pointer"
                      >
                        <Share2 className="h-4 w-4" />
                        <span>{shareCopiedPostId === post.id ? "Copied Link!" : "Share"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Comments */}
                  {commentsExpanded && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      {!isGuest && (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Write a comment..."
                            value={commentInputs[post.id] ?? ""}
                            onChange={(e) =>
                              setCommentInputs({ ...commentInputs, [post.id]: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddComment(post.id);
                            }}
                            className="flex-1 p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleAddComment(post.id)}
                            className="text-xs bg-indigo-600 text-white"
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {postComments.map((c: any) => (
                          <div
                            key={c.id}
                            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs flex items-start gap-2"
                          >
                            <Avatar src={c.user?.avatarUrl} name={c.user?.displayName} size="xs" />
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-800 dark:text-slate-200">
                                {c.user?.displayName ?? "User"}
                              </p>
                              <p className="text-slate-600 dark:text-slate-300">{c.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: FOUNDERS & TEAM MEMBERS
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "team" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {company.roles.map((member) => (
              <Card
                key={member.userId}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={member.user.avatarUrl}
                      name={member.user.displayName}
                      size="lg"
                      className="rounded-xl"
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/u/${member.user.username ?? member.user.id}` as Route}
                        className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 transition-colors truncate block"
                      >
                        {member.user.displayName ?? member.user.username}
                      </Link>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200">
                        {member.position || member.ownerType.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Role:{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {member.ownerType.replace("_", " ")}
                    </span>
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <Link
                    href={`/u/${member.user.username ?? member.user.id}` as Route}
                    className="text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    View Profile →
                  </Link>

                  {company.canManageTeam && member.ownerType !== "FOUNDER" && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.userId)}
                      className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {company.canManageTeam && (
            <Button
              onClick={() => setManageTeamModalOpen(true)}
              className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5"
            >
              <UserPlus className="h-4 w-4" />
              <span>+ Add Team Member / Co-Founder</span>
            </Button>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: OPEN ROLES & OPPORTUNITIES
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "opportunities" && (
        <div className="space-y-4">
          {company.opportunities.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 space-y-2">
              <Briefcase className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                No active hiring offers or co-founder searches at the moment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {company.opportunities.map((opp) => (
                <Card
                  key={opp.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {opp.title}
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                      {opp.roleType.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3">
                    {opp.description}
                  </p>
                  {opp.compensation && (
                    <p className="text-xs font-bold text-emerald-600">{opp.compensation}</p>
                  )}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Posted {formatTimeAgo(opp.createdAt)}
                    </span>
                    {opp.contactEmail && (
                      <a
                        href={`mailto:${opp.contactEmail}?subject=Application for ${encodeURIComponent(opp.title)}`}
                        className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <Mail className="h-3 w-3" />
                        <span>Apply</span>
                      </a>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: REVENUE & VERIFICATION
          ───────────────────────────────────────────────────────────── */}
      {activeTab === "details" && (
        <Card className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Verified Financial Metrics & Leaderboard Proof</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 font-semibold block">
                Verified Revenue
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono">
                {formatRevenue(company.verifiedRevenue, company.revenueCurrency)}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 font-semibold block">Venture Stage</span>
              <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                {company.stage}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 font-semibold block">
                Verification Status
              </span>
              <span
                className={`text-sm font-bold flex items-center gap-1 mt-1 ${company.isRevenueVerified ? "text-emerald-600" : "text-slate-500"}`}
              >
                {company.isRevenueVerified ? <CheckCircle2 className="h-4 w-4" /> : null}
                <span>{company.isRevenueVerified ? "Verified Proof Active" : "Self-Reported"}</span>
              </span>
            </div>
          </div>

          {company.verificationProofUrl && (
            <div className="pt-2">
              <span className="text-xs text-slate-500 font-medium mr-2">Proof Documentation:</span>
              <a
                href={company.verificationProofUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1"
              >
                <span>View Verification Audit Document</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: "I AM INTERESTED" (STUDENTS / ALUMNI JOIN REQUEST)
          ───────────────────────────────────────────────────────────── */}
      <Modal
        open={interestModalOpen}
        onClose={() => setInterestModalOpen(false)}
        title={`Express Interest — ${company.name}`}
        className="max-w-md"
      >
        <form onSubmit={handleSubmitInterest} className="space-y-3.5 pt-2">
          {interestError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
              {interestError}
            </div>
          )}

          {interestSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Interest sent! The founders will review your note.</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
              Interest Category *
            </label>
            <select
              value={interestType}
              onChange={(e) => setInterestType(e.target.value as any)}
              className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
            >
              <option value="TEAM_MEMBER">Join as Team Member / Developer</option>
              <option value="CO_FOUNDER">Interested as Co-Founder</option>
              <option value="INTERN">Internship Opportunity</option>
              <option value="COLLABORATE">Collaboration / Partnership</option>
              <option value="OTHER">General Inquiry</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
              Your Message & Skills Note
            </label>
            <textarea
              rows={3}
              value={interestMessage}
              onChange={(e) => setInterestMessage(e.target.value)}
              placeholder="Tell the founder what you can bring to the table (skills, portfolio, experience)..."
              className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
              Contact Email (Optional)
            </label>
            <input
              type="email"
              value={interestEmail}
              onChange={(e) => setInterestEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setInterestModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={interestSubmitting || interestSuccess}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4"
            >
              {interestSubmitting ? "Sending..." : "Submit Interest"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: EDIT COMPANY (FOUNDERS ONLY)
          ───────────────────────────────────────────────────────────── */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Company Details — ${company.name}`}
        className="max-w-xl"
      >
        <form onSubmit={handleSaveCompany} className="space-y-4 pt-2">
          {editError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
              {editError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">Company Name</label>
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">Stage</label>
              <select
                value={editForm.stage}
                onChange={(e) => setEditForm({ ...editForm, stage: e.target.value })}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
              >
                <option value="IDEA">Idea Stage</option>
                <option value="MVP">MVP / Prototype</option>
                <option value="EARLY_STAGE">Early Stage</option>
                <option value="BOOTSTRAPPED">Bootstrapped</option>
                <option value="SEED">Seed Funded</option>
                <option value="SERIES_A">Series A</option>
                <option value="PROFITABLE">Profitable</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">Tagline</label>
            <input
              type="text"
              value={editForm.tagline}
              onChange={(e) => setEditForm({ ...editForm, tagline: e.target.value })}
              className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">Description</label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Annual Revenue (INR)
              </label>
              <input
                type="number"
                min="0"
                value={editForm.verifiedRevenue}
                onChange={(e) =>
                  setEditForm({ ...editForm, verifiedRevenue: Number(e.target.value) })
                }
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                Verification Proof URL
              </label>
              <input
                type="url"
                value={editForm.verificationProofUrl}
                onChange={(e) => setEditForm({ ...editForm, verificationProofUrl: e.target.value })}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">Website URL</label>
              <input
                type="url"
                value={editForm.websiteUrl}
                onChange={(e) => setEditForm({ ...editForm, websiteUrl: e.target.value })}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">LinkedIn URL</label>
              <input
                type="url"
                value={editForm.linkedinUrl}
                onChange={(e) => setEditForm({ ...editForm, linkedinUrl: e.target.value })}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">Logo URL</label>
              <input
                type="url"
                value={editForm.logoUrl}
                onChange={(e) => setEditForm({ ...editForm, logoUrl: e.target.value })}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={editSubmitting}
              className="bg-indigo-600 text-white text-xs font-semibold px-4"
            >
              {editSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: MANAGE TEAM
          ───────────────────────────────────────────────────────────── */}
      <Modal
        open={manageTeamModalOpen}
        onClose={() => setManageTeamModalOpen(false)}
        title="Manage Team Members"
        className="max-w-md"
      >
        <div className="space-y-4 pt-2">
          {teamActionError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
              {teamActionError}
            </div>
          )}

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 block">Current Team</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {company.roles.map((m) => (
                <div
                  key={m.userId}
                  className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Avatar src={m.user.avatarUrl} name={m.user.displayName} size="xs" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {m.user.displayName ?? m.user.username}
                      </p>
                      <p className="text-[10px] text-slate-500">{m.position || m.ownerType}</p>
                    </div>
                  </div>
                  {m.ownerType !== "FOUNDER" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(m.userId)}
                      disabled={teamActionLoading}
                      className="text-red-500 hover:text-red-600 text-xs p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <h4 className="text-xs font-bold text-slate-800 block">Add Member</h4>
            <input
              type="text"
              placeholder="Username or User ID"
              value={newMemberUsername}
              onChange={(e) => setNewMemberUsername(e.target.value)}
              className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                className="p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="CO_FOUNDER">Co-Founder</option>
                <option value="FOUNDING_MEMBER">Founding Member</option>
                <option value="EMPLOYEE">Employee / Intern</option>
                <option value="ADVISOR">Advisor</option>
              </select>
              <input
                type="text"
                placeholder="Title / Position"
                value={newMemberPosition}
                onChange={(e) => setNewMemberPosition(e.target.value)}
                className="p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <Button
              onClick={handleAddMember}
              disabled={teamActionLoading || !newMemberUsername.trim()}
              className="w-full bg-indigo-600 text-white text-xs font-semibold py-2 rounded-xl mt-1"
            >
              {teamActionLoading ? "Adding..." : "+ Add Member"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CREATE POST AS COMPANY
          ───────────────────────────────────────────────────────────── */}
      <Modal
        open={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        title={`New Post as ${company.name}`}
        className="max-w-lg"
      >
        <form onSubmit={handleCreateCompanyPost} className="space-y-3.5 pt-2">
          {postError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
              {postError}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">Title / Subject</label>
            <input
              type="text"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              placeholder="e.g. Major Launch, Milestones, Funding Announcement"
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">Content *</label>
            <textarea
              rows={4}
              required
              value={postBody}
              onChange={(e) => setPostBody(e.target.value)}
              placeholder="Share updates, news, product demos, or announcements from your company..."
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreatePostOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={postSubmitting || (!postBody.trim() && !postTitle.trim())}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4"
            >
              {postSubmitting ? "Publishing..." : "Publish Post"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
