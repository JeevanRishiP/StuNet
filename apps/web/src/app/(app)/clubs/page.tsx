"use client";

import Link from "next/link";
import type { Route } from "next";
import { Compass, ArrowRight, Calendar, Award } from "lucide-react";
import { Card, CardContent } from "@stunet/ui";

interface OfficialClub {
  slug: string;
  name: string;
  tagline: string;
  category: string;
  gradient: string;
  memberCount: number;
  presidentName: string;
  todayEvent?: string;
}

export default function ClubsPage() {
  // Live Events Today Banner (Plan Section 4 Page 6)
  const liveEventToday = {
    clubName: "Arts Club",
    title: "Creative Showcase & Digital Art Critique",
    time: "Today 3:00 PM",
    room: "Room 3, First Floor",
    slug: "arts",
  };

  // The 7 Official NIAT Clubs specified in Plan
  const officialClubs: OfficialClub[] = [
    {
      slug: "nsgc",
      name: "NSGC (NxtWave Student General Council)",
      tagline:
        "The central student governing body representing student voice and campus governance.",
      category: "Governance & Leadership",
      gradient: "from-indigo-600 via-indigo-700 to-purple-800",
      memberCount: 340,
      presidentName: "Alice Nair",
    },
    {
      slug: "advanced-tech",
      name: "Advanced Tech Club",
      tagline:
        "Systems programming, distributed computing, cloud architectures and open-source tooling.",
      category: "Technology",
      gradient: "from-blue-600 to-cyan-700",
      memberCount: 280,
      presidentName: "Dave Patel",
    },
    {
      slug: "arts",
      name: "Arts Club",
      tagline:
        "Visual arts, digital design, photography, theatrical performances and creative expressions.",
      category: "Cultural & Creative",
      gradient: "from-purple-600 to-pink-600",
      memberCount: 190,
      presidentName: "Bob Krishnan",
      todayEvent: "Showcase Today at 3:00 PM • Room 3",
    },
    {
      slug: "sports",
      name: "Sports Club",
      tagline:
        "Campus sports leagues, competitive esports tournaments, athletic meets and fitness drives.",
      category: "Athletics",
      gradient: "from-emerald-600 to-teal-700",
      memberCount: 220,
      presidentName: "Karan Singhania",
    },
    {
      slug: "edu",
      name: "EDU Club (Entrepreneur Club)",
      tagline:
        "Venture incubation, founder speaker sessions, pitch deck roasts and seed grant preparation.",
      category: "Entrepreneurship",
      gradient: "from-amber-600 to-orange-700",
      memberCount: 210,
      presidentName: "Jeevan Rishi P",
    },
    {
      slug: "gen-ai",
      name: "Gen AI Club",
      tagline:
        "LLM fine-tuning, autonomous agents, diffusion models, and generative computing hackathons.",
      category: "Artificial Intelligence",
      gradient: "from-violet-600 to-indigo-800",
      memberCount: 310,
      presidentName: "Carol Sharma",
    },
    {
      slug: "media",
      name: "Media Club",
      tagline:
        "Campus newsletter journalism, podcast production, video documentaries and public relations.",
      category: "Media & Journalism",
      gradient: "from-rose-600 to-pink-700",
      memberCount: 160,
      presidentName: "Pooja Hegde",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ── LIVE (EVENTS TODAY) BANNER ── */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/30 px-2 py-0.5 rounded-full">
                  Live Today
                </span>
                <span className="text-xs font-bold opacity-90">{liveEventToday.time}</span>
              </div>
              <p className="text-xs sm:text-sm font-bold mt-0.5">
                {liveEventToday.clubName} • {liveEventToday.title} • {liveEventToday.room}
              </p>
            </div>
          </div>

          <Link
            href={`/clubs/${liveEventToday.slug}` as Route}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-indigo-700 font-bold text-xs shadow-xs hover:bg-slate-50 transition-colors self-end sm:self-auto"
          >
            <span>View Club & Poll</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-sm">
              <Compass className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              NIAT Official Clubs & Chapters
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Explore the 7 official campus clubs, meet team leadership, review future event plans,
            and vote in live event suggestion polls.
          </p>
        </div>

        <div className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-slate-100 rounded-full text-slate-700">
          <Award className="h-3.5 w-3.5 text-indigo-600" />
          <span>7 Official Registered Clubs</span>
        </div>
      </div>

      {/* 7 Official Clubs Bento Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {officialClubs.map((club) => (
          <Link
            key={club.slug}
            href={`/clubs/${club.slug}` as Route}
            className="group block h-full"
          >
            <Card className="overflow-hidden border-slate-200/90 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-indigo-300 h-full flex flex-col justify-between rounded-3xl">
              {/* Banner Header with Gradient */}
              <div
                className={`h-24 bg-gradient-to-r ${club.gradient} relative flex items-end p-3.5`}
              >
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]" />
                <span className="relative z-10 rounded-full bg-black/40 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  {club.category}
                </span>
                {club.todayEvent && (
                  <span className="relative z-10 ml-auto rounded-full bg-amber-400 text-slate-900 px-2 py-0.5 text-[9px] font-black uppercase shadow-xs">
                    Event Today
                  </span>
                )}
              </div>

              <CardContent className="p-5 pt-3 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {club.name}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed line-clamp-2">
                    {club.tagline}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">President</span>
                    <span className="font-bold text-slate-800">{club.presidentName}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold block">Community</span>
                    <span className="font-bold text-indigo-600">{club.memberCount} Members</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
