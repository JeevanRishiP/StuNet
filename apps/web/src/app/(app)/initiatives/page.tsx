"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { Route } from "next";
import {
  Rocket,
  Building2,
  Code2,
  Briefcase,
  Trophy,
  Users,
  Star,
  GitFork,
  ExternalLink,
  Plus,
  Search,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  UserPlus,
  Edit,
  Trash2,
  Mail,
  Send,
  Heart,
  MessageSquare,
  Clock,
  Filter,
  Share2,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  X,
  Layers,
  Check,
  Compass,
} from "lucide-react";
import { Avatar, Button, Card, CardContent, CardHeader, Modal } from "@stunet/ui";

// Models
interface PostAuthor {
  id: string;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  role: string;
  verificationStatus?: string;
}

interface InitiativePost {
  id: string;
  body: string | null;
  createdAt: string;
  type?: string;
  author: PostAuthor;
  companyId?: string | null;
  openSourceProjectId?: string | null;
  company?: {
    id: string;
    name: string;
    logoUrl?: string | null;
    stage?: string;
    tagline?: string | null;
    isRevenueVerified?: boolean;
    verifiedRevenue?: number;
  } | null;
  openSourceProject?: {
    id: string;
    name: string;
    logoUrl?: string | null;
    primaryLanguage?: string | null;
    tagline?: string | null;
    starsCount?: number;
    githubUrl?: string;
  } | null;
  likeCount: number;
  commentCount: number;
  viewerHasLiked: boolean;
}

interface InterestRequestItem {
  id: string;
  interestType: string;
  message: string;
  email: string | null;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  createdAt: string;
  user: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
    role: string;
  };
  company?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
}

interface ManagedInitiative {
  id: string;
  name: string;
  type: "company" | "project";
  viewerRole: string;
  interestRequests: InterestRequestItem[];
}

interface NetworkInitiativeCard {
  id: string;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  stage?: string;
  verifiedRevenue?: number;
  isRevenueVerified?: boolean;
  githubUrl?: string;
  starsCount?: number;
  contributorsCount?: number;
  primaryLanguage?: string | null;
  followersCount: number;
  postsCount: number;
  type: "company" | "project";
  founder?: {
    id: string;
    displayName: string | null;
    username: string | null;
    avatarUrl: string | null;
    role: string;
  } | null;
  relationship?: string;
  viewerHasFollowed?: boolean;
}

const TRENDING_TAGS = [
  "startup",
  "opensource",
  "hiring",
  "revenue",
  "launch",
  "ai",
  "funding",
  "internship",
];

export default function InitiativesPage() {
  const { data: session } = useSession();
  const isGuest = !session?.user || Boolean(session.user.isGuest || session.user.role === "GUEST");

  // Middle Section Tabs: ALL | COMPANY | PROJECT
  const [middleTab, setMiddleTab] = useState<"ALL" | "COMPANY" | "PROJECT">("ALL");

  // Filtering System (Same as Home Page)
  const [searchQuery, setSearchQuery] = useState("");
  const [targetRole, setTargetRole] = useState<"ALL" | "STUDENT" | "FACULTY" | "ALUMNI">("ALL");
  const [connectionScope, setConnectionScope] = useState<"ALL" | "CONNECTED">("ALL");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [customTagInput, setCustomTagInput] = useState("");
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // Middle Section Posts Feed
  const [posts, setPosts] = useState<InitiativePost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  // Post Interactions State
  const [postLikedMap, setPostLikedMap] = useState<Record<string, boolean>>({});
  const [postLikeCountMap, setPostLikeCountMap] = useState<Record<string, number>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, any[]>>({});
  const [loadingCommentsMap, setLoadingCommentsMap] = useState<Record<string, boolean>>({});
  const [commentInputMap, setCommentInputMap] = useState<Record<string, string>>({});
  const [submittingCommentMap, setSubmittingCommentMap] = useState<Record<string, boolean>>({});

  // Right Section Top Widget: My Company Managing
  const [managedInitiatives, setManagedInitiatives] = useState<ManagedInitiative[]>([]);
  const [activeManagedTab, setActiveManagedTab] = useState<string | null>(null);
  const [loadingManaged, setLoadingManaged] = useState(true);

  // Right Section Middle Widget: Top / Most Followed Initiatives
  const [topAudienceFilter, setTopAudienceFilter] = useState<"all" | "student" | "alumni">("all");
  const [topInitiatives, setTopInitiatives] = useState<NetworkInitiativeCard[]>([]);

  // Right Section Bottom Widget: Network Initiatives
  const [networkAudienceFilter, setNetworkAudienceFilter] = useState<"all" | "student" | "alumni">(
    "all",
  );
  const [networkInitiatives, setNetworkInitiatives] = useState<NetworkInitiativeCard[]>([]);
  const [loadingWidgets, setLoadingWidgets] = useState(true);

  // Action Modals
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isRegisterCompanyOpen, setIsRegisterCompanyOpen] = useState(false);
  const [isRegisterProjectOpen, setIsRegisterProjectOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  // Register Company Form
  const [companyName, setCompanyName] = useState("");
  const [companyTagline, setCompanyTagline] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyLinkedin, setCompanyLinkedin] = useState("");
  const [companyStage, setCompanyStage] = useState("IDEA");
  const [companyRevenue, setCompanyRevenue] = useState(0);
  const [companyHiring, setCompanyHiring] = useState(false);
  const [registeringCompany, setRegisteringCompany] = useState(false);

  // Register Project Form
  const [projectName, setProjectName] = useState("");
  const [projectTagline, setProjectTagline] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectGithubUrl, setProjectGithubUrl] = useState("");
  const [projectPrimaryLang, setProjectPrimaryLang] = useState("");
  const [projectIsOpen, setProjectIsOpen] = useState(true);
  const [registeringProject, setRegisteringProject] = useState(false);

  // Create Post Form
  const [postSelectedEntity, setPostSelectedEntity] = useState<string>("");
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [creatingPost, setCreatingPost] = useState(false);

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

  // Close Tag Dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Fetch Posts Feed
  const fetchFeedPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const params = new URLSearchParams();
      if (middleTab !== "ALL") params.set("section", middleTab.toLowerCase());
      if (targetRole !== "ALL") params.set("tab", targetRole);
      if (connectionScope !== "ALL") params.set("subFilter", connectionScope);
      if (activeTag) params.set("tag", activeTag);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/initiatives/posts?${params.toString()}`);
      if (res.ok) {
        const d = await res.json();
        const items: InitiativePost[] = d.posts || [];
        setPosts(items);

        // Prepopulate like maps
        const likes: Record<string, boolean> = {};
        const likeCounts: Record<string, number> = {};
        items.forEach((p) => {
          likes[p.id] = p.viewerHasLiked;
          likeCounts[p.id] = p.likeCount || 0;
        });
        setPostLikedMap(likes);
        setPostLikeCountMap(likeCounts);
      }
    } catch (err) {
      console.error("Error fetching initiative posts:", err);
    } finally {
      setPostsLoading(false);
    }
  }, [middleTab, targetRole, connectionScope, activeTag, searchQuery]);

  useEffect(() => {
    fetchFeedPosts();
  }, [fetchFeedPosts]);

  // 2. Fetch User's Managed Initiatives & Interest Requests (Top Right Widget)
  const fetchMyRequests = useCallback(async () => {
    if (isGuest) {
      setLoadingManaged(false);
      return;
    }
    try {
      setLoadingManaged(true);
      const res = await fetch("/api/initiatives/my-requests");
      if (res.ok) {
        const d = await res.json();
        const list: ManagedInitiative[] = [
          ...(d.companies || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            type: "company" as const,
            viewerRole: c.viewerRole || "FOUNDER",
            interestRequests: c.interestRequests || [],
          })),
          ...(d.projects || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            type: "project" as const,
            viewerRole: p.viewerRole || "MAINTAINER",
            interestRequests: p.interestRequests || [],
          })),
        ];
        setManagedInitiatives(list);
        if (list.length > 0 && !activeManagedTab) {
          setActiveManagedTab(list[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching my requests:", err);
    } finally {
      setLoadingManaged(false);
    }
  }, [isGuest, activeManagedTab]);

  useEffect(() => {
    fetchMyRequests();
  }, [fetchMyRequests]);

  // 3. Fetch Right Section Top & Network Initiatives
  const fetchRightWidgets = useCallback(async () => {
    setLoadingWidgets(true);
    try {
      const sectionParam = middleTab === "ALL" ? "all" : middleTab.toLowerCase();

      // Top Initiatives
      const topRes = await fetch(
        `/api/initiatives/network-initiatives?section=${sectionParam}&audience=${topAudienceFilter}`,
      );
      if (topRes.ok) {
        const topData = await topRes.json();
        setTopInitiatives(topData.topInitiatives || []);
      }

      // Network Initiatives
      const netRes = await fetch(
        `/api/initiatives/network-initiatives?section=${sectionParam}&audience=${networkAudienceFilter}`,
      );
      if (netRes.ok) {
        const netData = await netRes.json();
        setNetworkInitiatives(netData.networkInitiatives || []);
      }
    } catch (err) {
      console.error("Error fetching right widgets:", err);
    } finally {
      setLoadingWidgets(false);
    }
  }, [middleTab, topAudienceFilter, networkAudienceFilter]);

  useEffect(() => {
    fetchRightWidgets();
  }, [fetchRightWidgets]);

  // Handle Interest Review Action (Accept / Decline)
  const handleReviewInterest = async (requestId: string, status: "ACCEPTED" | "DECLINED") => {
    try {
      const res = await fetch(`/api/initiatives/interest/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        showToast(`Request marked as ${status.toLowerCase()}!`);
        fetchMyRequests();
      } else {
        showToast("Failed to update interest request");
      }
    } catch {
      showToast("Network error updating request");
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

  // Add Comment
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
  const handleSharePost = (post: InitiativePost) => {
    const entityUrl = post.companyId
      ? `/initiatives/companies/${post.companyId}#post-${post.id}`
      : `/initiatives/projects/${post.openSourceProjectId}#post-${post.id}`;
    const fullUrl = `${window.location.origin}${entityUrl}`;
    navigator.clipboard.writeText(fullUrl);
    showToast("Post link copied to clipboard!");
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

  // Register Company Submission
  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      showToast("Please log in to register a company");
      return;
    }
    setRegisteringCompany(true);
    try {
      const res = await fetch("/api/initiatives/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyName,
          tagline: companyTagline || null,
          description: companyDescription || null,
          stage: companyStage,
          websiteUrl: companyWebsite || null,
          linkedinUrl: companyLinkedin || null,
          verifiedRevenue: Number(companyRevenue) || 0,
          hiringStatus: companyHiring,
        }),
      });
      if (res.ok) {
        showToast("Company registered successfully!");
        setIsRegisterCompanyOpen(false);
        setCompanyName("");
        setCompanyTagline("");
        setCompanyDescription("");
        fetchMyRequests();
        fetchRightWidgets();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to register company");
      }
    } catch {
      showToast("Network error registering company");
    } finally {
      setRegisteringCompany(false);
    }
  };

  // Register Project Submission
  const handleRegisterProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      showToast("Please log in to register a project");
      return;
    }
    setRegisteringProject(true);
    try {
      const res = await fetch("/api/initiatives/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName,
          tagline: projectTagline || null,
          description: projectDescription || null,
          githubUrl: projectGithubUrl,
          primaryLanguage: projectPrimaryLang || null,
          isOpenForContributors: projectIsOpen,
        }),
      });
      if (res.ok) {
        showToast("Project registered successfully!");
        setIsRegisterProjectOpen(false);
        setProjectName("");
        setProjectTagline("");
        setProjectDescription("");
        setProjectGithubUrl("");
        fetchMyRequests();
        fetchRightWidgets();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to register project");
      }
    } catch {
      showToast("Network error registering project");
    } finally {
      setRegisteringProject(false);
    }
  };

  // Create Post as Initiative Submission
  const handleCreateInitiativePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;
    setCreatingPost(true);
    try {
      const selectedInit = managedInitiatives.find((m) => m.id === postSelectedEntity);
      const isCompany = selectedInit?.type === "company";
      const bodyWithTitle = postTitle.trim()
        ? `# ${postTitle.trim()}\n\n${postContent.trim()}`
        : postContent.trim();

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: bodyWithTitle,
          visibility: "PUBLIC",
          ...(isCompany
            ? { companyId: selectedInit.id }
            : { openSourceProjectId: selectedInit?.id }),
        }),
      });

      if (res.ok) {
        showToast("Post published on behalf of initiative!");
        setIsCreatePostOpen(false);
        setPostTitle("");
        setPostContent("");
        fetchFeedPosts();
      } else {
        const d = await res.json();
        showToast(d.error || "Failed to publish post");
      }
    } catch {
      showToast("Network error publishing post");
    } finally {
      setCreatingPost(false);
    }
  };

  function formatTimeAgo(dateStr: string) {
    const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diffSec < 60) return "just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  }

  const selectedManagedInit = managedInitiatives.find((m) => m.id === activeManagedTab);

  return (
    <div className="w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-slate-900 text-white px-4 py-2.5 text-xs font-semibold shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Dual-Column Grid with Independent Desktop Scrolling */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full lg:h-[calc(100vh-2rem)] lg:overflow-hidden">
        {/* ========================================================= */}
        {/* MIDDLE DIVISION: Feed, Top Tabs, Filter System (Scrollable) */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 xl:col-span-8 lg:h-full lg:overflow-y-auto pr-2 pb-24 scrollbar-thin space-y-4">
          {/* 1. TOP BAR TABS: [ All ] [ Company ] [ Project ] [ + ] */}
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setMiddleTab("ALL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  middleTab === "ALL"
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setMiddleTab("COMPANY")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  middleTab === "COMPANY"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Company</span>
              </button>
              <button
                type="button"
                onClick={() => setMiddleTab("PROJECT")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  middleTab === "PROJECT"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>Project</span>
              </button>
            </div>

            {/* PLUS BUTTON [+] with Create Dropdown */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
                className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
                title="Create Initiative or Post"
              >
                <Plus className="h-4 w-4" />
              </button>

              {isCreateMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-1.5 z-50 space-y-1 animate-in fade-in zoom-in-95">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateMenuOpen(false);
                      setIsRegisterCompanyOpen(true);
                    }}
                    className="w-full text-left p-2 rounded-xl text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                  >
                    <Building2 className="h-4 w-4 text-indigo-600" />
                    <span>Register New Company</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateMenuOpen(false);
                      setIsRegisterProjectOpen(true);
                    }}
                    className="w-full text-left p-2 rounded-xl text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                  >
                    <Code2 className="h-4 w-4 text-emerald-600" />
                    <span>Register New Project</span>
                  </button>

                  {managedInitiatives.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateMenuOpen(false);
                        setPostSelectedEntity(managedInitiatives[0].id);
                        setIsCreatePostOpen(true);
                      }}
                      className="w-full text-left p-2 rounded-xl text-xs font-semibold hover:bg-purple-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-slate-800"
                    >
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <span>Post as Initiative</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. FILTERING SYSTEM (Exact Match to Home Page System) */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-2.5">
            {/* Search Input Bar */}
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search initiatives, startup founders, projects, tags…"
                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Controls Row: Audience + Connection Scope + Tag Dropdown */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {/* Audience Role Filter */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                {(["ALL", "STUDENT", "FACULTY", "ALUMNI"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTargetRole(r)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      targetRole === r
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    {r === "ALL"
                      ? "All Roles"
                      : r === "STUDENT"
                        ? "Students"
                        : r === "FACULTY"
                          ? "Faculty"
                          : "Alumni"}
                  </button>
                ))}
              </div>

              {/* Connection Scope + Tag Filters */}
              <div className="flex items-center gap-1.5 ml-auto">
                {/* Connection Scope */}
                <button
                  type="button"
                  onClick={() =>
                    setConnectionScope(connectionScope === "ALL" ? "CONNECTED" : "ALL")
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                    connectionScope === "CONNECTED"
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <span>Connected</span>
                  {connectionScope === "CONNECTED" && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>

                {/* Tag Filter Dropdown */}
                <div className="relative" ref={tagDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all cursor-pointer ${
                      activeTag
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <Filter className="h-3 w-3" />
                    <span>{activeTag ? `#${activeTag}` : "Tags"}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>

                  {isTagDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50 space-y-2 animate-in fade-in zoom-in-95">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Filter by Tag
                        </span>
                        {activeTag && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTag(null);
                              setIsTagDropdownOpen(false);
                            }}
                            className="text-[10px] text-rose-600 font-bold hover:underline"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {/* Custom tag input */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const clean = customTagInput.trim().replace(/^#/, "").toLowerCase();
                          if (clean) {
                            setActiveTag(clean);
                            setCustomTagInput("");
                            setIsTagDropdownOpen(false);
                          }
                        }}
                        className="flex items-center gap-1"
                      >
                        <input
                          type="text"
                          value={customTagInput}
                          onChange={(e) => setCustomTagInput(e.target.value)}
                          placeholder="Type tag e.g. ai, launch…"
                          className="flex-1 px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                        />
                        <button
                          type="submit"
                          className="px-2 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Apply
                        </button>
                      </form>

                      {/* Suggested Trending Tags */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {TRENDING_TAGS.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setActiveTag(activeTag === t ? null : t);
                              setIsTagDropdownOpen(false);
                            }}
                            className={`text-[10px] px-2 py-0.5 rounded-md font-mono cursor-pointer transition-all ${
                              activeTag === t
                                ? "bg-indigo-600 text-white font-bold"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                            }`}
                          >
                            #{t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. POSTS FEED BY COMPANIES & PROJECTS */}
          <div className="space-y-4">
            {postsLoading ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-2">
                <Sparkles className="h-7 w-7 text-indigo-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-medium">Loading initiative posts…</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-2">
                <Rocket className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No initiative posts found
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery || activeTag
                    ? "Try adjusting your search query or filters to discover student startup updates and project releases."
                    : "Be the first founder or maintainer to post an update, launch announcement, or talent call!"}
                </p>
                {managedInitiatives.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPostSelectedEntity(managedInitiatives[0].id);
                      setIsCreatePostOpen(true);
                    }}
                    className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Post Update as Initiative</span>
                  </button>
                )}
              </div>
            ) : (
              posts.map((post) => {
                const isLiked = postLikedMap[post.id] || false;
                const likeCount = postLikeCountMap[post.id] ?? post.likeCount ?? 0;
                const isExpanded = expandedComments[post.id] || false;
                const comments = commentsMap[post.id] || [];
                const isLoadingComments = loadingCommentsMap[post.id] || false;
                const commentInput = commentInputMap[post.id] || "";
                const isSubmittingComment = submittingCommentMap[post.id] || false;

                const isCompanyPost = Boolean(post.company || post.companyId);
                const entityName =
                  post.company?.name || post.openSourceProject?.name || "Initiative";
                const entityUrl = post.companyId
                  ? `/initiatives/companies/${post.companyId}`
                  : `/initiatives/projects/${post.openSourceProjectId}`;
                const entityLogo = post.company?.logoUrl || post.openSourceProject?.logoUrl;

                return (
                  <Card
                    key={post.id}
                    className="overflow-hidden border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-shadow"
                  >
                    <CardContent className="p-4 sm:p-5 space-y-3">
                      {/* Header: Company/Project identity & author */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Link
                            href={entityUrl as Route}
                            className="shrink-0 hover:opacity-85 transition-opacity"
                          >
                            <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                              {entityLogo ? (
                                <img
                                  src={entityLogo}
                                  alt={entityName}
                                  className="h-full w-full object-cover"
                                />
                              ) : isCompanyPost ? (
                                <Building2 className="h-5 w-5 text-indigo-600" />
                              ) : (
                                <Code2 className="h-5 w-5 text-emerald-600" />
                              )}
                            </div>
                          </Link>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Link
                                href={entityUrl as Route}
                                className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              >
                                {entityName}
                              </Link>
                              <span
                                className={`rounded-md px-1.5 py-0.2 text-[9px] font-bold ${
                                  isCompanyPost
                                    ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                                    : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                                }`}
                              >
                                {isCompanyPost ? "Company" : "Project"}
                              </span>
                              {post.company?.isRevenueVerified && (
                                <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                                  <ShieldCheck className="h-2.5 w-2.5 text-emerald-600" />
                                  <span>Verified Revenue</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <span>
                                Posted by {post.author.displayName || `@${post.author.username}`}
                              </span>
                              <span>•</span>
                              <Clock className="h-2.5 w-2.5" />
                              <span>{formatTimeAgo(post.createdAt)}</span>
                            </p>
                          </div>
                        </div>

                        <Link
                          href={entityUrl as Route}
                          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                        >
                          <span>View Page</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>

                      {/* Post Content */}
                      <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                        {post.body}
                      </div>

                      {/* Interactive Action Bar: Like, Comment, Share, Report */}
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
                            <span>{post.commentCount || 0}</span>
                          </button>

                          {/* Share */}
                          <button
                            type="button"
                            onClick={() => handleSharePost(post)}
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

                      {/* Expandable Comment Section */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                          {isLoadingComments ? (
                            <div className="text-center py-2 text-xs text-slate-400">
                              Loading comments…
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                              {comments.length === 0 ? (
                                <p className="text-[11px] text-slate-400 italic">
                                  No comments yet. Share your thoughts!
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
                                setCommentInputMap((prev) => ({
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
                              placeholder="Write a comment…"
                              className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                            />
                            <button
                              type="button"
                              disabled={!commentInput.trim() || isSubmittingComment}
                              onClick={() => handleAddComment(post.id)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-50 cursor-pointer transition-colors"
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
        </div>

        {/* ========================================================= */}
        {/* RIGHT DIVISION: 3 Stacked Widgets (Scrollable)            */}
        {/* ========================================================= */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4 lg:h-full lg:overflow-y-auto pr-1 pb-24 space-y-4 scrollbar-thin">
          {/* WIDGET 1: MY COMPANY MANAGING SMALL WINDOW */}
          {/* Visible ONLY if user registered their initiatives */}
          {managedInitiatives.length > 0 && (
            <Card className="border-indigo-100 dark:border-indigo-950/80 bg-gradient-to-b from-indigo-50/40 via-white to-white dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900 shadow-2xs overflow-hidden">
              <CardHeader className="p-3.5 border-b border-indigo-100/60 dark:border-indigo-950/50 pb-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                      <Rocket className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h2 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                        My Initiative Management
                      </h2>
                      <p className="text-[10px] text-slate-500">
                        Incoming interest requests & hiring
                      </p>
                    </div>
                  </div>
                  {selectedManagedInit && (
                    <Link
                      href={
                        (selectedManagedInit.type === "company"
                          ? `/initiatives/companies/${selectedManagedInit.id}`
                          : `/initiatives/projects/${selectedManagedInit.id}`) as Route
                      }
                      className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                    >
                      <span>Manage</span>
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>

                {/* Switcher if user manages multiple initiatives */}
                {managedInitiatives.length > 1 && (
                  <div className="flex gap-1 pt-2 overflow-x-auto scrollbar-none">
                    {managedInitiatives.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setActiveManagedTab(m.id)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                          activeManagedTab === m.id
                            ? "bg-indigo-600 text-white shadow-2xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-3.5 space-y-2.5">
                {selectedManagedInit && selectedManagedInit.interestRequests.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {selectedManagedInit.interestRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/u/${req.user.username}` as Route}
                            className="flex items-center gap-2 hover:opacity-80"
                          >
                            <Avatar
                              src={req.user.avatarUrl || undefined}
                              name={req.user.displayName || "Applicant"}
                              size="sm"
                            />
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                                {req.user.displayName || `@${req.user.username}`}
                              </p>
                              <span className="text-[9px] text-slate-400 uppercase font-mono font-bold">
                                {req.user.role}
                              </span>
                            </div>
                          </Link>

                          <span
                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                              req.status === "ACCEPTED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : req.status === "DECLINED"
                                  ? "bg-slate-100 text-slate-600 dark:bg-slate-800"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-lg">
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            [{req.interestType}]:{" "}
                          </span>
                          <span>{req.message}</span>
                        </div>

                        {req.status === "PENDING" && (
                          <div className="flex items-center justify-end gap-1.5 pt-0.5">
                            {req.email && (
                              <a
                                href={`mailto:${req.email}`}
                                className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 flex items-center gap-1"
                              >
                                <Mail className="h-2.5 w-2.5" />
                                <span>Email</span>
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => handleReviewInterest(req.id, "DECLINED")}
                              className="px-2 py-1 rounded-md text-[10px] font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              Decline
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReviewInterest(req.id, "ACCEPTED")}
                              className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                            >
                              Accept
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-600 dark:text-slate-300">
                      No pending interest requests
                    </p>
                    <p className="text-[10px] text-slate-400">
                      When students or alumni express interest in your initiative, their
                      applications will show up here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* WIDGET 2: MOST FOLLOWED / TOP COMPANIES OR SLIDESHOW */}
          {/* Respects Middle Section selection (All -> both; Company -> company only; Project -> project only) */}
          <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
            <CardHeader className="p-3.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {middleTab === "ALL"
                      ? "Top & Most Followed Initiatives"
                      : middleTab === "COMPANY"
                        ? "Top Companies & Startups"
                        : "Top Projects"}
                  </h3>
                </div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                  Leaderboard
                </span>
              </div>

              {/* Sub-tabs: [ All ] [ Student ] [ Alumni ] */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
                {(["all", "student", "alumni"] as const).map((aud) => (
                  <button
                    key={aud}
                    type="button"
                    onClick={() => setTopAudienceFilter(aud)}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-bold capitalize transition-colors cursor-pointer ${
                      topAudienceFilter === aud
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    {aud}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-3.5 space-y-2">
              {loadingWidgets ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  Loading top initiatives…
                </div>
              ) : topInitiatives.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 italic">
                  No {middleTab.toLowerCase()} initiatives listed for this role filter.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {topInitiatives.map((item, idx) => {
                    const isComp = item.type === "company";
                    const itemUrl = isComp
                      ? `/initiatives/companies/${item.id}`
                      : `/initiatives/projects/${item.id}`;

                    return (
                      <Link
                        key={item.id}
                        href={itemUrl as Route}
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[10px] font-black text-slate-400 font-mono w-4">
                            #{idx + 1}
                          </span>
                          <div className="h-8 w-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                            {item.logoUrl ? (
                              <img
                                src={item.logoUrl}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : isComp ? (
                              <Building2 className="h-4 w-4 text-indigo-600" />
                            ) : (
                              <Code2 className="h-4 w-4 text-emerald-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors truncate max-w-[130px]">
                                {item.name}
                              </span>
                              <span
                                className={`text-[8px] font-bold px-1 rounded-sm ${
                                  isComp
                                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                }`}
                              >
                                {isComp ? "Co" : "Pr"}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                              {isComp
                                ? item.isRevenueVerified
                                  ? `₹ ${(item.verifiedRevenue || 0).toLocaleString()} / yr`
                                  : item.stage || "Startup"
                                : `${item.starsCount || 0} ⭐ • ${item.primaryLanguage || "Open Source"}`}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold text-slate-500">
                            {item.followersCount || 0} follows
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* WIDGET 3: COMPANIES OF CONNECTED MEMBERS AND FOLLOWED PEOPLE */}
          {/* Also respects Middle Section selection */}
          <Card className="border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
            <CardHeader className="p-3.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Network Initiatives
                  </h3>
                </div>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                  Connected & Followed
                </span>
              </div>

              {/* Sub-tabs: [ All ] [ Student ] [ Alumni ] */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl">
                {(["all", "student", "alumni"] as const).map((aud) => (
                  <button
                    key={aud}
                    type="button"
                    onClick={() => setNetworkAudienceFilter(aud)}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-bold capitalize transition-colors cursor-pointer ${
                      networkAudienceFilter === aud
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs"
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    {aud}
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-3.5 space-y-2">
              {loadingWidgets ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  Loading network initiatives…
                </div>
              ) : networkInitiatives.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 italic">
                  {isGuest
                    ? "Log in to see initiatives founded by your connections & people you follow."
                    : "No initiatives found from your connections yet. Expand your network!"}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {networkInitiatives.map((item) => {
                    const isComp = item.type === "company";
                    const itemUrl = isComp
                      ? `/initiatives/companies/${item.id}`
                      : `/initiatives/projects/${item.id}`;

                    return (
                      <Link
                        key={item.id}
                        href={itemUrl as Route}
                        className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                            {item.logoUrl ? (
                              <img
                                src={item.logoUrl}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : isComp ? (
                              <Building2 className="h-4 w-4 text-indigo-600" />
                            ) : (
                              <Code2 className="h-4 w-4 text-emerald-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors truncate block max-w-[150px]">
                              {item.name}
                            </span>
                            <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                              {item.founder ? `By @${item.founder.username}` : "Campus Venture"}
                            </p>
                          </div>
                        </div>

                        <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODALS: Register Company, Register Project, Post as Init   */}
      {/* ========================================================= */}

      {/* Modal: Register Company */}
      <Modal
        isOpen={isRegisterCompanyOpen}
        onClose={() => setIsRegisterCompanyOpen(false)}
        title="Register New Company or Startup"
      >
        <form onSubmit={handleRegisterCompany} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. NeuralWave Technologies"
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tagline
            </label>
            <input
              type="text"
              value={companyTagline}
              onChange={(e) => setCompanyTagline(e.target.value)}
              placeholder="e.g. Next-gen AI agent orchestration for healthcare"
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Stage
              </label>
              <select
                value={companyStage}
                onChange={(e) => setCompanyStage(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              >
                <option value="IDEA">Idea Stage</option>
                <option value="PROTOTYPE">Prototype / MVP</option>
                <option value="EARLY_TRACTION">Early Traction</option>
                <option value="GROWTH">Growth / Revenue Generating</option>
                <option value="SCALING">Scaling / Funded</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Annual Revenue (INR)
              </label>
              <input
                type="number"
                min={0}
                value={companyRevenue}
                onChange={(e) => setCompanyRevenue(Number(e.target.value))}
                placeholder="0"
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={companyDescription}
              onChange={(e) => setCompanyDescription(e.target.value)}
              placeholder="Briefly describe what your startup does, your mission, and the problem you solve…"
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Website URL
              </label>
              <input
                type="url"
                value={companyWebsite}
                onChange={(e) => setCompanyWebsite(e.target.value)}
                placeholder="https://mycompany.com"
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                LinkedIn Page
              </label>
              <input
                type="url"
                value={companyLinkedin}
                onChange={(e) => setCompanyLinkedin(e.target.value)}
                placeholder="https://linkedin.com/company/…"
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="hiringStatus"
              checked={companyHiring}
              onChange={(e) => setCompanyHiring(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label
              htmlFor="hiringStatus"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Actively hiring team members or interns
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsRegisterCompanyOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={registeringCompany || !companyName.trim()}
              className="bg-indigo-600 text-white"
            >
              {registeringCompany ? "Registering…" : "Register Company"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Register Project */}
      <Modal
        isOpen={isRegisterProjectOpen}
        onClose={() => setIsRegisterProjectOpen(false)}
        title="Register Open Source Project"
      >
        <form onSubmit={handleRegisterProject} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. StuNet Engine"
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              GitHub Repository URL *
            </label>
            <input
              type="url"
              required
              value={projectGithubUrl}
              onChange={(e) => setProjectGithubUrl(e.target.value)}
              placeholder="https://github.com/organization/repo"
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Primary Language
            </label>
            <input
              type="text"
              value={projectPrimaryLang}
              onChange={(e) => setProjectPrimaryLang(e.target.value)}
              placeholder="e.g. TypeScript, Rust, Python"
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tagline
            </label>
            <input
              type="text"
              value={projectTagline}
              onChange={(e) => setProjectTagline(e.target.value)}
              placeholder="e.g. Fast, light, type-safe API framework"
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={projectDescription}
              onChange={(e) => setProjectDescription(e.target.value)}
              placeholder="Explain what the project does and how student contributors can participate…"
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isOpenContributors"
              checked={projectIsOpen}
              onChange={(e) => setProjectIsOpen(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <label
              htmlFor="isOpenContributors"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Open for student contributors & PRs
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsRegisterProjectOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={registeringProject || !projectName.trim() || !projectGithubUrl.trim()}
              className="bg-emerald-600 text-white"
            >
              {registeringProject ? "Registering…" : "Register Project"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Post as Initiative */}
      <Modal
        isOpen={isCreatePostOpen}
        onClose={() => setIsCreatePostOpen(false)}
        title="Publish Post as Initiative"
      >
        <form onSubmit={handleCreateInitiativePost} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Publish on behalf of
            </label>
            <select
              value={postSelectedEntity}
              onChange={(e) => setPostSelectedEntity(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            >
              {managedInitiatives.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.type === "company" ? "Company" : "Project"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Post Title (Optional)
            </label>
            <input
              type="text"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              placeholder="e.g. We just launched our beta! or Calling all frontend interns!"
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Post Content *
            </label>
            <textarea
              rows={4}
              required
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Share updates, hiring announcements, milestone accomplishments…"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreatePostOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creatingPost || !postContent.trim()}
              className="bg-indigo-600 text-white"
            >
              {creatingPost ? "Publishing…" : "Publish Post"}
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
