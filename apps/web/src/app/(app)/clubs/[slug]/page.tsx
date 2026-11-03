"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ThumbsUp,
  ArrowLeft,
  Sparkles,
  Calendar,
  Plus,
  ExternalLink,
  Camera,
  Shield,
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Modal, Avatar } from "@stunet/ui";

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

export default function ClubDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

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
    category: "Student Chapter",
    description: "Official campus organization for collaborative student development.",
    instagram: "https://instagram.com/niat_campus",
  };

  // 7 Official Leadership Roles (Admin Assigned Only)
  const officialLeadership: ClubLeadershipMember[] = [
    { role: "1. President", name: "Alice Nair", email: "president.club@niat.edu.in" },
    { role: "2. Vice President", name: "Bob Krishnan", email: "vp.club@niat.edu.in" },
    { role: "3. Operational Head", name: "Carol Sharma", email: "ops.club@niat.edu.in" },
    { role: "4. Out Reach Head", name: "Dave Patel", email: "outreach.club@niat.edu.in" },
    { role: "5. Finance Head", name: "Eve Menon", email: "finance.club@niat.edu.in" },
    { role: "6. Creative & Design Head", name: "Rahul Verma", email: "design.club@niat.edu.in" },
    { role: "7. Social Media Head", name: "Ananya Roy", email: "social.club@niat.edu.in" },
  ];

  // Events: Future Plans & Past Events
  const eventsList: EventPlan[] = [
    {
      id: "ev-future-1",
      title: "Inter-Campus Hackathon & Prototype Jam",
      date: "Dec 02, 2026",
      details: "48-hour continuous product engineering challenge with VC and alumni mentors.",
      type: "FUTURE",
      suggestionsCount: 14,
    },
    {
      id: "ev-future-2",
      title: "Design System Architecture Workshop",
      date: "Dec 14, 2026",
      details: "Hands-on UI/UX guidelines and Figma token generation workshop.",
      type: "FUTURE",
      suggestionsCount: 6,
    },
    {
      id: "ev-past-1",
      title: "Annual Orientation & Leadership Onboarding",
      date: "Sep 15, 2026",
      details: "Welcomed 180 new student members across all branches with keynote alumni speakers.",
      type: "PAST",
      feedbackCount: 42,
    },
  ];

  // Event Suggestions Poll Options (with Official Idea in Distinct Color & Descending Order)
  const [pollOptions, setPollOptions] = useState<SuggestionPollOption[]>([
    {
      id: "opt-official",
      title: "Official Club Pitch: Generative AI Agents Hackathon in Bengaluru Tech Park",
      authorName: "Club Official Board",
      isOfficialClubIdea: true,
      votes: 142,
      hasVoted: false,
    },
    {
      id: "opt-1",
      title: "Beginner-Friendly Linux Kernel & Shell Scripting Bootcamp",
      authorName: "Dave Patel",
      isOfficialClubIdea: false,
      votes: 89,
      hasVoted: false,
    },
    {
      id: "opt-2",
      title: "Campus Web3 & Cryptographic Smart Contract Teardown",
      authorName: "Anonymous Student",
      isOfficialClubIdea: false,
      votes: 45,
      hasVoted: false,
    },
    {
      id: "opt-3",
      title: "Figma to React Component Code Sprint",
      authorName: "Bob Krishnan",
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

  // Single Changeable Vote Logic (Plan rule: student can change vote until window ends)
  function handleVote(optionId: string) {
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
          // Remove previous vote if any (only 1 vote allowed)
          if (opt.hasVoted) {
            return {
              ...opt,
              hasVoted: false,
              votes: Math.max(0, opt.votes - 1),
            };
          }
          return opt;
        })
        .sort((a, b) => b.votes - a.votes); // Descending order by votes!
    });
  }

  function handleCreateSuggestion(e: React.FormEvent) {
    e.preventDefault();
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
      // Unvote previous
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
    const text = eventSuggestionInputs[eventId]?.trim();
    if (!text) return;
    alert(`Suggestion recorded for event: "${text}"`);
    setEventSuggestionInputs((prev) => ({ ...prev, [eventId]: "" }));
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Back Link */}
      <Link
        href="/clubs"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to All Clubs</span>
      </Link>

      {/* Club Banner Header */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 relative p-6 flex items-end">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:10px_10px]" />
          <span className="relative z-10 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider">
            {clubInfo.category}
          </span>
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

          {/* Social Links: Instagram Direct Link */}
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
              Admin Verified Roster
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
                  <span>Team Leadership Details (7 Official Roles — Admin Assigned)</span>
                </CardTitle>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Official appointments authorized by the Office of Student Affairs.
                </p>
              </div>
            </CardHeader>

            <CardContent className="p-3 divide-y divide-slate-100 text-xs">
              {officialLeadership.map((member, idx) => (
                <div
                  key={idx}
                  className="py-2.5 px-2 flex items-center justify-between hover:bg-slate-50/80 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={member.name} size="sm" />
                    <div>
                      <p className="font-bold text-slate-900">{member.name}</p>
                      <p className="text-[10px] text-slate-400">{member.email}</p>
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
              <span>Events & Roadmaps</span>
            </h2>

            {/* Future Plans */}
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

            {/* Past Events */}
            <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
              <CardHeader className="bg-slate-50/60 p-3.5 border-b border-slate-100">
                <CardTitle className="text-xs font-bold text-slate-700">
                  Past Events Archive
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

        {/* ── RIGHT STICKY COLUMN (35% / cols-4): EVENT SUGGESTIONS POLL WIDGET ── */}
        <aside className="lg:col-span-4 sticky top-6 space-y-4">
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
                        <p className="text-xs font-bold text-slate-900 leading-snug">{opt.title}</p>
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
        </aside>
      </div>

      {/* Modal: Create Event Suggestion */}
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
            <label htmlFor="anonymous-toggle" className="font-medium text-slate-700 cursor-pointer">
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
            <Button type="submit" className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
              Submit Idea to Poll
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
