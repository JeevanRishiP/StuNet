"use client";

import { useState } from "react";
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
  Briefcase,
  Rocket,
  Eye,
  Check,
  GraduationCap,
  Calendar,
} from "lucide-react";
import { Button, Card, Modal } from "@stunet/ui";

interface ProfileData {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  campusName: string | null;
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
  location?: string;
  university?: string;
  portfolioUrl?: string;
  clubRole?: {
    role: string;
    clubName: string;
  };
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
  techStacks?: string[];
}

interface Props {
  profile: ProfileData;
  isOwn: boolean;
  connectionStatus: "NONE" | "PENDING" | "ACCEPTED" | "SENT";
  connectionId: string | null;
  viewerId?: string | null;
}

export default function ProfileClient({ profile, isOwn, connectionStatus, connectionId }: Props) {
  const [status, setStatus] = useState(connectionStatus);
  const [connId, setConnId] = useState(connectionId);
  const [working, setWorking] = useState(false);

  // 7 Tabs: 1. Achievements, 2. About, 3. [Home] (DEFAULT), 4. Projects, 5. GRIT, 6. MINT, 7. Posts
  const [activeTab, setActiveTab] = useState<
    "ACHIEVEMENTS" | "ABOUT" | "HOME" | "PROJECTS" | "GRIT" | "MINT" | "POSTS"
  >("HOME");

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
  const connectionCount = profile.connectionCount ?? 369;
  const portfolioUrl = profile.portfolioUrl ?? "https://github.com";

  // Venture/Circle 1 & Internship/Circle 2 data
  const venture = profile.primaryVenture ?? {
    name: "AuraLuxe AI",
    designation: "Founder",
    url: "https://auraluxe.example.com",
  };
  const internship = profile.internship ?? {
    name: "NxtWave Labs",
    designation: "Intern",
    url: "https://nxtwave.example.com",
  };

  // Club Leadership
  const clubBadge = profile.clubRole ?? {
    role: "President",
    clubName: "NSC",
  };

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
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col md:flex-row items-start gap-8">
          {/* Left Side: Avatar + Orbital Role Circles */}
          <div className="relative shrink-0 flex flex-col items-center">
            {/* Main Avatar Container */}
            <div className="relative">
              {/* Top-Left Action Button (+) */}
              <button
                type="button"
                title="Add to story or highlight"
                className="absolute -top-1 -left-1 z-10 h-7 w-7 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md transition-transform hover:scale-110 border-2 border-white"
              >
                <Plus className="h-4 w-4 stroke-[3]" />
              </button>

              {/* Main Avatar Circle */}
              <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full ring-4 ring-slate-100 overflow-hidden shadow-lg bg-gradient-to-tr from-indigo-100 to-purple-100 flex items-center justify-center">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl sm:text-4xl font-extrabold text-indigo-700">
                    {displayName[0]?.toUpperCase() ?? "S"}
                  </span>
                )}
              </div>

              {/* Top-Right Online Status Circle */}
              <div
                title="Active Now"
                className="absolute top-1 right-1 h-5 w-5 rounded-full bg-emerald-500 border-3 border-white shadow-xs"
              />

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
                    className="h-10 w-10 rounded-full bg-white border-2 border-amber-500 shadow-md flex items-center justify-center hover:scale-105 transition-transform overflow-hidden p-0.5"
                  >
                    <div className="h-full w-full rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 font-extrabold text-[11px]">
                      1
                    </div>
                  </a>
                  <span className="hidden sm:inline-block text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap shadow-2xs">
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
                  className="h-9 w-9 rounded-full bg-white border-2 border-orange-500 shadow-sm flex items-center justify-center hover:scale-105 transition-transform p-0.5"
                >
                  <div className="h-full w-full rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600 font-extrabold text-[10px]">
                    2
                  </div>
                </a>
                <span className="text-[10px] font-bold text-orange-600 mt-1">
                  {internship.designation}
                </span>
              </div>
            )}
          </div>

          {/* Right Side: Identity, Institutional Details, Club Leadership Badge, Bio Box */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Row 1: Full Name (Blue Link) & Club Leadership Badge */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <a
                  href={portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5"
                >
                  <h1 className="text-xl sm:text-2xl font-black text-blue-600 hover:text-blue-700 tracking-tight transition-colors">
                    {displayName}
                  </h1>
                  <ExternalLink className="h-4 w-4 text-blue-500 opacity-70 group-hover:opacity-100" />
                </a>

                {/* Academic Year Badge & Location */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700">
                    <GraduationCap className="h-3.5 w-3.5 text-indigo-600" />
                    <span>{yearText}</span>
                  </span>
                  {profile.joiningYear && (
                    <span className="text-[11px] font-medium text-slate-500">
                      (Joined {profile.joiningYear} · Aug–Jul Cycle)
                    </span>
                  )}
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-semibold text-slate-600">{locationText}</span>
                </div>

                {/* University / Institution */}
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                  <span>{universityText}</span>
                </p>
              </div>

              {/* Club Leadership Badge: Gold Star + Purple Text */}
              {clubBadge && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200/80 shadow-2xs">
                  <span className="text-amber-500 text-sm">⭐</span>
                  <span className="text-xs font-extrabold text-purple-700 tracking-wide">
                    {clubBadge.role} • {clubBadge.clubName}
                  </span>
                </div>
              )}
            </div>

            {/* Bio Box with Clickable Connections Counter inside */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-3">
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {profile.bio ??
                  "Passionate computer science student building full-stack products, experimenting with generative AI, and contributing to open-source student initiatives."}
              </p>

              {/* Clickable Connections Counter at bottom-left */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <Link
                  href="/network"
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>{connectionCount} Connections</span>
                </Link>

                {/* Action Buttons for Other Profile or Edit Button for Self */}
                {isOwn ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab("ABOUT")}
                    className="text-xs font-semibold px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg shadow-2xs transition-colors"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
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
                      <span className="text-xs font-semibold px-2.5 py-1 bg-slate-200 text-slate-700 rounded-lg">
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
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Check className="h-3 w-3" /> Connected
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setReportModalOpen(true)}
                      className="p-1 text-slate-400 hover:text-rose-600"
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

      {/* ── SECTION B: THE EXACT 7 NAVIGATION TABS ── */}
      {/* 1. Achievements • 2. About • 3. [Home] • 4. Projects • 5. GRIT • 6. MINT • 7. Posts */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-1.5 shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto text-xs font-bold">
          {[
            { id: "ACHIEVEMENTS" as const, label: "1. Achievements" },
            { id: "ABOUT" as const, label: "2. About" },
            { id: "HOME" as const, label: "3. [Home]" },
            { id: "PROJECTS" as const, label: "4. Projects" },
            { id: "GRIT" as const, label: "5. GRIT" },
            { id: "MINT" as const, label: "6. MINT" },
            { id: "POSTS" as const, label: "7. Posts" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-3 rounded-xl transition-all whitespace-nowrap text-center ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
            <h2 className="text-base font-bold text-slate-900">Verified Achievements</h2>
            {isOwn && (
              <Button size="sm" className="text-xs bg-indigo-600 text-white">
                Update Achievements
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-slate-200/90 shadow-2xs p-4">
              <div className="flex items-center gap-2.5 text-xs font-bold text-indigo-700 mb-2">
                <Rocket className="h-4 w-4" />
                <span>VC Funded Startup</span>
              </div>
              <p className="text-sm font-bold text-slate-900">AuraLuxe AI Labs</p>
              <p className="text-xs text-slate-600 mt-1">
                Founder & Tech Lead. Backed by Campus Innovation Fund.
              </p>
              <span className="inline-block mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Verified by Admin
              </span>
            </Card>

            <Card className="border-slate-200/90 shadow-2xs p-4">
              <div className="flex items-center gap-2.5 text-xs font-bold text-indigo-700 mb-2">
                <Briefcase className="h-4 w-4" />
                <span>Cracked Internship</span>
              </div>
              <p className="text-sm font-bold text-slate-900">NxtWave Technology</p>
              <p className="text-xs text-slate-600 mt-1">
                Full-Stack Engineering Intern · Summer 2026.
              </p>
              <span className="inline-block mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Verified by Admin
              </span>
            </Card>

            <Card className="border-slate-200/90 shadow-2xs p-4">
              <div className="flex items-center gap-2.5 text-xs font-bold text-indigo-700 mb-2">
                <Trophy className="h-4 w-4" />
                <span>Hackathon Winner (Top 3)</span>
              </div>
              <p className="text-sm font-bold text-slate-900">Smart Campus Hackathon 2026</p>
              <p className="text-xs text-slate-600 mt-1">
                1st Place among 120 national teams. Built automated community ledger.
              </p>
              <span className="inline-block mt-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Verified by Admin
              </span>
            </Card>

            <Card className="border-slate-200/90 shadow-2xs p-4">
              <div className="flex items-center gap-2.5 text-xs font-bold text-indigo-700 mb-2">
                <Award className="h-4 w-4" />
                <span>Social Media & Community</span>
              </div>
              <p className="text-sm font-bold text-slate-900">Technical Content Creator</p>
              <p className="text-xs text-slate-600 mt-1">
                10k+ followers learning system design and open-source contributions.
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: ABOUT */}
      {activeTab === "ABOUT" && (
        <div className="space-y-4">
          {/* Academic Standing & Year of Study */}
          <Card className="border-slate-200/90 shadow-2xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-indigo-600" />
                <span>Academic Profile</span>
              </h3>
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                {profile.academicYear?.academicSession
                  ? `Session ${profile.academicYear.academicSession}`
                  : "Active"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="text-slate-400 font-semibold block mb-0.5">Current Standing</span>
                <span className="text-sm font-bold text-indigo-700">
                  {profile.academicYear?.label ?? yearText}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Aug–Jul Academic Cycle
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="text-slate-400 font-semibold block mb-0.5">Year of Joining</span>
                <span className="text-sm font-bold text-slate-900">
                  {profile.joiningYear ? `${profile.joiningYear} Batch` : "Not specified"}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Enrolled at {universityText}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                <span className="text-slate-400 font-semibold block mb-0.5">
                  Expected Graduation
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {profile.academicYear?.graduationYear
                    ? `Class of ${profile.academicYear.graduationYear}`
                    : "—"}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  4-Year Degree Programme
                </span>
              </div>
            </div>
          </Card>

          {/* Contact Info with Privacy Controls */}
          <Card className="border-slate-200/90 shadow-2xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Mail className="h-4 w-4 text-indigo-600" />
                <span>8. Contact Info</span>
              </h3>
              {isOwn && (
                <span className="text-[11px] text-slate-400 font-medium">Privacy Protected</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">
                  1. Student Email ID
                </span>
                <span className="font-medium text-slate-800">
                  {profile.email ?? `${username}@niat.edu.in`}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block mb-0.5">
                  2. Personal Email ID
                </span>
                <span className="font-medium text-slate-800">
                  {profile.personalEmail ?? "student.personal@example.com"}
                </span>
              </div>

              <div className="sm:col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-slate-500 font-bold block">3. WhatsApp Number</span>
                    <span className="text-sm font-bold text-slate-900">
                      {profile.whatsappNumber ?? "+91 98765 43210"}
                    </span>
                  </div>

                  {/* Privacy Toggle: Who can see - All • Connected Users */}
                  {isOwn && (
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                      <Eye className="h-3.5 w-3.5 text-indigo-600" />
                      <span className="text-[11px] font-semibold text-slate-600">Who can see:</span>
                      <button
                        type="button"
                        onClick={() => setWhatsappVisibility("ALL")}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          whatsappVisibility === "ALL"
                            ? "bg-indigo-600 text-white"
                            : "text-slate-500 hover:bg-slate-100"
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
                            : "text-slate-500 hover:bg-slate-100"
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

          {/* Social Profiles */}
          <Card className="border-slate-200/90 shadow-2xs p-6 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Globe className="h-4 w-4 text-indigo-600" />
              <span>9. Links — Social Media & Other Profiles</span>
            </h3>

            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 transition-colors"
              >
                <Code className="h-3.5 w-3.5" />
                <span>GitHub Profile</span>
              </a>

              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-xs font-semibold text-blue-700 transition-colors"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>LinkedIn</span>
              </a>

              <a
                href={portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-xs font-semibold text-indigo-700 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Portfolio Website</span>
              </a>
            </div>
          </Card>

          {/* Unverified Achievements */}
          <Card className="border-slate-200/90 shadow-2xs p-6 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="h-4 w-4 text-indigo-600" />
              <span>10. Achievements (Un-Verified or Small Achievements)</span>
            </h3>
            <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1">
              <li>Completed 100 days of LeetCode streak in Summer 2026</li>
              <li>Mentored 15 junior students in Web Development Workshop</li>
              <li>Published 4 technical blogs on Microservices with Redis</li>
            </ul>
          </Card>
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
                <h3 className="text-sm font-bold">11. Top 3 Achievements Spotlight</h3>
              </div>
              <span className="text-[10px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full">
                Rank #1 Campus Placed
              </span>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
                <p className="text-[11px] text-amber-300 font-semibold">1st Place</p>
                <p className="text-xs font-bold mt-0.5">National GRIT 2026</p>
                <p className="text-[10px] text-slate-300 mt-0.5">Top AI Solution Award</p>
              </div>
              <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
                <p className="text-[11px] text-amber-300 font-semibold">Rank #2</p>
                <p className="text-xs font-bold mt-0.5">LeetCode Campus Board</p>
                <p className="text-[10px] text-slate-300 mt-0.5">Rating: 2,140</p>
              </div>
              <div className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10">
                <p className="text-[11px] text-amber-300 font-semibold">Top Venture</p>
                <p className="text-xs font-bold mt-0.5">VC Startup Finalist</p>
                <p className="text-[10px] text-slate-300 mt-0.5">AuraLuxe AI Labs</p>
              </div>
            </div>
          </Card>

          {/* 12. Posts Summary & Preview */}
          <Card className="border-slate-200/90 shadow-2xs p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Rocket className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900">12. Posts • 24 Published Posts</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("POSTS")}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                View all posts →
              </button>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
              <span className="text-[10px] font-bold text-slate-400">
                Most Recent Post • 2h ago
              </span>
              <p className="text-slate-800 mt-1 font-medium">
                &ldquo;Just wrapped up deploying the distributed authentication gateway for our
                campus portal! Happy to connect with anyone working on Redis caching
                patterns.&rdquo;
              </p>
            </div>
          </Card>

          {/* 13. Projects & Tech Stacks */}
          <Card className="border-slate-200/90 shadow-2xs p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900">
                  13. Projects • 8 Featured Projects
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("PROJECTS")}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                View projects →
              </button>
            </div>
            <div className="mt-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Major Tech Stacks
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "TypeScript",
                  "Next.js 14",
                  "PostgreSQL",
                  "Redis",
                  "Python",
                  "PyTorch",
                  "Tailwind CSS",
                  "Docker",
                ].map((tech) => (
                  <span
                    key={tech}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          {/* 14. GRIT & 15. MINT Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-slate-200/90 shadow-2xs p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-900">14. GRIT Summary</h3>
                <a
                  href="https://www.grit.niatindia.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Portal</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="text-xs text-slate-600">
                Verified contestant in GRIT Challenge Series. Score calculation in sync.
              </p>
            </Card>

            <Card className="border-slate-200/90 shadow-2xs p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-900">15. MINT Summary</h3>
                <a
                  href="https://mint.niatindia.com/landing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Portal</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="text-xs text-slate-600">
                Student incubation track. Next milestone review: Dec 2026.
              </p>
            </Card>
          </div>

          {/* 16. BRAVE Summary Block */}
          <Card className="border-slate-200/90 shadow-2xs p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <span>16. BRAVE Venture Acceleration Metrics</span>
              </h3>
              <a
                href="https://www.brave.niatindia.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-indigo-600 font-semibold hover:underline"
              >
                brave.niatindia.com →
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900">BRAVE 1.0</p>
                <div className="mt-1 space-y-0.5 text-slate-600">
                  <p>
                    Revenue: <span className="font-bold text-slate-800">₹4.8 Lakhs</span>
                  </p>
                  <p>
                    Team Size: <span className="font-bold text-slate-800">4 Builders</span>
                  </p>
                  <a
                    href="https://www.brave.niatindia.com"
                    className="text-indigo-600 font-semibold hover:underline text-[11px] inline-block mt-1"
                  >
                    Venture Link →
                  </a>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900">BRAVE 2.0</p>
                <div className="mt-1 space-y-0.5 text-slate-600">
                  <p>
                    Revenue: <span className="font-bold text-slate-800">₹12.5 Lakhs</span>
                  </p>
                  <p>
                    Team Size: <span className="font-bold text-slate-800">7 Builders</span>
                  </p>
                  <a
                    href="https://www.brave.niatindia.com"
                    className="text-indigo-600 font-semibold hover:underline text-[11px] inline-block mt-1"
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
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
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
              <Button size="sm" className="text-xs bg-indigo-600 text-white">
                Add New Project
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-slate-200/90 shadow-2xs p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900">StuNet Platform Core</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  GitHub
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Multi-tenant university community network with strict role-segregated security.
              </p>
              <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-500">
                <span>TypeScript</span>
                <span>•</span>
                <span>⭐ 142 Stars</span>
              </div>
            </Card>

            <Card className="border-slate-200/90 shadow-2xs p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900">Campus LLM Assistant</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-800 border border-yellow-200">
                  Hugging Face
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Fine-tuned open-source model answering university curriculum & CIA queries.
              </p>
              <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-500">
                <span>PyTorch</span>
                <span>•</span>
                <span>⬇ 2.4k Downloads</span>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 5: GRIT */}
      {activeTab === "GRIT" && (
        <Card className="border-slate-200/90 shadow-2xs p-12 text-center space-y-3">
          <Trophy className="h-10 w-10 text-indigo-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">GRIT Competition Series</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Official performance benchmarks and real-time leaderboard data for the GRIT challenge
            series.
          </p>
          <a
            href="https://www.grit.niatindia.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline pt-2"
          >
            <span>Visit grit.niatindia.com</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Card>
      )}

      {/* TAB 6: MINT */}
      {activeTab === "MINT" && (
        <Card className="border-slate-200/90 shadow-2xs p-12 text-center space-y-3">
          <Rocket className="h-10 w-10 text-purple-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">MINT Innovation Hub</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Student startup incubator track, mentorship records, and founder venture progress.
          </p>
          <a
            href="https://mint.niatindia.com/landing"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline pt-2"
          >
            <span>Visit mint.niatindia.com</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Card>
      )}

      {/* TAB 7: POSTS */}
      {activeTab === "POSTS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">All Posts by {displayName}</h2>
            {isOwn && (
              <Button size="sm" className="text-xs bg-indigo-600 text-white">
                New Post
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Card key={i} className="border-slate-200/90 shadow-2xs p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{i === 1 ? "2 hours ago" : "3 days ago"}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                    Public Post
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-800">
                  {i === 1
                    ? "Just wrapped up deploying the distributed authentication gateway for our campus portal! Happy to connect with anyone working on Redis caching patterns."
                    : "Proud to share that our startup AuraLuxe AI has reached its first 500 active users this month! Huge thanks to everyone who provided feedback."}
                </p>
              </Card>
            ))}
          </div>
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
          <div className="py-6 text-center text-xs text-emerald-600 font-semibold space-y-1">
            <CheckCircle2 className="h-8 w-8 mx-auto" />
            <p>Profile report submitted successfully.</p>
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
                <option value="SPAM">Spam or fake profile</option>
                <option value="HARASSMENT">Harassment or inappropriate behavior</option>
                <option value="IMPERSONATION">Impersonating another student</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Details</label>
              <textarea
                rows={3}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Describe the issue…"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
    </div>
  );
}
