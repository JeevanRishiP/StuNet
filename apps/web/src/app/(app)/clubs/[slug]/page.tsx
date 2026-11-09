"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { Route } from "next";
import {
  ThumbsUp,
  ArrowLeft,
  Sparkles,
  Calendar,
  Plus,
  ExternalLink,
  Camera,
  Shield,
  MapPin,
  Building2,
  ChevronDown,
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Modal, Avatar } from "@stunet/ui";

interface CampusItem {
  id: string;
  name: string;
  universityName?: string | null;
  slug: string;
  city: string;
  state: string;
  emailDomain?: string | null;
}

const DEFAULT_SVYASA_CAMPUS: CampusItem = {
  id: "cmw0t9cgf0005yq6sgrcz4tpy",
  name: "S-VYASA University School of Advanced Studies",
  universityName: "S-VYASA (Deemed to be University)",
  slug: "niat-s-vyasa-bangalore",
  city: "Bengaluru",
  state: "Karnataka",
  emailDomain: "svyasa-sas.edu.in",
};

interface ClubLeadershipMember {
  role: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface EventPlan {
  id: string;
  title: string;
  date: string;
  details: string;
  type: "FUTURE" | "PAST";
  suggestionsCount?: number;
  feedbackCount?: number;
}

interface SuggestionPollOption {
  id: string;
  title: string;
  authorName: string;
  isOfficialClubIdea: boolean;
  votes: number;
  hasVoted: boolean;
}

function getClubPresidentForCampus(
  clubSlug: string,
  campus: CampusItem,
): { name: string; email: string } {
  const domain = campus.emailDomain || `${campus.slug.replace("niat-", "")}.niat.edu.in`;

  if (campus.slug === "niat-s-vyasa-bangalore" || campus.name.includes("S-VYASA")) {
    const svyasa: Record<string, { name: string; email: string }> = {
      nsgc: { name: "Harshitha Shree Raj", email: "2102508576@svyasa-sas.edu.in" },
      "advanced-tech": { name: "Sankirth R Bhat", email: "2102508646@svyasa-sas.edu.in" },
      arts: { name: "Ananya Roy", email: "ananya.arts@svyasa-sas.edu.in" },
      sports: { name: "Chiranjeevi S", email: "2102508551@svyasa-sas.edu.in" },
      edu: { name: "Karan Raj K R", email: "2102508585@svyasa-sas.edu.in" },
      "gen-ai": { name: "Shrenik Sk", email: "2102508660@svyasa-sas.edu.in" },
      media: { name: "Dhanunjay T", email: "2102508679@svyasa-sas.edu.in" },
    };
    return (
      svyasa[clubSlug] || { name: "Harshitha Shree Raj", email: "2102508576@svyasa-sas.edu.in" }
    );
  }

  if (campus.slug === "niat-chennai" || campus.city === "Chennai") {
    const chennai: Record<string, string> = {
      nsgc: "Arun Kumar M",
      "advanced-tech": "Karthik Raja S",
      arts: "Deepika Sundaram",
      sports: "Vigneshwaran R",
      edu: "Meenakshi Natarajan",
      "gen-ai": "Ashwin Balaji",
      media: "Sneha Subramanian",
    };
    const name = chennai[clubSlug] || "Arun Kumar M";
    return { name, email: `${clubSlug}.president@${domain}` };
  }

  if (campus.slug === "niat-hyderabad" || campus.city === "Hyderabad") {
    const hyd: Record<string, string> = {
      nsgc: "Sai Teja V",
      "advanced-tech": "Pranav Reddy K",
      arts: "Meghana Rao",
      sports: "Nikhil Varma",
      edu: "Akhil Goud",
      "gen-ai": "Ananya Sharma",
      media: "Tarun Krishna",
    };
    const name = hyd[clubSlug] || "Sai Teja V";
    return { name, email: `${clubSlug}.president@${domain}` };
  }

  if (campus.city === "Pune") {
    const pune: Record<string, string> = {
      nsgc: "Tanmay Kulkarni",
      "advanced-tech": "Aditya Deshpande",
      arts: "Riya Shinde",
      sports: "Rohit Jadhav",
      edu: "Omkar Patil",
      "gen-ai": "Gauri Joshi",
      media: "Sanika More",
    };
    const name = pune[clubSlug] || "Tanmay Kulkarni";
    return { name, email: `${clubSlug}.president@${domain}` };
  }

  const firstNames = [
    "Aarav",
    "Rohan",
    "Pooja",
    "Vikram",
    "Neha",
    "Varun",
    "Isha",
    "Kavya",
    "Rahul",
    "Divya",
    "Siddharth",
    "Ananya",
    "Naveen",
    "Priya",
  ];
  const lastNames = [
    "Sharma",
    "Verma",
    "Patel",
    "Reddy",
    "Nair",
    "Iyer",
    "Rao",
    "Gupta",
    "Singh",
    "Kumar",
    "Choudhury",
    "Bhatt",
    "Deshmukh",
    "Joshi",
  ];
  const charSum = (campus.slug + clubSlug).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const fn = firstNames[charSum % firstNames.length];
  const ln = lastNames[(charSum * 3 + 1) % lastNames.length];
  const name = `${fn} ${ln}`;
  return { name, email: `${clubSlug}.lead@${domain}` };
}

function ClubDetailPageContent() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const { data: session } = useSession();

  const [campuses, setCampuses] = useState<CampusItem[]>([DEFAULT_SVYASA_CAMPUS]);
  const [selectedCampus, setSelectedCampus] = useState<CampusItem>(DEFAULT_SVYASA_CAMPUS);

  useEffect(() => {
    async function loadCampuses() {
      try {
        const res = await fetch("/api/campuses");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.campuses) && data.campuses.length > 0) {
            setCampuses(data.campuses);
            const urlCampusSlug = searchParams.get("campus");
            if (urlCampusSlug) {
              const matched = data.campuses.find(
                (c: CampusItem) => c.slug === urlCampusSlug || c.id === urlCampusSlug,
              );
              if (matched) setSelectedCampus(matched);
            } else if (session?.user?.campusId) {
              const fromUser = data.campuses.find(
                (c: CampusItem) => c.id === session.user.campusId,
              );
              if (fromUser) setSelectedCampus(fromUser);
            }
          }
        }
      } catch {
        // fallback
      }
    }
    void loadCampuses();
  }, [searchParams, session?.user?.campusId]);

  // Handler when campus is changed via simple dropdown
  function handleCampusChange(campusIdOrSlug: string) {
    const match = campuses.find((c) => c.id === campusIdOrSlug || c.slug === campusIdOrSlug);
    if (!match) return;

    setSelectedCampus(match);
    const url = new URL(window.location.href);
    url.searchParams.set("campus", match.slug);
    window.history.replaceState({}, "", url.toString());
  }

  // ── FUNDAMENTAL CROSS-CAMPUS ROLE BOUNDARY ──
  const userRole = session?.user?.role;
  const userCampusId = session?.user?.campusId;
  const userCampusName = session?.user?.campusName;
  const isGuest = Boolean(
    session?.user?.isGuest || session?.user?.role === "GUEST" || !session?.user,
  );

  // Check if user belongs to the currently viewed campus
  const isOwnCampus = Boolean(
    userCampusId &&
    (selectedCampus.id === userCampusId ||
      (userCampusName && selectedCampus.name === userCampusName)),
  );

  // Fundamental rule:
  // 1. Guest: strictly guest view
  // 2. Alumni: strictly guest view (always)
  // 3. Student/Faculty: guest view when viewing ANY other campus; full view only on own campus
  // 4. Super Admin: full view
  const isGuestView = Boolean(
    isGuest ||
    userRole === "GUEST" ||
    userRole === "ALUMNI" ||
    (!isOwnCampus && userRole !== "SUPER_ADMIN"),
  );

  // Club details matching slug
  const clubNameMap: Record<
    string,
    { name: string; category: string; description: string; instagram: string }
  > = {
    nsgc: {
      name: "NSGC (NxtWave Student General Council)",
      category: "Governance & Leadership",
      description:
        "The central student governing body representing student rights, administrative policies, and student council governance.",
      instagram: "https://instagram.com/niat_nsgc",
    },
    "advanced-tech": {
      name: "Advanced Tech Club",
      category: "Technology",
      description:
        "Deep-dive technical guild exploring kernel programming, distributed storage, high throughput APIs and compilers.",
      instagram: "https://instagram.com/niat_tech",
    },
    arts: {
      name: "Arts Club",
      category: "Cultural & Creative",
      description:
        "Creative expressions, contemporary digital art, theatrical productions, photography and student design critiques.",
      instagram: "https://instagram.com/niat_arts",
    },
    sports: {
      name: "Sports Club",
      category: "Athletics",
      description:
        "Inter-campus sports tournaments, esports championships, marathon events, and daily athletic fitness leagues.",
      instagram: "https://instagram.com/niat_sports",
    },
    edu: {
      name: "EDU Club (Entrepreneur Club)",
      category: "Entrepreneurship",
      description:
        "Incubating student ventures, founder workshops, angel investor connections and startup pitch bootcamps.",
      instagram: "https://instagram.com/niat_edu",
    },
    "gen-ai": {
      name: "Gen AI Club",
      category: "Artificial Intelligence",
      description:
        "Exploring generative models, synthetic media, fine-tuning reasoning models, and agent architectures.",
      instagram: "https://instagram.com/niat_genai",
    },
    media: {
      name: "Media Club",
      category: "Media & Journalism",
      description:
        "Official campus journalism, audio podcasts, documentary cinema, public relations and student spotlight interviews.",
      instagram: "https://instagram.com/niat_media",
    },
  };

  const clubInfo = clubNameMap[slug] ?? {
    name: "Campus Club",
    category: "Student Campus Club",
    description: "Official campus organization for collaborative student development.",
    instagram: "https://instagram.com/niat_campus",
  };

  // Compute president and leadership for selected campus
  const pres = getClubPresidentForCampus(slug, selectedCampus);
  const campusDomain =
    selectedCampus.emailDomain || `${selectedCampus.slug.replace("niat-", "")}.niat.edu.in`;

  const leadership: ClubLeadershipMember[] = [
    { role: "1. President", name: pres.name, email: pres.email },
    {
      role: "2. Vice President",
      name: "Awaiting Appointment (Nominations Pending)",
      email: `${slug}.vp@${campusDomain}`,
    },
    {
      role: "3. Operational Head",
      name: "Awaiting Appointment (Nominations Pending)",
      email: `${slug}.ops@${campusDomain}`,
    },
    {
      role: "4. Out Reach Head",
      name: "Awaiting Appointment (Nominations Pending)",
      email: `${slug}.outreach@${campusDomain}`,
    },
    {
      role: "5. Finance Head",
      name: "Awaiting Appointment (Nominations Pending)",
      email: `${slug}.finance@${campusDomain}`,
    },
    {
      role: "6. Creative & Design Head",
      name: "Awaiting Appointment (Nominations Pending)",
      email: `${slug}.design@${campusDomain}`,
    },
    {
      role: "7. Social Media Head",
      name: "Awaiting Appointment (Nominations Pending)",
      email: `${slug}.social@${campusDomain}`,
    },
  ];

  // Events: Future Plans & Past Events
  const eventsList: EventPlan[] = [
    {
      id: "ev-future-1",
      title: `${selectedCampus.city} Inter-Campus Prototype Jam`,
      date: "Dec 02, 2026",
      details: `48-hour continuous product engineering challenge hosted for ${selectedCampus.name} students with alumni mentors.`,
      type: "FUTURE",
      suggestionsCount: 14,
    },
    {
      id: "ev-future-2",
      title: "Design System Architecture & Code Generation",
      date: "Dec 14, 2026",
      details: `Hands-on UI/UX guidelines and production design token workshop at ${selectedCampus.city} campus.`,
      type: "FUTURE",
      suggestionsCount: 6,
    },
    {
      id: "ev-past-1",
      title: "Annual Orientation & Leadership Inauguration",
      date: "Sep 15, 2026",
      details: `Welcomed 180 new student members across all branches with keynote alumni speakers at ${selectedCampus.name}.`,
      type: "PAST",
      feedbackCount: 42,
    },
    {
      id: "ev-past-2",
      title: "Inaugural Campus Hackathon & Demo Showcase",
      date: "Aug 20, 2026",
      details: `Held at ${selectedCampus.city} Campus. Over 28 prototype submissions evaluated by industry engineers.`,
      type: "PAST",
      feedbackCount: 36,
    },
  ];

  // Event Suggestions Poll Options
  const [pollOptions, setPollOptions] = useState<SuggestionPollOption[]>([
    {
      id: "opt-1",
      title: "Weekend Rust & WASM High Throughput API Sprint",
      authorName: `${clubInfo.name} Core Team`,
      isOfficialClubIdea: true,
      votes: 48,
      hasVoted: false,
    },
    {
      id: "opt-2",
      title: `Inter-College Kaggle Hackathon on Medical Imaging at ${selectedCampus.city}`,
      authorName: pres.name,
      isOfficialClubIdea: false,
      votes: 31,
      hasVoted: false,
    },
  ]);

  // Active Poll Window Deadline
  const pollWindowEndsAt = "Nov 15, 2026 • 11:59 PM";

  // Create Suggestion Modal State
  const [showCreateSuggestionModal, setShowCreateSuggestionModal] = useState(false);
  const [newSuggestionTitle, setNewSuggestionTitle] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Future Event Suggestion Input State
  const [eventSuggestionInputs, setEventSuggestionInputs] = useState<Record<string, string>>({});

  function handleVote(optionId: string) {
    if (isGuestView) return;

    setPollOptions((prev) => {
      return prev
        .map((opt) => {
          if (opt.id === optionId) {
            const willVote = !opt.hasVoted;
            return {
              ...opt,
              hasVoted: willVote,
              votes: opt.votes + (willVote ? 1 : -1),
            };
          }
          if (opt.hasVoted) {
            return {
              ...opt,
              hasVoted: false,
              votes: Math.max(0, opt.votes - 1),
            };
          }
          return opt;
        })
        .sort((a, b) => b.votes - a.votes);
    });
  }

  function handleCreateSuggestion(e: React.FormEvent) {
    e.preventDefault();
    if (isGuestView) return;
    if (!newSuggestionTitle.trim()) return;

    const newOpt: SuggestionPollOption = {
      id: `opt-${Date.now()}`,
      title: newSuggestionTitle.trim(),
      authorName: isAnonymous ? "Anonymous Student" : "You",
      isOfficialClubIdea: false,
      votes: 1,
      hasVoted: true,
    };

    setPollOptions((prev) => {
      const updated = prev.map((opt) =>
        opt.hasVoted ? { ...opt, hasVoted: false, votes: opt.votes - 1 } : opt,
      );
      return [newOpt, ...updated].sort((a, b) => b.votes - a.votes);
    });

    setNewSuggestionTitle("");
    setIsAnonymous(false);
    setShowCreateSuggestionModal(false);
  }

  function handleAddEventSuggestion(eventId: string) {
    if (isGuestView) return;
    const text = eventSuggestionInputs[eventId]?.trim();
    if (!text) return;
    alert(`Suggestion recorded for event: "${text}"`);
    setEventSuggestionInputs((prev) => ({ ...prev, [eventId]: "" }));
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Bar: Back Link + Simple College List Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Link
          href={`/clubs?campus=${selectedCampus.slug}` as Route}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Clubs ({selectedCampus.city} Campus)</span>
        </Link>

        {/* Simple College List Filter */}
        <div className="relative flex items-center gap-2 bg-slate-50 hover:bg-slate-100/90 border border-slate-200/90 rounded-2xl px-3 py-1.5 shadow-2xs transition-all">
          <Building2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
          <div className="relative flex items-center">
            <select
              value={selectedCampus.id}
              onChange={(e) => handleCampusChange(e.target.value)}
              className="appearance-none bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer pr-6 max-w-[200px] sm:max-w-[280px] truncate"
            >
              {campuses.map((camp) => (
                <option key={camp.id} value={camp.id} className="text-slate-900 font-semibold py-1">
                  {camp.name} ({camp.city})
                </option>
              ))}
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 pointer-events-none absolute right-0 shrink-0" />
          </div>
        </div>
      </div>

      {/* Club Banner Header */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 relative p-6 flex items-end">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:10px_10px]" />
          <div className="relative z-10 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider">
              {clubInfo.category}
            </span>
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span>
                {selectedCampus.name} ({selectedCampus.city})
              </span>
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-8 flex flex-col md:flex-row items-start justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {clubInfo.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {clubInfo.description}
            </p>
          </div>

          {/* Social Links & Campus Verification Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={clubInfo.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-xs hover:opacity-95 transition-opacity"
            >
              <Camera className="h-4 w-4" />
              <span>Official Instagram</span>
              <ExternalLink className="h-3 w-3" />
            </a>

            <div className="text-[11px] font-semibold text-slate-500 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">
              Admin Verified Roster • {selectedCampus.city} Campus
            </div>
          </div>
        </div>
      </div>

      {/* ── DESKTOP 2-COLUMN VIEWPORT LAYOUT: 65% Center + 35% Sticky Right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── CENTER COLUMN (65% / cols-8): ROSTER & EVENTS MODULE ── */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section: 7 Official Leadership Roles */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
            <CardHeader className="bg-slate-50/70 p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-600" />
                  <span>Team Leadership Details (7 Official Roles — {selectedCampus.name})</span>
                </CardTitle>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Official appointments authorized by the Office of Student Affairs for the{" "}
                  {selectedCampus.city} Campus.
                </p>
              </div>
            </CardHeader>

            <CardContent className="p-3 divide-y divide-slate-100 text-xs">
              {leadership.map((member, idx) => (
                <div
                  key={idx}
                  className="py-2.5 px-2 flex items-center justify-between hover:bg-slate-50/80 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={member.name} size="sm" />
                    <div>
                      <p className="font-bold text-slate-900">{member.name}</p>
                      <a
                        href={`mailto:${member.email}`}
                        className="text-[10px] text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {member.email}
                      </a>
                    </div>
                  </div>

                  <span className="text-[11px] font-extrabold text-purple-700 bg-purple-50 border border-purple-200/80 px-2.5 py-0.5 rounded-full">
                    {member.role}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Section: Events Module (Future Plans & Past Events) */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-600" />
              <span>Events & Roadmaps ({selectedCampus.city} Campus)</span>
            </h2>

            {/* Future Plans: strictly hidden for Guest View (guests, alumni, and students/faculties viewing other campuses) */}
            {!isGuestView && (
              <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
                <CardHeader className="bg-indigo-50/60 p-3.5 border-b border-indigo-100">
                  <CardTitle className="text-xs font-bold text-indigo-900">
                    Future Plans & Upcoming Events
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                  {eventsList
                    .filter((e) => e.type === "FUTURE")
                    .map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900">{ev.title}</h4>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            {ev.date}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-snug">{ev.details}</p>

                        {/* Suggestions Input for Future Event */}
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                          <input
                            type="text"
                            value={eventSuggestionInputs[ev.id] ?? ""}
                            onChange={(e) =>
                              setEventSuggestionInputs((prev) => ({
                                ...prev,
                                [ev.id]: e.target.value,
                              }))
                            }
                            placeholder="Submit suggestion for this event…"
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddEventSuggestion(ev.id)}
                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700"
                          >
                            Submit
                          </button>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )}

            {/* Past Events (Visible to everyone including Guests and Cross-Campus Visitors) */}
            <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
              <CardHeader className="bg-slate-50/60 p-3.5 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-700">
                  Past Events Archive ({selectedCampus.city} Campus)
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                {eventsList
                  .filter((e) => e.type === "PAST")
                  .map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-2xl border border-slate-100 bg-slate-50/60 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-800">{ev.title}</h4>
                        <span className="text-[10px] text-slate-400 font-semibold">{ev.date}</span>
                      </div>
                      <p className="text-slate-600 leading-snug">{ev.details}</p>
                      <p className="text-[10px] text-slate-400 pt-1">
                        {ev.feedbackCount} attendee feedback ratings submitted.
                      </p>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── RIGHT STICKY COLUMN (35% / cols-4): EVENT SUGGESTIONS POLL OR VISITOR NOTICE ── */}
        <aside className="lg:col-span-4 sticky top-6 space-y-4">
          {isGuestView ? (
            <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
              <CardHeader className="p-4 pb-2 border-b border-slate-100 bg-slate-50/70">
                <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-indigo-600" />
                  <span>
                    {isGuest
                      ? "Campus Club Participation"
                      : userRole === "ALUMNI"
                        ? "Alumni Campus View"
                        : "Cross-Campus Visitor View"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {isGuest ? (
                  <>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      You are exploring <strong className="text-slate-800">{clubInfo.name}</strong>{" "}
                      ({selectedCampus.name}) in Guest Mode. Event voting, student idea submissions,
                      and future club roadmaps are open exclusively to enrolled campus members.
                    </p>
                    <div className="pt-2">
                      <Link
                        href="/login"
                        className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                      >
                        <span>Sign In with Campus Account</span>
                      </Link>
                    </div>
                  </>
                ) : userRole === "ALUMNI" ? (
                  <>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      You are viewing <strong className="text-slate-800">{clubInfo.name}</strong> (
                      {selectedCampus.name}). As an alumnus, you can review leadership contacts and
                      past event archives. Active polling and internal event roadmaps are managed by
                      currently enrolled campus students.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      You are viewing <strong className="text-slate-800">{clubInfo.name}</strong> at{" "}
                      <strong className="text-slate-800">{selectedCampus.name}</strong>. As a member
                      of{" "}
                      <strong className="text-indigo-600">
                        {userCampusName || "your home campus"}
                      </strong>
                      , you are exploring this campus in visitor mode. Live event polls, voting, and
                      future planning are open exclusively to students of this campus.
                    </p>
                    {session?.user?.campusId && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (session.user.campusId) {
                              handleCampusChange(session.user.campusId);
                            }
                          }}
                          className="w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <span>Switch to My Campus Clubs</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
              <CardHeader className="p-4 pb-2 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span>Event Suggestions Poll</span>
                  </CardTitle>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Voting Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Window ends: <strong className="text-slate-700">{pollWindowEndsAt}</strong>
                </p>
              </CardHeader>

              <CardContent className="p-3 space-y-3">
                {/* Trigger to Add Event Suggestion with Anonymous option */}
                <button
                  type="button"
                  onClick={() => setShowCreateSuggestionModal(true)}
                  className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Suggest Event Idea</span>
                </button>

                {/* Poll Rules Notice */}
                <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80 text-[10px] text-amber-900 leading-snug">
                  • 1 changeable vote per student until window closes.
                  <br />
                  • Sorted automatically with most votes at top (descending).
                  <br />• Club official idea highlighted in distinct color.
                </div>

                {/* Descending Sorted Suggestions List */}
                <div className="space-y-2">
                  {pollOptions.map((opt) => (
                    <div
                      key={opt.id}
                      className={`p-3 rounded-2xl border transition-all ${
                        opt.isOfficialClubIdea
                          ? "bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border-purple-300 shadow-xs"
                          : opt.hasVoted
                            ? "bg-indigo-50/70 border-indigo-300"
                            : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {opt.isOfficialClubIdea && (
                            <span className="inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-purple-600 text-white mb-1 shadow-2xs">
                              Official Club Idea
                            </span>
                          )}
                          <p className="text-xs font-bold text-slate-900 leading-snug">
                            {opt.title}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            By: <strong className="text-slate-600">{opt.authorName}</strong>
                          </p>
                        </div>

                        {/* Strict Vote Button (Single Action) */}
                        <button
                          type="button"
                          onClick={() => handleVote(opt.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                            opt.hasVoted
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                          }`}
                        >
                          <ThumbsUp className="h-3 w-3" />
                          <span>{opt.votes}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>

      {/* Modal: Create Event Suggestion (Only for registered members of this campus) */}
      {!isGuestView && (
        <Modal
          open={showCreateSuggestionModal}
          onClose={() => setShowCreateSuggestionModal(false)}
          title="Submit Event Suggestion Poll Idea"
          className="max-w-md"
        >
          <form onSubmit={handleCreateSuggestion} className="space-y-4 pt-2 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Event Title & Pitch</label>
              <textarea
                rows={3}
                required
                value={newSuggestionTitle}
                onChange={(e) => setNewSuggestionTitle(e.target.value)}
                placeholder="e.g., Weekend Kaggle Hackathon on Medical Image Analysis…"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white resize-none"
              />
            </div>

            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
              <input
                type="checkbox"
                id="anonymous-toggle"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label
                htmlFor="anonymous-toggle"
                className="font-medium text-slate-700 cursor-pointer"
              >
                Post suggestion as Anonymous Student
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateSuggestionModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Submit Idea to Poll
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function ClubDetailPage() {
  return (
    <Suspense
      fallback={<div className="max-w-6xl mx-auto p-6 text-slate-400 text-xs">Loading club…</div>}
    >
      <ClubDetailPageContent />
    </Suspense>
  );
}
