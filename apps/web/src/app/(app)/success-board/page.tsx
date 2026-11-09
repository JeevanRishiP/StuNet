"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Award,
  Briefcase,
  Rocket,
  Code,
  Flame,
  Globe,
  ExternalLink,
  Sparkles,
  Medal,
  TrendingUp,
} from "lucide-react";
import { Avatar, Card, CardContent, CardHeader, CardTitle } from "@stunet/ui";
import AdvancedSelectList, { GeoFilterSelection } from "@/components/AdvancedSelectList";

const STUDENT_USERNAMES: Record<string, string> = {
  "Harshitha Shree Raj": "2102508576",
  "Sankirth R Bhat": "2102508646",
  "Shrenik Sk": "2102508660",
  "Karan Raj K R": "2102508585",
  "Dhanunjay T": "2102508679",
  "Jeevan Rishi P": "2102508579",
  "Siddharth Rao": "2102508542",
  "Ananya Roy": "2102508544",
  "Devansh K": "2102508545",
  "Kavya Murthy": "2102508547",
  "Nikhil Verma": "2102508609",
  "Vikram Joshi": "2102508552",
  "Sneha Nair": "2102508665",
  "Aditya Hegde": "2102508515",
};

function StudentNameLink({
  name,
  username,
  className,
}: {
  name: string;
  username?: string;
  className?: string;
}) {
  const targetUsername = username || STUDENT_USERNAMES[name] || "2102508579";
  return (
    <Link
      href={`/u/${targetUsername}`}
      className={`hover:text-indigo-600 hover:underline transition-colors ${className ?? "font-bold text-slate-900"}`}
    >
      {name}
    </Link>
  );
}

export default function SuccessBoardPage() {
  // Global Comparison Filters from Plan
  const [geoFilter, setGeoFilter] = useState<GeoFilterSelection>({
    type: "ALL",
    name: "All Campuses",
  });
  const [batchFilter, setBatchFilter] = useState<string>("ALL");

  // 4 Primary Section Tabs
  const [activeSection, setActiveSection] = useState<
    "ACHIEVEMENTS" | "NIAT_COMPETITIONS" | "CP" | "PROJECTS"
  >("ACHIEVEMENTS");

  // 15 Sub-Boards mock grounded data with real S-VYASA student representatives
  const placedLeaders = [
    {
      rank: 1,
      name: "Harshitha Shree Raj",
      company: "Google",
      role: "SWE",
      ctc: "44 LPA",
      avatar: null,
    },
    {
      rank: 2,
      name: "Sankirth R Bhat",
      company: "Microsoft",
      role: "SDE-1",
      ctc: "42 LPA",
      avatar: null,
    },
    { rank: 3, name: "Shrenik Sk", company: "Amazon", role: "SDE", ctc: "38 LPA", avatar: null },
  ];

  const internshipLeaders = [
    {
      rank: 1,
      name: "Karan Raj K R",
      company: "Uber",
      role: "AI Research Intern",
      stipend: "₹1.5L/mo",
    },
    {
      rank: 2,
      name: "Dhanunjay T",
      company: "Adobe",
      role: "Product Design Intern",
      stipend: "₹1.2L/mo",
    },
  ];

  const vcStartupLeaders = [
    {
      rank: 1,
      name: "Jeevan Rishi P",
      startup: "AuraLuxe AI",
      funding: "₹50 Lakhs VC Seed",
      sector: "Generative AI",
    },
    {
      rank: 2,
      name: "Siddharth Rao",
      startup: "QuickDine",
      funding: "₹25 Lakhs Angel",
      sector: "B2B SaaS",
    },
  ];

  const socialMediaLeaders = [
    {
      rank: 1,
      name: "Ananya Roy",
      platform: "LinkedIn",
      reach: "25k Followers",
      domain: "Tech Content",
    },
    {
      rank: 2,
      name: "Devansh K",
      platform: "X / Twitter",
      reach: "18k Followers",
      domain: "Open Source",
    },
  ];

  const otherAchievements = [
    { rank: 1, name: "Kavya Murthy", achievement: "Published IEEE Paper on Edge Computing" },
    { rank: 2, name: "Nikhil Verma", achievement: "Granted Indian Patent for IoT Smart Grid" },
  ];

  const cpLeetCode = [
    {
      rank: 1,
      name: "Sankirth R Bhat",
      score: "2,350 Contest Rating",
      solved: "1,240 Problems",
      badge: "Guardian",
    },
    {
      rank: 2,
      name: "Harshitha Shree Raj",
      score: "2,140 Contest Rating",
      solved: "980 Problems",
      badge: "Knight",
    },
  ];

  const cpCodeforces = [
    { rank: 1, name: "Vikram Joshi", rating: "2,012 Rating", rankTitle: "Candidate Master" },
    { rank: 2, name: "Shrenik Sk", rating: "1,890 Rating", rankTitle: "Expert" },
  ];

  const cpHackerRank = [
    { rank: 1, name: "Sneha Nair", badge: "6 Stars Problem Solving", stars: "Gold Badge" },
    { rank: 2, name: "Aditya Hegde", badge: "6 Stars Python & SQL", stars: "Gold Badge" },
  ];

  const projectsGithubStars = [
    {
      rank: 1,
      repo: "open-campus-ledger",
      owner: "Jeevan Rishi P",
      stars: "340 Stars",
      tech: "Rust / TypeScript",
    },
    {
      rank: 2,
      repo: "react-native-biometric",
      owner: "Karan Raj K R",
      stars: "280 Stars",
      tech: "Kotlin / Swift",
    },
  ];

  const huggingFaceLeaders = [
    { rank: 1, name: "Shrenik Sk", model: "campus-llama-instruct", downloads: "12.4k Downloads" },
    { rank: 2, name: "Dhanunjay T", model: "kannada-whisper-v2", downloads: "8.1k Downloads" },
  ];

  const kaggleLeaders = [
    { rank: 1, name: "Sankirth R Bhat", tier: "Kaggle Grandmaster", rankNum: "#42 Global" },
    { rank: 2, name: "Harshitha Shree Raj", tier: "Kaggle Master", rankNum: "#180 Global" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-sm">
              <Trophy className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Success Board
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Top achievements, competition rankings, and technical leaderboards across NIAT campuses.
          </p>
        </div>

        {/* Global Comparison Filter Bar (Plan Section 3) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Geographic Filter via AdvancedSelectList */}
          <AdvancedSelectList currentSelection={geoFilter} onSelect={(sel) => setGeoFilter(sel)} />

          {/* Cohort / Batch Filter */}
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-full px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Batches (Years)</option>
            <option value="2027">Batch of 2027 (Year 2)</option>
            <option value="2026">Batch of 2026 (Year 3)</option>
            <option value="2025">Batch of 2025 (Final Year)</option>
            <option value="ALUMNI">Alumni Batches</option>
          </select>
        </div>
      </div>

      {/* 4 Primary Section Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-1.5 shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto text-xs font-bold">
          {[
            { id: "ACHIEVEMENTS" as const, label: "Achievements (5 Boards)", icon: Award },
            {
              id: "NIAT_COMPETITIONS" as const,
              label: "NIAT Competitions (3 Boards)",
              icon: Trophy,
            },
            { id: "CP" as const, label: "Competitive Programming (3 Boards)", icon: Code },
            { id: "PROJECTS" as const, label: "Projects & Open Source (4 Boards)", icon: Code },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`flex-1 py-2.5 px-3 rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-2 ${
                  activeSection === tab.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 1: ACHIEVEMENTS (Boards 1 - 5) ── */}
      {activeSection === "ACHIEVEMENTS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Board 1: Placed */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 border-b border-emerald-100/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-emerald-600" />
                  <span>1. Placed Students</span>
                </CardTitle>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  Top CTC
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3 divide-y divide-slate-100">
              {placedLeaders.map((u) => (
                <div key={u.rank} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-400 w-4">#{u.rank}</span>
                    <Link href={`/u/${STUDENT_USERNAMES[u.name] || "2102508579"}`}>
                      <Avatar name={u.name} size="sm" />
                    </Link>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        <StudentNameLink name={u.name} />
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {u.company} · {u.role}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                    {u.ctc}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Board 2: Cracked Internships */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b border-blue-100/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-blue-600" />
                  <span>2. Cracked Internships</span>
                </CardTitle>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
                  Tier-1
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3 divide-y divide-slate-100">
              {internshipLeaders.map((u) => (
                <div key={u.rank} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-400 w-4">#{u.rank}</span>
                    <Link href={`/u/${STUDENT_USERNAMES[u.name] || "2102508579"}`}>
                      <Avatar name={u.name} size="sm" />
                    </Link>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        <StudentNameLink name={u.name} />
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {u.company} · {u.role}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {u.stipend}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Board 3: Startup Funded by VC */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 border-b border-purple-100/60">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <Rocket className="h-4 w-4 text-purple-600" />
                  <span>3. Startup Funded by VC</span>
                </CardTitle>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full">
                  Founders
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3 divide-y divide-slate-100">
              {vcStartupLeaders.map((u) => (
                <div key={u.rank} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-400 w-4">#{u.rank}</span>
                    <Link href={`/u/${STUDENT_USERNAMES[u.name] || "2102508579"}`}>
                      <Avatar name={u.name} size="sm" />
                    </Link>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{u.startup}</p>
                      <p className="text-[11px] text-slate-500">
                        Founder: <StudentNameLink name={u.name} />
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                    {u.funding}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Board 4: Social Media */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 border-b border-amber-100/60">
              <CardTitle className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-amber-600" />
                <span>4. Social Media Leaders</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 divide-y divide-slate-100">
              {socialMediaLeaders.map((u) => (
                <div key={u.rank} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-400 w-4">#{u.rank}</span>
                    <Link href={`/u/${STUDENT_USERNAMES[u.name] || "2102508579"}`}>
                      <Avatar name={u.name} size="sm" />
                    </Link>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        <StudentNameLink name={u.name} />
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {u.platform} · {u.domain}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                    {u.reach}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Board 5: Others */}
          <Card className="border-slate-200/90 shadow-2xs overflow-hidden md:col-span-2 lg:col-span-2">
            <CardHeader className="bg-slate-50 p-4 border-b border-slate-100">
              <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <span>5. Other Achievements (Patents, Publications & Research)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 divide-y divide-slate-100">
              {otherAchievements.map((u) => (
                <div key={u.rank} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-400 w-4">#{u.rank}</span>
                    <Link href={`/u/${STUDENT_USERNAMES[u.name] || "2102508579"}`}>
                      <Avatar name={u.name} size="sm" />
                    </Link>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        <StudentNameLink name={u.name} />
                      </p>
                      <p className="text-xs text-slate-600">{u.achievement}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                    Verified
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── SECTION 2: NIAT COMPETITIONS (Boards 6 - 8) ── */}
      {activeSection === "NIAT_COMPETITIONS" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Board 6: GRIT */}
          <Card className="border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">6. GRIT Leaderboard</h3>
              </div>
              <a
                href="https://www.grit.niatindia.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-indigo-600 hover:underline flex items-center gap-0.5 font-semibold"
              >
                <span>grit.niatindia.com</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-xs text-slate-600">
              Live algorithmic challenges and real-time execution benchmarks.
            </p>
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                <span className="font-bold text-slate-900">
                  1. <StudentNameLink name="Harshitha Shree Raj" />
                </span>
                <span className="font-extrabold text-indigo-600">98.4 pts</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                <span className="font-bold text-slate-900">
                  2. <StudentNameLink name="Sankirth R Bhat" />
                </span>
                <span className="font-extrabold text-indigo-600">94.1 pts</span>
              </div>
            </div>
          </Card>

          {/* Board 7: BRAVE */}
          <Card className="border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <h3 className="text-sm font-bold text-slate-900">7. BRAVE Venture Score</h3>
              </div>
              <a
                href="https://www.brave.niatindia.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-orange-600 hover:underline flex items-center gap-0.5 font-semibold"
              >
                <span>brave.niatindia.com</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-xs text-slate-600">
              Venture building speed, verified traction, and commercial growth.
            </p>
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                <span className="font-bold text-slate-900">1. AuraLuxe AI</span>
                <span className="font-extrabold text-orange-600">₹12.5L Revenue</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
                <span className="font-bold text-slate-900">2. QuickDine QR</span>
                <span className="font-extrabold text-orange-600">₹4.8L Revenue</span>
              </div>
            </div>
          </Card>

          {/* Board 8: Mock Interview Score (Leave Blank / Empty Placeholder as specified in Plan) */}
          <Card className="border-dashed border-2 border-slate-200 shadow-none p-6 flex flex-col items-center justify-center text-center space-y-2">
            <Award className="h-8 w-8 text-slate-300" />
            <h3 className="text-xs font-bold text-slate-700">8. Mock Interview Score</h3>
            <p className="text-[11px] text-slate-400 max-w-xs">
              Evaluation cycle has not concluded. Score data will be published once internal
              assessment scores are released.
            </p>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 mt-2">
              Data Not Available
            </span>
          </Card>
        </div>
      )}

      {/* ── SECTION 3: COMPETITIVE PROGRAMMING (Boards 9 - 11) ── */}
      {activeSection === "CP" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Board 9: Codeforces */}
          <Card className="border-slate-200/90 shadow-2xs p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Code className="h-4 w-4 text-indigo-600" />
              <span>9. Codeforces Campus Rankings</span>
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {cpCodeforces.map((u, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">
                      <StudentNameLink name={u.name} />
                    </p>
                    <p className="text-[11px] text-purple-600 font-semibold">{u.rankTitle}</p>
                  </div>
                  <span className="font-extrabold text-indigo-600">{u.rating}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Board 10: LeetCode */}
          <Card className="border-slate-200/90 shadow-2xs p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              <span>10. LeetCode Solved & Rating</span>
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {cpLeetCode.map((u, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">
                      <StudentNameLink name={u.name} />
                    </p>
                    <p className="text-[11px] text-amber-600 font-semibold">{u.badge}</p>
                  </div>
                  <span className="font-extrabold text-slate-900">{u.score}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Board 11: HackerRank */}
          <Card className="border-slate-200/90 shadow-2xs p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Medal className="h-4 w-4 text-emerald-600" />
              <span>11. HackerRank Badges</span>
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {cpHackerRank.map((u, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">
                      <StudentNameLink name={u.name} />
                    </p>
                    <p className="text-[11px] text-slate-500">{u.badge}</p>
                  </div>
                  <span className="font-bold text-emerald-600">{u.stars}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── SECTION 4: PROJECTS & COMPETITIONS (Boards 12 - 15) ── */}
      {activeSection === "PROJECTS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Board 12: GitHub Repos */}
          <Card className="border-slate-200/90 shadow-2xs p-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Code className="h-4 w-4" />
              <span>12. GitHub Repos</span>
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-2 bg-slate-50 rounded-lg">
                <p className="font-bold text-slate-900">open-campus-ledger</p>
                <p className="text-[11px] text-slate-500">42 Repos active</p>
              </div>
            </div>
          </Card>

          {/* Board 13: GitHub Repo Stars */}
          <Card className="border-slate-200/90 shadow-2xs p-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>13. GitHub Stars</span>
            </h3>
            <div className="space-y-2 text-xs">
              {projectsGithubStars.map((p, i) => (
                <div
                  key={i}
                  className="p-2 bg-slate-50 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-slate-900">{p.repo}</p>
                    <p className="text-[10px] text-slate-500">
                      <StudentNameLink
                        name={p.owner}
                        className="text-[10px] text-slate-500 hover:text-indigo-600 font-medium"
                      />
                    </p>
                  </div>
                  <span className="font-bold text-amber-600 text-xs">{p.stars}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Board 14: HuggingFace */}
          <Card className="border-slate-200/90 shadow-2xs p-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span className="text-yellow-600 text-sm">🤗</span>
              <span>14. HuggingFace</span>
            </h3>
            <div className="space-y-2 text-xs">
              {huggingFaceLeaders.map((h, i) => (
                <div
                  key={i}
                  className="p-2 bg-slate-50 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-slate-900">{h.model}</p>
                    <p className="text-[10px] text-slate-500">
                      <StudentNameLink
                        name={h.name}
                        className="text-[10px] text-slate-500 hover:text-indigo-600 font-medium"
                      />
                    </p>
                  </div>
                  <span className="font-bold text-indigo-600 text-[11px]">{h.downloads}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Board 15: Kaggle */}
          <Card className="border-slate-200/90 shadow-2xs p-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-blue-500" />
              <span>15. Kaggle</span>
            </h3>
            <div className="space-y-2 text-xs">
              {kaggleLeaders.map((k, i) => (
                <div
                  key={i}
                  className="p-2 bg-slate-50 rounded-lg flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-slate-900">
                      <StudentNameLink name={k.name} />
                    </p>
                    <p className="text-[10px] text-blue-600 font-semibold">{k.tier}</p>
                  </div>
                  <span className="font-bold text-slate-900 text-[11px]">{k.rankNum}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
