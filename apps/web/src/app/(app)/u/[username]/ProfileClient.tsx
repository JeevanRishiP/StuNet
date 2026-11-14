"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Building2,
  Mail,
  UserPlus,
  UserCheck,
  Flag,
  ExternalLink,
  Plus,
  Award,
  Globe,
  Users,
  Trophy,
  Flame,
  Code,
  Rocket,
  Eye,
  Check,
  GraduationCap,
  Trash2,
  Lightbulb,
  Sparkles,
  Shield,
  Crown,
  Rss,
  History,
  Edit3,
  BarChart2,
} from "lucide-react";
import { Button, Card, Modal } from "@stunet/ui";

interface ProfileLinkItem {
  platform: string;
  url: string;
}

interface CompanyRoleItem {
  companyId: string;
  companyName: string;
  description?: string | null;
  websiteUrl?: string | null;
  linkedinUrl?: string | null;
  ownerType: "FOUNDER" | "CO_FOUNDER" | "FOUNDING_MEMBER" | "EMPLOYEE" | "ADVISOR" | string;
  position?: string | null;
}

interface OpenSourceProjectItem {
  id: string;
  name: string;
  description?: string | null;
  githubUrl: string;
  syncedStars?: number | null;
  links: Array<{ id: string; name: string; url: string }>;
}

interface OwnedGroupProfileItem {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  whatsappLink?: string | null;
  type?: string;
  memberCount: number;
  hideMembers?: boolean;
}

interface ProfileData {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  campusName: string | null;
  role?: string;
  email?: string | null;
  phone?: string | null;
  personalEmail?: string | null;
  whatsappNumber?: string | null;
  year?: number | string;
  joiningYear?: number | null;
  academicYear?: {
    yearNumber: number;
    label: string;
    shortLabel: string;
    isAlumni: boolean;
    academicSession: string;
    graduationYear: number;
  } | null;
  // Plan Delta v3 fields
  facultyDetails?: { employeeId: string } | null;
  studentAcademicDetails?: {
    usn: string;
    currentCourseYear?: number | null;
    joinedYear?: number | null;
    graduationYear?: number | null;
  } | null;
  profileLinks?: ProfileLinkItem[];
  companyRoles?: CompanyRoleItem[];
  openSourceProjects?: OpenSourceProjectItem[];
  ownedGroups?: OwnedGroupProfileItem[];
  location?: string;
  university?: string;
  portfolioUrl?: string;
  clubRole?: {
    role: string;
    clubName: string;
  };
  presidentClubs?: Array<{
    clubName: string;
    clubSlug: string;
  }>;
  primaryVenture?: {
    name: string;
    designation: string;
    logoUrl?: string;
    url?: string;
  };
  internship?: {
    name: string;
    designation: string;
    logoUrl?: string;
    url?: string;
  };
  connectionCount?: number;
  followerCount?: number;
  followingCount?: number;
  techStacks?: string[];
  achievements?: Array<{
    id: string;
    category?: string;
    title: string;
    description?: string | null;
    verificationStatus: string;
    proofUrl?: string | null;
    createdAt: string;
  }>;
  posts?: Array<{
    id: string;
    body: string | null;
    createdAt: string;
    commentCount: number;
    viewCount: number;
    likeCount: number;
  }>;
  polls?: Array<{
    id: string;
    postId: string;
    question: string;
    pollType: string;
    complaintLevel?: string | null;
    section?: string | null;
    scopeLabel: string;
    isAnonymous: boolean;
    submissionMode: string;
    closesAt: string | null;
    totalVotes: number;
    createdAt: string;
    options: Array<{
      id: string;
      text: string;
      voteCount: number;
      pct: number;
    }>;
  }>;
}

interface Props {
  profile: ProfileData;
  isOwn: boolean;
  isGuest?: boolean;
  connectionStatus: "NONE" | "PENDING" | "ACCEPTED" | "SENT";
  connectionId: string | null;
  initialIsFollowing?: boolean;
  viewerId?: string | null;
}

export default function ProfileClient({
  profile,
  isOwn,
  isGuest = false,
  connectionStatus,
  connectionId,
  initialIsFollowing = false,
}: Props) {
  const [status, setStatus] = useState(connectionStatus);
  const [connId, setConnId] = useState(connectionId);
  const [working, setWorking] = useState(false);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(profile.followerCount ?? 0);
  const [followWorking, setFollowWorking] = useState(false);

  // Tabs: On self profile, default to POSTS ("Posts & Polls") as first tab; on other profiles default to HOME
  const [activeTab, setActiveTab] = useState<
    "ACHIEVEMENTS" | "ABOUT" | "HOME" | "PROJECTS" | "GRIT" | "MINT" | "POSTS"
  >(isOwn ? "POSTS" : "HOME");

  // Sub-tabs for "Posts & Polls"
  const [postsSubTab, setPostsSubTab] = useState<"POSTS" | "POLLS">("POSTS");
  const [postsList, setPostsList] = useState(profile.posts ?? []);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostBody, setEditPostBody] = useState("");
  const [postActionWorking, setPostActionWorking] = useState(false);

  const [pollsList, setPollsList] = useState(profile.polls ?? []);
  const [editingPollId, setEditingPollId] = useState<string | null>(null);
  const [editPollQuestion, setEditPollQuestion] = useState("");
  const [pollActionWorking, setPollActionWorking] = useState(false);

  useEffect(() => {
    if (profile.posts) setPostsList(profile.posts);
  }, [profile.posts]);

  useEffect(() => {
    if (profile.polls) setPollsList(profile.polls);
  }, [profile.polls]);

  async function handleSavePostEdit(postId: string) {
    if (!editPostBody.trim()) return;
    setPostActionWorking(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: editPostBody }),
      });
      if (res.ok) {
        setPostsList((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, body: editPostBody } : p)),
        );
        setEditingPostId(null);
      }
    } catch {
      // ignore
    } finally {
      setPostActionWorking(false);
    }
  }

  async function handleDeletePost(postId: string) {
    if (!confirm("Are you sure you want to delete this post?")) return;
    setPostActionWorking(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (res.ok) {
        setPostsList((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch {
      // ignore
    } finally {
      setPostActionWorking(false);
    }
  }

  async function handleSavePollEdit(pollId: string) {
    if (!editPollQuestion.trim()) return;
    setPollActionWorking(true);
    try {
      const res = await fetch(`/api/polls/${pollId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: editPollQuestion }),
      });
      if (res.ok) {
        setPollsList((prev) =>
          prev.map((p) => (p.id === pollId ? { ...p, question: editPollQuestion } : p)),
        );
        setEditingPollId(null);
      }
    } catch {
      // ignore
    } finally {
      setPollActionWorking(false);
    }
  }

  async function handleDeletePoll(pollId: string) {
    if (!confirm("Are you sure you want to delete this poll?")) return;
    setPollActionWorking(true);
    try {
      const res = await fetch(`/api/polls/${pollId}`, { method: "DELETE" });
      if (res.ok) {
        setPollsList((prev) => prev.filter((p) => p.id !== pollId));
      }
    } catch {
      // ignore
    } finally {
      setPollActionWorking(false);
    }
  }

  // Tab 4 (Projects) sub-filters
  const [projectFilter, setProjectFilter] = useState<
    "ALL" | "GITHUB" | "HUGGINGFACE" | "KAGGLE" | "OTHER"
  >("ALL");

  // Tab 2 (About) WhatsApp privacy toggle
  const [whatsappVisibility, setWhatsappVisibility] = useState<"ALL" | "CONNECTED">("CONNECTED");

  // Report Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("SPAM");
  const [reportDetails, setReportDetails] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Fallback defaults matching student specification
  const displayName = profile.displayName ?? profile.username ?? "Student";
  const username = profile.username ?? "student";
  const yearText =
    profile.academicYear?.label ?? (profile.year ? `Year ${profile.year}` : "1st Year");
  const locationText = profile.location ?? "Bengaluru, Karnataka";
  const universityText = profile.university ?? "S-VYASA University";
  const connectionCount = profile.connectionCount ?? 0;
  const portfolioUrl = profile.portfolioUrl ?? "https://github.com";

  // Venture/Circle 1 & Internship/Circle 2 data
  // Plan Delta v3: Live state for links, companies, projects
  const [linksList, setLinksList] = useState<ProfileLinkItem[]>(profile.profileLinks ?? []);
  const [companyRolesList, setCompanyRolesList] = useState<CompanyRoleItem[]>(
    profile.companyRoles ?? [],
  );
  const [projectsList, setProjectsList] = useState<OpenSourceProjectItem[]>(
    profile.openSourceProjects ?? [],
  );

  // Edit Profile Links Modal State
  const [editLinksModalOpen, setEditLinksModalOpen] = useState(false);
  const [newLinkPlatform, setNewLinkPlatform] = useState("GITHUB");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [isSavingLinks, setIsSavingLinks] = useState(false);
  const [linksError, setLinksError] = useState("");

  // Add Company / Initiative Modal State with Trigram Search
  const [addCompanyModalOpen, setAddCompanyModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyRole, setNewCompanyRole] = useState<"FOUNDER" | "CO_FOUNDER">("FOUNDER");
  const [newCompanyPosition, setNewCompanyPosition] = useState("Founder & Tech Lead");
  const [newCompanyDesc, setNewCompanyDesc] = useState("");
  const [newCompanyWebsite, setNewCompanyWebsite] = useState("");
  const [newCompanyLinkedin, setNewCompanyLinkedin] = useState("");
  const [trigramMatches, setTrigramMatches] = useState<
    Array<{ id: string; name: string; similarity: number }>
  >([]);
  const [isSearchingCompany, setIsSearchingCompany] = useState(false);
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);
  const [selectedMatchNotice, setSelectedMatchNotice] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState("");

  // Add Open Source Project Modal State
  const [addProjectModalOpen, setAddProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectGithub, setNewProjectGithub] = useState("");
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [projectError, setProjectError] = useState("");

  // Debounced Trigram Search for duplicate initiative prevention (Plan Delta v3 Section 4)
  useEffect(() => {
    const term = newCompanyName.trim();
    if (!term || term.length < 2) {
      setTrigramMatches([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingCompany(true);
      try {
        const res = await fetch(`/api/companies/search?q=${encodeURIComponent(term)}`);
        if (res.ok) {
          const data = await res.json();
          setTrigramMatches(data.matches ?? []);
        }
      } catch (err) {
        console.error("Trigram duplicate search error", err);
      } finally {
        setIsSearchingCompany(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [newCompanyName]);

  // Profile Links Save Handler
  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault();
    if (!newLinkUrl.trim()) return;
    setLinksError("");
    setIsSavingLinks(true);
    try {
      const updated = [
        ...linksList.filter((l) => l.platform !== newLinkPlatform),
        { platform: newLinkPlatform, url: newLinkUrl.trim() },
      ];
      const res = await fetch("/api/users/me/profile-links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: updated }),
      });
      if (res.ok) {
        setLinksList(updated);
        setNewLinkUrl("");
      } else {
        const d = await res.json();
        setLinksError(d.error ?? "Failed to save link.");
      }
    } catch {
      setLinksError("Network error saving profile links.");
    } finally {
      setIsSavingLinks(false);
    }
  }

  async function handleRemoveLink(platformToRemove: string) {
    setIsSavingLinks(true);
    try {
      const updated = linksList.filter((l) => l.platform !== platformToRemove);
      const res = await fetch("/api/users/me/profile-links", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: updated }),
      });
      if (res.ok) {
        setLinksList(updated);
      }
    } finally {
      setIsSavingLinks(false);
    }
  }

  // Company / Initiative Submit Handler
  async function handleSubmitCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    setCompanyError("");
    setIsSubmittingCompany(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCompanyName.trim(),
          description: newCompanyDesc.trim() || undefined,
          websiteUrl: newCompanyWebsite.trim() || undefined,
          linkedinUrl: newCompanyLinkedin.trim() || undefined,
          ownerType: newCompanyRole,
          position: newCompanyPosition.trim() || undefined,
          showOnProfile: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const roleItem: CompanyRoleItem = {
          companyId: data.company.id,
          companyName: data.company.name,
          description: data.company.description,
          websiteUrl: data.company.websiteUrl,
          linkedinUrl: data.company.linkedinUrl,
          ownerType: data.role.ownerType,
          position: data.role.position,
        };
        setCompanyRolesList((prev) => [roleItem, ...prev]);
        setAddCompanyModalOpen(false);
        setNewCompanyName("");
        setNewCompanyDesc("");
        setNewCompanyWebsite("");
        setNewCompanyLinkedin("");
        setSelectedMatchNotice(null);
        setTrigramMatches([]);
      } else {
        const d = await res.json();
        setCompanyError(d.error ?? "Failed to link initiative.");
      }
    } catch {
      setCompanyError("Network error submitting company.");
    } finally {
      setIsSubmittingCompany(false);
    }
  }

  // Open Source Project Submit Handler
  async function handleSubmitProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjectName.trim() || !newProjectGithub.trim()) return;
    setProjectError("");
    setIsSubmittingProject(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDesc.trim() || undefined,
          githubUrl: newProjectGithub.trim(),
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setProjectsList((prev) => [created, ...prev]);
        setAddProjectModalOpen(false);
        setNewProjectName("");
        setNewProjectDesc("");
        setNewProjectGithub("");
      } else {
        const d = await res.json();
        setProjectError(d.error ?? "Failed to add project.");
      }
    } catch {
      setProjectError("Network error adding project.");
    } finally {
      setIsSubmittingProject(false);
    }
  }

  const primaryCompany = companyRolesList[0];
  const secondaryCompany = companyRolesList[1];
  const venture = primaryCompany
    ? {
        name: primaryCompany.companyName,
        designation: primaryCompany.ownerType === "FOUNDER" ? "Founder" : "Co-Founder",
        url: `/initiatives/companies/${primaryCompany.companyId}`,
      }
    : (profile.primaryVenture ?? null);
  const internship = secondaryCompany
    ? {
        name: secondaryCompany.companyName,
        designation:
          secondaryCompany.ownerType === "FOUNDER"
            ? "Co-Founder"
            : (secondaryCompany.position ?? "Lead"),
        url: `/initiatives/companies/${secondaryCompany.companyId}`,
      }
    : (profile.internship ?? null);

  // Club Leadership (Real role only, no fake default)
  const clubBadge = profile.clubRole ?? null;

  async function handleConnect() {
    setWorking(true);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: profile.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setConnId(data.id);
        setStatus("SENT");
      } else {
        setStatus("SENT");
      }
    } finally {
      setWorking(false);
    }
  }

  async function handleAccept() {
    if (!connId) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/connections/${connId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACCEPT" }),
      });
      if (res.ok) setStatus("ACCEPTED");
    } finally {
      setWorking(false);
    }
  }

  async function handleToggleFollow() {
    if (followWorking || isGuest || isOwn) return;
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    setFollowerCount((c) => Math.max(0, c + (nextState ? 1 : -1)));
    setFollowWorking(true);
    try {
      const res = await fetch(
        nextState ? "/api/follows" : `/api/follows?userId=${encodeURIComponent(profile.id)}`,
        {
          method: nextState ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: nextState
            ? JSON.stringify({ followingId: profile.id, source: "PROFILE" })
            : undefined,
        },
      );
      if (res.ok) {
        const data = (await res.json()) as { isFollowing: boolean; followerCount?: number };
        setIsFollowing(Boolean(data.isFollowing));
        if (typeof data.followerCount === "number") {
          setFollowerCount(data.followerCount);
        }
      } else {
        setIsFollowing(!nextState);
        setFollowerCount((c) => Math.max(0, c + (nextState ? -1 : 1)));
      }
    } catch {
      setIsFollowing(!nextState);
      setFollowerCount((c) => Math.max(0, c + (nextState ? -1 : 1)));
    } finally {
      setFollowWorking(false);
    }
  }

  async function handleSubmitReport() {
    setSubmittingReport(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: "USER_PROFILE",
          reportedUserId: profile.id,
          reason: reportReason,
          details: reportDetails.trim() || undefined,
        }),
      });
      if (res.ok) {
        setReportSuccess(true);
        setTimeout(() => {
          setReportModalOpen(false);
          setReportSuccess(false);
        }, 1500);
      }
    } finally {
      setSubmittingReport(false);
    }
  }

  return (
    <div className="max-w-[935px] mx-auto px-4 py-6 space-y-6">
      {/* ── SECTION A: EXACT WIREFRAME PROFILE HEADER ── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col md:flex-row items-start gap-8">
          {/* Left Side: Avatar + Orbital Role Circles */}
          <div className="relative shrink-0 flex flex-col items-center">
            {/* Main Avatar Container */}
            <div className="relative">
              {/* Main Avatar Circle */}
              <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full ring-4 ring-slate-100 dark:ring-slate-800 overflow-hidden shadow-lg bg-gradient-to-tr from-indigo-100 to-purple-100 dark:from-indigo-950 dark:to-purple-950 flex items-center justify-center">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl sm:text-4xl font-extrabold text-indigo-700 dark:text-indigo-300">
                    {displayName[0]?.toUpperCase() ?? "S"}
                  </span>
                )}
              </div>

              {/* Circle 1: Primary Venture / Company Badge (Bottom-Right of Avatar) */}
              {venture && (
                <div
                  title={`Founder at ${venture.name}`}
                  className="absolute -bottom-2 -right-2 z-10 flex items-center gap-1.5"
                >
                  <a
                    href={venture.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 w-10 rounded-full bg-white dark:bg-slate-800 border-2 border-amber-500 shadow-md flex items-center justify-center hover:scale-105 transition-transform overflow-hidden p-0.5"
                  >
                    <div className="h-full w-full rounded-full bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 font-extrabold text-[11px]">
                      1
                    </div>
                  </a>
                  <span className="hidden sm:inline-block text-[11px] font-bold text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full whitespace-nowrap shadow-2xs">
                    {venture.designation}
                  </span>
                </div>
              )}
            </div>

            {/* Circle 2: Secondary Role / Internship Badge (Directly Below Avatar) */}
            {internship && (
              <div className="mt-5 flex flex-col items-center">
                <a
                  href={internship.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Intern at ${internship.name}`}
                  className="h-9 w-9 rounded-full bg-white dark:bg-slate-800 border-2 border-orange-500 shadow-sm flex items-center justify-center hover:scale-105 transition-transform p-0.5"
                >
                  <div className="h-full w-full rounded-full bg-orange-500/10 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 font-extrabold text-[10px]">
                    2
                  </div>
                </a>
                <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 mt-1">
                  {internship.designation}
                </span>
              </div>
            )}
          </div>

          {/* Right Side: Identity, Institutional Details, Club Leadership Badge, Bio Box */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Row 1: Full Name (Blue Link) & Honorable President Badge + Club Leadership Badge */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <a
                    href={portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-1.5"
                  >
                    <h1 className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 tracking-tight transition-colors">
                      {displayName}
                    </h1>
                    <ExternalLink className="h-4 w-4 text-blue-500 opacity-70 group-hover:opacity-100" />
                  </a>

                  {profile.presidentClubs &&
                    profile.presidentClubs.map((pc) => (
                      <Link
                        key={pc.clubSlug}
                        href={`/clubs/${pc.clubSlug}`}
                        title={`Club President · ${pc.clubName}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/15 via-yellow-500/15 to-amber-500/10 dark:from-amber-500/20 dark:via-yellow-500/15 dark:to-amber-500/20 border border-amber-400/60 dark:border-amber-500/50 text-amber-800 dark:text-amber-300 shadow-xs hover:shadow-sm hover:border-amber-500 transition-all"
                      >
                        <Crown className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                        <span className="text-[11px] font-extrabold uppercase tracking-wider">
                          President
                        </span>
                        <span className="text-amber-500/70 dark:text-amber-400/60 font-light">
                          |
                        </span>
                        <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
                          {pc.clubName}
                        </span>
                      </Link>
                    ))}
                </div>

                {/* Role Badge (Faculty / Student / Alumni) & Location */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {profile.role === "FACULTY" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/50 border border-purple-300 dark:border-purple-800 text-purple-800 dark:text-purple-300 shadow-2xs">
                      <Building2 className="h-3.5 w-3.5 text-purple-700 dark:text-purple-400" />
                      <span>
                        Faculty Member
                        {profile.facultyDetails?.employeeId
                          ? ` · ID: ${profile.facultyDetails.employeeId}`
                          : ""}
                      </span>
                    </span>
                  ) : profile.role === "ALUMNI" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 shadow-2xs">
                      <GraduationCap className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                      <span>
                        Alumni
                        {profile.academicYear?.graduationYear
                          ? ` · Class of ${profile.academicYear.graduationYear}`
                          : ""}
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
                      <GraduationCap className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>{yearText}</span>
                    </span>
                  )}
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {locationText}
                  </span>
                </div>

                {/* University / Institution */}
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>{universityText}</span>
                </p>

                {/* Initiatives & Ventures Badges (Plan Delta v3) */}
                {companyRolesList.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {companyRolesList.map((cr) => {
                      const isFounderOrCo =
                        cr.ownerType === "FOUNDER" || cr.ownerType === "CO_FOUNDER";
                      return (
                        <div key={cr.companyId} className="inline-flex items-center gap-1">
                          <Link
                            href={`/initiatives/companies/${cr.companyId}`}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors shadow-2xs"
                            title={cr.description ?? undefined}
                          >
                            <Rocket className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                            <span>
                              {cr.companyName} ·{" "}
                              {isFounderOrCo
                                ? cr.ownerType === "FOUNDER"
                                  ? "Founder"
                                  : "Co-Founder"
                                : cr.ownerType}
                              {cr.position ? ` (${cr.position})` : ""}
                            </span>
                          </Link>
                          {isOwn && isFounderOrCo && (
                            <Link
                              href={`/initiatives/companies/${cr.companyId}`}
                              className="p-1 rounded-full text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
                              title="Edit Company Details"
                            >
                              <Edit3 className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Linktree-Style Public Profile Links (Plan Delta v3) */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  {linksList.map((item) => {
                    const badgeConfig: Record<
                      string,
                      {
                        label: string;
                        icon: React.ComponentType<{ className?: string }>;
                        bg: string;
                        text: string;
                        border: string;
                      }
                    > = {
                      GITHUB: {
                        label: "GitHub",
                        icon: Code,
                        bg: "bg-slate-900 hover:bg-black",
                        text: "text-white",
                        border: "border-slate-800",
                      },
                      LEETCODE: {
                        label: "LeetCode",
                        icon: Trophy,
                        bg: "bg-amber-500 hover:bg-amber-600",
                        text: "text-white",
                        border: "border-amber-600",
                      },
                      HACKERRANK: {
                        label: "HackerRank",
                        icon: Code,
                        bg: "bg-emerald-600 hover:bg-emerald-700",
                        text: "text-white",
                        border: "border-emerald-700",
                      },
                      CODEFORCES: {
                        label: "Codeforces",
                        icon: Code,
                        bg: "bg-rose-600 hover:bg-rose-700",
                        text: "text-white",
                        border: "border-rose-700",
                      },
                      KAGGLE: {
                        label: "Kaggle",
                        icon: Sparkles,
                        bg: "bg-sky-500 hover:bg-sky-600",
                        text: "text-white",
                        border: "border-sky-600",
                      },
                      LINKEDIN: {
                        label: "LinkedIn",
                        icon: Globe,
                        bg: "bg-blue-600 hover:bg-blue-700",
                        text: "text-white",
                        border: "border-blue-700",
                      },
                      PORTFOLIO: {
                        label: "Portfolio",
                        icon: ExternalLink,
                        bg: "bg-indigo-600 hover:bg-indigo-700",
                        text: "text-white",
                        border: "border-indigo-700",
                      },
                      LINKTREE: {
                        label: "Linktree",
                        icon: ExternalLink,
                        bg: "bg-emerald-500 hover:bg-emerald-600",
                        text: "text-white",
                        border: "border-emerald-600",
                      },
                      YOUTUBE: {
                        label: "YouTube",
                        icon: Globe,
                        bg: "bg-red-600 hover:bg-red-700",
                        text: "text-white",
                        border: "border-red-700",
                      },
                      TWITTER: {
                        label: "Twitter/X",
                        icon: Globe,
                        bg: "bg-slate-800 hover:bg-slate-900",
                        text: "text-white",
                        border: "border-slate-700",
                      },
                    };
                    const cfg = badgeConfig[item.platform] ?? {
                      label: item.platform,
                      icon: Globe,
                      bg: "bg-slate-700 hover:bg-slate-800",
                      text: "text-white",
                      border: "border-slate-600",
                    };
                    const IconComp = cfg.icon;
                    return (
                      <a
                        key={item.platform}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-2xs transition-transform hover:scale-105 border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                      >
                        <IconComp className="h-3 w-3" />
                        <span>{cfg.label}</span>
                        <ExternalLink className="h-2.5 w-2.5 opacity-80" />
                      </a>
                    );
                  })}

                  {isOwn && (
                    <button
                      type="button"
                      onClick={() => setEditLinksModalOpen(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors shadow-2xs"
                    >
                      <Plus className="h-3 w-3" />
                      <span>{linksList.length > 0 ? "Edit Links" : "+ Add Public Links"}</span>
                    </button>
                  )}
                  {isOwn && (
                    <button
                      type="button"
                      onClick={() => setAddCompanyModalOpen(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/50 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 transition-colors shadow-2xs"
                    >
                      <Plus className="h-3 w-3" />
                      <span>+ Link Initiative</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Club Leadership Badge: Gold Star + Purple Text */}
              {clubBadge && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/50 border border-purple-200/80 dark:border-purple-800/80 shadow-2xs">
                  <span className="text-amber-500 text-sm">⭐</span>
                  <span className="text-xs font-extrabold text-purple-700 dark:text-purple-300 tracking-wide">
                    {clubBadge.role} • {clubBadge.clubName}
                  </span>
                </div>
              )}
            </div>

            {/* Bio Box with Clickable Connections Counter inside */}
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 p-4 space-y-3">
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {profile.bio || profile.headline || "No bio added yet."}
              </p>

              {/* Clickable Connections & Followers Counter at bottom-left */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/network"
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline flex items-center gap-1"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>{connectionCount} Connections</span>
                  </Link>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Rss className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                    <span>{followerCount} Followers</span>
                  </span>
                  {typeof profile.followingCount === "number" && (
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      ({profile.followingCount} Following)
                    </span>
                  )}
                </div>

                {/* Action Buttons for Other Profile or Edit Button for Self */}
                {isGuest ? null : isOwn ? (
                  <div className="flex items-center gap-2">
                    <Link
                      href="/activity"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg shadow-2xs transition-colors"
                    >
                      <History className="h-3.5 w-3.5" />
                      <span>Your Activity</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setActiveTab("ABOUT")}
                      className="text-xs font-semibold px-3 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                    >
                      Edit Profile
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {/* LinkedIn-style 1-way Follow Button */}
                    <button
                      type="button"
                      onClick={handleToggleFollow}
                      disabled={followWorking}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        isFollowing
                          ? "bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-200 dark:hover:border-rose-800 hover:text-rose-700 dark:hover:text-rose-300"
                          : "bg-white dark:bg-slate-800 border-sky-600 dark:border-sky-500 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>

                    {status === "NONE" && (
                      <Button
                        size="sm"
                        onClick={handleConnect}
                        disabled={working}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1 py-1"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Connect</span>
                      </Button>
                    )}
                    {status === "SENT" && (
                      <span className="text-xs font-semibold px-2.5 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
                        Pending
                      </span>
                    )}
                    {status === "PENDING" && (
                      <Button
                        size="sm"
                        onClick={handleAccept}
                        disabled={working}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 py-1"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Accept</span>
                      </Button>
                    )}
                    {status === "ACCEPTED" && (
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Check className="h-3 w-3" /> Connected
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setReportModalOpen(true)}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                      title="Report"
                    >
                      <Flag className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION B: NAVIGATION TABS ── */}
      {/* Self profile: Posts & Polls is in the first position (default). Other profiles: Posts & Polls is at the end */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-1.5 shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto text-xs font-bold">
          {(isOwn
            ? [
                { id: "POSTS" as const, label: "Posts & Polls" },
                { id: "ACHIEVEMENTS" as const, label: "Achievements" },
                { id: "ABOUT" as const, label: "About" },
                { id: "HOME" as const, label: "Home" },
                { id: "PROJECTS" as const, label: "Projects" },
                { id: "GRIT" as const, label: "GRIT" },
                { id: "MINT" as const, label: "MINT" },
              ]
            : [
                { id: "ACHIEVEMENTS" as const, label: "Achievements" },
                { id: "ABOUT" as const, label: "About" },
                { id: "HOME" as const, label: "Home" },
                { id: "PROJECTS" as const, label: "Projects" },
                { id: "GRIT" as const, label: "GRIT" },
                { id: "MINT" as const, label: "MINT" },
                { id: "POSTS" as const, label: "Posts & Polls" },
              ]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-3 rounded-xl transition-all whitespace-nowrap text-center ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT CONTAINERS ── */}

      {/* TAB 1: ACHIEVEMENTS */}
      {activeTab === "ACHIEVEMENTS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Verified Achievements
            </h2>
            {isOwn && (
              <Button size="sm" className="text-xs bg-indigo-600 text-white">
                Update Achievements
              </Button>
            )}
          </div>

          {profile.achievements && profile.achievements.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.achievements.map((ach) => (
                <Card
                  key={ach.id}
                  className="border-slate-200/90 dark:border-slate-800 dark:bg-slate-900 shadow-2xs p-4"
                >
                  <div className="flex items-center gap-2.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-2">
                    <Award className="h-4 w-4" />
                    <span>{ach.category || "Achievement"}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {ach.title}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {ach.description}
                  </p>
                  {ach.verificationStatus === "VERIFIED" && (
                    <span className="inline-block mt-2 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                      Verified by Admin
                    </span>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
              <Award className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                No verified achievements yet
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Official achievements verified by campus administrators will appear here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ABOUT */}
      {activeTab === "ABOUT" && (
        <div className="space-y-4">
          {/* Academic Standing & Year of Study */}
          <Card className="border-slate-200/90 dark:border-slate-800 dark:bg-slate-900 shadow-2xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Academic Profile</span>
              </h3>
              <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 px-2 py-0.5 rounded-full">
                {profile.academicYear?.academicSession
                  ? `Session ${profile.academicYear.academicSession}`
                  : "Active"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400 dark:text-slate-500 font-semibold block mb-0.5">
                  Current Standing
                </span>
                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
                  {profile.academicYear?.label ?? yearText}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Aug–Jul Academic Cycle
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400 dark:text-slate-500 font-semibold block mb-0.5">
                  Year of Joining
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {profile.joiningYear ? `${profile.joiningYear} Batch` : "Not specified"}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Enrolled at {universityText}
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400 dark:text-slate-500 font-semibold block mb-0.5">
                  Expected Graduation
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {profile.academicYear?.graduationYear
                    ? `Class of ${profile.academicYear.graduationYear}`
                    : "—"}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  4-Year Degree Programme
                </span>
              </div>
            </div>
          </Card>

          {/* Contact Info with Privacy Controls */}
          <Card className="border-slate-200/90 dark:border-slate-800 dark:bg-slate-900 shadow-2xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Mail className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Contact Info</span>
              </h3>
              {isOwn && (
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  Privacy Protected
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-semibold block mb-0.5">
                  Student Email ID
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {profile.email ?? `${username}@niat.edu.in`}
                </span>
              </div>

              <div>
                <span className="text-slate-400 dark:text-slate-500 font-semibold block mb-0.5">
                  Personal Email ID
                </span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {profile.personalEmail ?? "student.personal@example.com"}
                </span>
              </div>

              <div className="sm:col-span-2 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-bold block">
                      WhatsApp Number
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {profile.whatsappNumber ?? "+91 98765 43210"}
                    </span>
                  </div>

                  {/* Privacy Toggle: Who can see - All • Connected Users */}
                  {isOwn && (
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                      <Eye className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        Who can see:
                      </span>
                      <button
                        type="button"
                        onClick={() => setWhatsappVisibility("ALL")}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          whatsappVisibility === "ALL"
                            ? "bg-indigo-600 text-white"
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setWhatsappVisibility("CONNECTED")}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          whatsappVisibility === "CONNECTED"
                            ? "bg-indigo-600 text-white"
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        Connected Users
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Social Profiles & Public Links */}
          <Card className="border-slate-200/90 dark:border-slate-800 dark:bg-slate-900 shadow-2xs p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Globe className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Public Links (Linktree-Style Profiles)</span>
              </h3>
              {isOwn && (
                <button
                  type="button"
                  onClick={() => setEditLinksModalOpen(true)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Manage Links</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {linksList.length > 0 ? (
                linksList.map((item) => (
                  <a
                    key={item.platform}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors shadow-2xs"
                  >
                    <Globe className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-bold">{item.platform}</span>
                    <ExternalLink className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                  </a>
                ))
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  No public profile links added yet.
                </p>
              )}
            </div>
          </Card>

          {/* Owned Groups & Student Communities (Visible in About Section) */}
          {profile.ownedGroups && profile.ownedGroups.length > 0 && (
            <Card className="border-slate-200/90 dark:border-slate-800 dark:bg-slate-900 shadow-2xs p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Owned Groups & Student Communities</span>
                </h3>
                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 px-2.5 py-0.5 rounded-full">
                  {profile.ownedGroups.length} Owned
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {profile.ownedGroups.map((grp) => (
                  <div
                    key={grp.id}
                    className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-xs transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-slate-100">
                          {grp.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900/60">
                            ID: #{grp.code}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">·</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                            {grp.memberCount} members
                          </span>
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          grp.type === "OPEN"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                        }`}
                      >
                        {grp.type === "OPEN" ? "Public" : "Request Required"}
                      </span>
                    </div>

                    {grp.description && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                        {grp.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                        Group Admin
                      </span>
                      <Link
                        href="/network"
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <span>View in Network</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Unverified Achievements */}
          {profile.achievements &&
            profile.achievements.some((a) => a.verificationStatus !== "VERIFIED") && (
              <Card className="border-slate-200/90 dark:border-slate-800 dark:bg-slate-900 shadow-2xs p-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Award className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Achievements (Un-Verified or Community Projects)</span>
                </h3>
                <ul className="list-disc pl-5 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  {profile.achievements
                    .filter((a) => a.verificationStatus !== "VERIFIED")
                    .map((a) => (
                      <li key={a.id}>{a.title}</li>
                    ))}
                </ul>
              </Card>
            )}
        </div>
      )}

      {/* TAB 3: [HOME] (DEFAULT ACTIVE TAB) */}
      {activeTab === "HOME" && (
        <div className="space-y-4">
          {/* 11. Achievements Slides (Carousel if in Top 3) */}
          <Card className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-2xl p-5 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-bold">Top 3 Achievements Spotlight</h3>
              </div>
              {profile.achievements && profile.achievements.length > 0 && (
                <span className="text-[10px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                  Verified Achievements
                </span>
              )}
            </div>
            {profile.achievements && profile.achievements.length > 0 ? (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {profile.achievements.slice(0, 3).map((ach) => (
                  <div
                    key={ach.id}
                    className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10"
                  >
                    <p className="text-[11px] text-amber-300 font-semibold">
                      {ach.category || "Achievement"}
                    </p>
                    <p className="text-xs font-bold mt-0.5 truncate">{ach.title}</p>
                    <p className="text-[10px] text-slate-300 mt-0.5 line-clamp-2">
                      {ach.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-indigo-200">
                No spotlight achievements recorded yet.
              </div>
            )}
          </Card>

          {/* 12. Posts Summary & Preview */}
          <Card className="border-slate-200/90 dark:border-slate-800 dark:bg-slate-900 shadow-2xs p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Rocket className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Posts • {profile.posts?.length ?? 0} Published{" "}
                  {profile.posts?.length === 1 ? "Post" : "Posts"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("POSTS")}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View all posts →
              </button>
            </div>
            {profile.posts && profile.posts.length > 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  Most Recent Post • {new Date(profile.posts[0].createdAt).toLocaleDateString()}
                </span>
                <p className="text-slate-800 dark:text-slate-200 mt-1 font-medium line-clamp-2">
                  {profile.posts[0].body}
                </p>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                No published posts yet.
              </div>
            )}
          </Card>

          {/* 13. Projects & Tech Stacks */}
          <Card className="border-slate-200/90 dark:border-slate-800 dark:bg-slate-900 shadow-2xs p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Projects • {projectsList.length} Featured{" "}
                  {projectsList.length === 1 ? "Project" : "Projects"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("PROJECTS")}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View projects →
              </button>
            </div>
            {projectsList.length > 0 ? (
              <div className="space-y-1.5">
                {projectsList.slice(0, 2).map((proj) => (
                  <div
                    key={proj.id}
                    className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <Link
                      href={`/initiatives/projects/${proj.id}`}
                      className="font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 transition-colors"
                    >
                      {proj.name}
                    </Link>
                    <a
                      href={proj.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      <span>GitHub</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                No open source projects added yet.
              </div>
            )}
          </Card>

          {/* GRIT & MINT Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-slate-200/90 dark:border-slate-800 dark:bg-slate-900 shadow-2xs p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  GRIT Summary
                </h3>
                <a
                  href="https://www.grit.niatindia.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Portal</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Verified contestant in GRIT Challenge Series. Score calculation in sync.
              </p>
            </Card>

            <Card className="border-slate-200/90 dark:border-slate-800 dark:bg-slate-900 shadow-2xs p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  MINT Summary
                </h3>
                <a
                  href="https://mint.niatindia.com/landing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Portal</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Student incubation track. Next milestone review: Dec 2026.
              </p>
            </Card>
          </div>

          {/* BRAVE Summary Block */}
          <Card className="border-slate-200/90 dark:border-slate-800 dark:bg-slate-900 shadow-2xs p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <span>BRAVE Venture Acceleration Metrics</span>
              </h3>
              <a
                href="https://www.brave.niatindia.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                brave.niatindia.com →
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-slate-100">BRAVE 1.0</p>
                <div className="mt-1 space-y-0.5 text-slate-600 dark:text-slate-400">
                  <p>
                    Revenue:{" "}
                    <span className="font-bold text-slate-800 dark:text-slate-200">₹4.8 Lakhs</span>
                  </p>
                  <p>
                    Team Size:{" "}
                    <span className="font-bold text-slate-800 dark:text-slate-200">4 Builders</span>
                  </p>
                  <a
                    href="https://www.brave.niatindia.com"
                    className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline text-[11px] inline-block mt-1"
                  >
                    Venture Link →
                  </a>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="font-bold text-slate-900 dark:text-slate-100">BRAVE 2.0</p>
                <div className="mt-1 space-y-0.5 text-slate-600 dark:text-slate-400">
                  <p>
                    Revenue:{" "}
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      ₹12.5 Lakhs
                    </span>
                  </p>
                  <p>
                    Team Size:{" "}
                    <span className="font-bold text-slate-800 dark:text-slate-200">7 Builders</span>
                  </p>
                  <a
                    href="https://www.brave.niatindia.com"
                    className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline text-[11px] inline-block mt-1"
                  >
                    Venture Link →
                  </a>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: PROJECTS */}
      {activeTab === "PROJECTS" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold">
              {(["ALL", "GITHUB", "HUGGINGFACE", "KAGGLE", "OTHER"] as const).map((pill) => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => setProjectFilter(pill)}
                  className={`px-3 py-1.5 rounded-full transition-colors ${
                    projectFilter === pill
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {pill === "ALL"
                    ? "All Projects"
                    : pill === "GITHUB"
                      ? "GitHub"
                      : pill === "HUGGINGFACE"
                        ? "Hugging Face"
                        : pill === "KAGGLE"
                          ? "Kaggle"
                          : "Other"}
                </button>
              ))}
            </div>

            {isOwn && (
              <Button
                size="sm"
                onClick={() => setAddProjectModalOpen(true)}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Open Source Project</span>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projectsList.length > 0 ? (
              projectsList.map((proj) => (
                <Card
                  key={proj.id}
                  className="border-slate-200/90 dark:border-slate-800 dark:bg-slate-900 shadow-2xs p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/initiatives/projects/${proj.id}`}
                      className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 transition-colors"
                    >
                      <span>{proj.name}</span>
                      <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                    </Link>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 dark:bg-slate-800 text-white border border-transparent dark:border-slate-700">
                      GitHub
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {proj.description || "Open source initiative built by students."}
                  </p>
                  <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>⭐ {proj.syncedStars ?? 0} Stars</span>
                    {proj.links && proj.links.length > 0 && (
                      <>
                        <span>•</span>
                        {proj.links.map((link) => (
                          <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {link.name}
                          </a>
                        ))}
                      </>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-800">
                No open source projects added yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: GRIT */}
      {activeTab === "GRIT" && (
        <Card className="border-slate-200/90 dark:border-slate-800 dark:bg-slate-900 shadow-2xs p-12 text-center space-y-3">
          <Trophy className="h-10 w-10 text-indigo-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            GRIT Competition Series
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Official performance benchmarks and real-time leaderboard data for the GRIT challenge
            series.
          </p>
          <a
            href="https://www.grit.niatindia.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline pt-2"
          >
            <span>Visit grit.niatindia.com</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Card>
      )}

      {/* TAB 6: MINT */}
      {activeTab === "MINT" && (
        <Card className="border-slate-200/90 dark:border-slate-800 dark:bg-slate-900 shadow-2xs p-12 text-center space-y-3">
          <Rocket className="h-10 w-10 text-purple-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            MINT Innovation Hub
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Student startup incubator track, mentorship records, and founder venture progress.
          </p>
          <a
            href="https://mint.niatindia.com/landing"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline pt-2"
          >
            <span>Visit mint.niatindia.com</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Card>
      )}

      {/* TAB: POSTS & POLLS */}
      {activeTab === "POSTS" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setPostsSubTab("POSTS")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  postsSubTab === "POSTS"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Posts ({postsList.length})
              </button>
              <button
                type="button"
                onClick={() => setPostsSubTab("POLLS")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  postsSubTab === "POLLS"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Polls ({pollsList.length})
              </button>
            </div>

            {isOwn && !isGuest && (
              <div className="flex items-center gap-2">
                <Link
                  href="/activity"
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors inline-flex items-center gap-1"
                >
                  <History className="h-3 w-3" />
                  <span>Your Activity</span>
                </Link>
                <Link
                  href="/polls"
                  className="text-xs font-semibold px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors inline-flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Create Poll</span>
                </Link>
              </div>
            )}
          </div>

          {/* Sub-tab A: POSTS */}
          {postsSubTab === "POSTS" && (
            <div className="space-y-3">
              {postsList.length > 0 ? (
                postsList.map((post) => (
                  <Card
                    key={post.id}
                    className="border-slate-200/90 dark:border-slate-800 dark:bg-slate-900 shadow-2xs p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-semibold">
                          Published Post
                        </span>
                        {isOwn && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPostId(post.id);
                                setEditPostBody(post.body || "");
                              }}
                              className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              title="Edit Post"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={postActionWorking}
                              onClick={() => handleDeletePost(post.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                              title="Delete Post"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {editingPostId === post.id ? (
                      <div className="space-y-2 pt-1">
                        <textarea
                          rows={3}
                          value={editPostBody}
                          onChange={(e) => setEditPostBody(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingPostId(null)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={postActionWorking || !editPostBody.trim()}
                            onClick={() => handleSavePostEdit(post.id)}
                            className="text-xs px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer disabled:opacity-50"
                          >
                            {postActionWorking ? "Saving…" : "Save Changes"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {post.body}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span>{post.commentCount} comments</span>
                      <span>•</span>
                      <span>{post.likeCount} likes</span>
                      <span>•</span>
                      <span>{post.viewCount} views</span>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-800">
                  No published posts yet.
                </div>
              )}
            </div>
          )}

          {/* Sub-tab B: POLLS */}
          {postsSubTab === "POLLS" && (
            <div className="space-y-3">
              {pollsList.length > 0 ? (
                pollsList.map((poll) => {
                  const isClosed = poll.closesAt && new Date(poll.closesAt) < new Date();
                  return (
                    <Card
                      key={poll.id}
                      className="border-slate-200/90 dark:border-slate-800 dark:bg-slate-900 shadow-2xs p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              poll.pollType === "COMPLAINT"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                            }`}
                          >
                            {poll.pollType === "COMPLAINT"
                              ? `Complaint · ${poll.complaintLevel || "General"}`
                              : "General Poll"}
                          </span>
                          {poll.section && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {poll.section}
                            </span>
                          )}
                          {isClosed ? (
                            <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 px-1.5 py-0.5 rounded font-semibold">
                              Ended
                            </span>
                          ) : (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 px-1.5 py-0.5 rounded font-semibold">
                              Active
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px]">
                            {new Date(poll.createdAt).toLocaleDateString()}
                          </span>
                          {isOwn && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPollId(poll.id);
                                  setEditPollQuestion(poll.question);
                                }}
                                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                title="Edit Question"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={pollActionWorking}
                                onClick={() => handleDeletePoll(poll.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                title="Delete Poll"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {editingPollId === poll.id ? (
                        <div className="space-y-2 pt-1">
                          <input
                            type="text"
                            value={editPollQuestion}
                            onChange={(e) => setEditPollQuestion(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingPollId(null)}
                              className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={pollActionWorking || !editPollQuestion.trim()}
                              onClick={() => handleSavePollEdit(poll.id)}
                              className="text-xs px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer disabled:opacity-50"
                            >
                              {pollActionWorking ? "Saving…" : "Save Question"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {poll.question}
                        </h4>
                      )}

                      <div className="space-y-1.5 pt-1">
                        {poll.options.map((opt) => (
                          <div key={opt.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                              <span>{opt.text}</span>
                              <span className="font-bold">
                                {opt.pct}% ({opt.voteCount})
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                                style={{ width: `${opt.pct}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="flex items-center gap-1">
                          <BarChart2 className="h-3 w-3" />
                          <span>{poll.totalVotes} total votes</span>
                        </span>
                        <span>{poll.scopeLabel}</span>
                      </div>
                    </Card>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-800">
                  No authored polls yet.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Report Modal */}
      <Modal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title="Report Profile"
        className="max-w-md"
      >
        {reportSuccess ? (
          <div className="py-6 text-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold space-y-1">
            <CheckCircle2 className="h-8 w-8 mx-auto" />
            <p>Profile report submitted successfully.</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Reason for report
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="SPAM">Spam or fake profile</option>
                <option value="HARASSMENT">Harassment or inappropriate behavior</option>
                <option value="IMPERSONATION">Impersonating another student</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Details
              </label>
              <textarea
                rows={3}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Describe the issue…"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" onClick={() => setReportModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                disabled={submittingReport}
                onClick={handleSubmitReport}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
              >
                {submittingReport ? "Submitting…" : "Report"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Plan Delta v3: Edit Profile Links Modal (Linktree-style) */}
      <Modal
        open={editLinksModalOpen}
        onClose={() => setEditLinksModalOpen(false)}
        title="Manage Public Profile Links"
        className="max-w-md"
      >
        <div className="space-y-4 pt-2 text-xs">
          <p className="text-slate-500 dark:text-slate-400">
            Public profile links appear on your profile card and feed your external sync records
            (GitHub, LeetCode, Codeforces, Kaggle, HackerRank).
          </p>

          {linksError && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl">
              {linksError}
            </div>
          )}

          {/* Current Links List */}
          <div className="space-y-2">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              Your Current Links
            </label>
            {linksList.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {linksList.map((link) => (
                  <div
                    key={link.platform}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-indigo-700 dark:text-indigo-400 text-[10px] uppercase bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 px-2 py-0.5 rounded-full shrink-0">
                        {link.platform}
                      </span>
                      <span className="text-slate-600 dark:text-slate-300 truncate text-[11px]">
                        {link.url}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={isSavingLinks}
                      onClick={() => handleRemoveLink(link.platform)}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 shrink-0 transition-colors"
                      title="Remove link"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 dark:text-slate-500 italic">No links added yet.</p>
            )}
          </div>

          {/* Add New Link Form */}
          <form
            onSubmit={handleAddLink}
            className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800"
          >
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              Add or Update Link
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={newLinkPlatform}
                onChange={(e) => setNewLinkPlatform(e.target.value)}
                className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100"
              >
                <option value="GITHUB">GitHub</option>
                <option value="LEETCODE">LeetCode</option>
                <option value="HACKERRANK">HackerRank</option>
                <option value="CODEFORCES">Codeforces</option>
                <option value="KAGGLE">Kaggle</option>
                <option value="LINKEDIN">LinkedIn</option>
                <option value="PORTFOLIO">Portfolio</option>
                <option value="LINKTREE">Linktree</option>
                <option value="YOUTUBE">YouTube</option>
                <option value="TWITTER">Twitter/X</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="HUGGINGFACE">Hugging Face</option>
              </select>

              <input
                type="url"
                required
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                placeholder="https://..."
                className="sm:col-span-2 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditLinksModalOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                type="submit"
                disabled={isSavingLinks}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isSavingLinks ? "Saving…" : "+ Add Link"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Plan Delta v3: Add Company / Initiative Modal with Trigram Near-Duplicate Search */}
      <Modal
        open={addCompanyModalOpen}
        onClose={() => setAddCompanyModalOpen(false)}
        title="Link Company / Venture / Initiative"
        className="max-w-lg"
      >
        <form onSubmit={handleSubmitCompany} className="space-y-3.5 pt-2 text-xs">
          <p className="text-slate-500 dark:text-slate-400">
            Registered initiatives display Founder/Co-Founder badges across your profile and orbital
            avatars.
          </p>

          {companyError && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl font-medium">
              {companyError}
            </div>
          )}

          {selectedMatchNotice && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl font-semibold flex items-center justify-between">
              <span>{selectedMatchNotice}</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedMatchNotice(null);
                  setNewCompanyName("");
                }}
                className="text-xs text-emerald-600 dark:text-emerald-400 underline"
              >
                Change
              </button>
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Company / Initiative Name
            </label>
            <input
              type="text"
              required
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="e.g. AuraLuxe AI, DevForge, Nexus Labs"
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
            />
            {isSearchingCompany && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1">
                Checking existing campus initiatives…
              </span>
            )}
          </div>

          {/* Trigram UX Nudge: "Did you mean one of these?" (Plan Delta v3 Section 4) */}
          {trigramMatches.length > 0 && !selectedMatchNotice && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200/90 dark:border-amber-800/90 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Did you mean one of these existing initiatives?</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Clicking an initiative associates your role with it instead of creating an
                accidental duplicate:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {trigramMatches.map((match) => (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => {
                      setNewCompanyName(match.name);
                      setSelectedMatchNotice(
                        `Linking your role to existing initiative: "${match.name}"`,
                      );
                      setTrigramMatches([]);
                    }}
                    className="text-xs px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 font-bold text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 shadow-2xs transition-colors"
                  >
                    {match.name} ({Math.round(match.similarity * 100)}% match)
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Role Type
              </label>
              <select
                value={newCompanyRole}
                onChange={(e) => setNewCompanyRole(e.target.value as "FOUNDER" | "CO_FOUNDER")}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100"
              >
                <option value="FOUNDER">Founder</option>
                <option value="CO_FOUNDER">Co-Founder</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Position / Title
              </label>
              <input
                type="text"
                value={newCompanyPosition}
                onChange={(e) => setNewCompanyPosition(e.target.value)}
                placeholder="e.g. CEO, Lead AI Researcher"
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={newCompanyDesc}
              onChange={(e) => setNewCompanyDesc(e.target.value)}
              placeholder="Brief summary of what this initiative builds…"
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Website URL (optional)
              </label>
              <input
                type="url"
                value={newCompanyWebsite}
                onChange={(e) => setNewCompanyWebsite(e.target.value)}
                placeholder="https://..."
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                LinkedIn URL (optional)
              </label>
              <input
                type="url"
                value={newCompanyLinkedin}
                onChange={(e) => setNewCompanyLinkedin(e.target.value)}
                placeholder="https://linkedin.com/company/..."
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAddCompanyModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmittingCompany}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {isSubmittingCompany ? "Linking…" : "Link Initiative"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Plan Delta v3: Add Open Source Project Modal */}
      <Modal
        open={addProjectModalOpen}
        onClose={() => setAddProjectModalOpen(false)}
        title="Add Open Source Project"
        className="max-w-md"
      >
        <form onSubmit={handleSubmitProject} className="space-y-3 pt-2 text-xs">
          {projectError && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl">
              {projectError}
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Project Name
            </label>
            <input
              type="text"
              required
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="e.g. StuNet Engine, Campus LLM"
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              GitHub Repository URL
            </label>
            <input
              type="url"
              required
              value={newProjectGithub}
              onChange={(e) => setNewProjectGithub(e.target.value)}
              placeholder="https://github.com/org/repo"
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              placeholder="What does this repository do? Major architecture, libraries…"
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAddProjectModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmittingProject}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmittingProject ? "Adding…" : "Add Project"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
