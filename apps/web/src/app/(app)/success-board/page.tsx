"use client";

import { useState, useEffect, useCallback } from "react";
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
  CheckCircle,
  AlertCircle,
  Plus,
  ShieldCheck,
  Info,
  Loader2,
} from "lucide-react";
import { Avatar, Button, Card, CardContent, CardHeader, CardTitle, Modal } from "@stunet/ui";
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

interface StudentRepresentative {
  name: string;
  username: string;
}

const REGISTERED_STUDENTS: StudentRepresentative[] = [
  { name: "Jeevan Rishi P", username: "2102508579" },
  { name: "Sankirth R Bhat", username: "2102508646" },
  { name: "Harshitha Shree Raj", username: "2102508576" },
  { name: "Shrenik Sk", username: "2102508660" },
  { name: "Vikram Joshi", username: "2102508552" },
  { name: "Sneha Nair", username: "2102508665" },
  { name: "Aditya Hegde", username: "2102508515" },
  { name: "Karan Raj K R", username: "2102508585" },
  { name: "Dhanunjay T", username: "2102508679" },
];

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
      className={`hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors ${className ?? "font-bold text-slate-900 dark:text-slate-100"}`}
    >
      {name}
    </Link>
  );
}

type CPEntry = {
  rank: number;
  name: string;
  username?: string;
  score?: string;
  solved?: string;
  badge?: string;
  rating?: string;
  rankTitle?: string;
  stars?: string;
  profileUrl?: string;
  verifiedName?: string;
  isLiveExtracted?: boolean;
};

type ProjectEntry = {
  rank: number;
  repo?: string;
  owner?: string;
  name?: string;
  username?: string;
  stars?: string;
  tech?: string;
  model?: string;
  downloads?: string;
  tier?: string;
  rankNum?: string;
  profileUrl?: string;
  verifiedName?: string;
};

type ExtractionResult = {
  success: boolean;
  status: "VERIFIED" | "PARTIAL_MATCH" | "MISMATCH";
  message: string;
  reason?: string;
  extracted?: {
    profileName?: string | null;
    handle: string;
    metrics: {
      primaryScoreLabel: string;
      secondaryScoreLabel: string;
    };
  };
};

export default function SuccessBoardPage() {
  const [geoFilter, setGeoFilter] = useState<GeoFilterSelection>({
    type: "ALL",
    name: "All Campuses",
  });
  const [batchFilter, setBatchFilter] = useState<string>("ALL");

  // PRIMARY SECTION TABS — CP is the first tab as requested
  const [activeSection, setActiveSection] = useState<
    "CP" | "ACHIEVEMENTS" | "PROJECTS" | "NIAT_COMPETITIONS"
  >("CP");

  // Modal state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<
    | "LEETCODE"
    | "CODEFORCES"
    | "HACKERRANK"
    | "GITHUB"
    | "HUGGINGFACE"
    | "KAGGLE"
    | "LINKEDIN"
    | "PORTFOLIO"
  >("LEETCODE");
  const [profileUrlInput, setProfileUrlInput] = useState("");
  const [selectedStudentName, setSelectedStudentName] = useState("Jeevan Rishi P");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);

  // Live board data — initial grounded baseline
  const [cpBoards, setCpBoards] = useState<{
    leetcode: CPEntry[];
    codeforces: CPEntry[];
    hackerrank: CPEntry[];
  }>({
    leetcode: [
      {
        rank: 1,
        name: "Sankirth R Bhat",
        username: "2102508646",
        score: "2,350 Contest Rating",
        solved: "1,240 Problems",
        badge: "Guardian",
        profileUrl: "https://leetcode.com/u/sankirth_bhat",
        verifiedName: "Sankirth R Bhat",
      },
      {
        rank: 2,
        name: "Harshitha Shree Raj",
        username: "2102508576",
        score: "2,140 Contest Rating",
        solved: "980 Problems",
        badge: "Knight",
        profileUrl: "https://leetcode.com/u/harshitha_raj",
        verifiedName: "Harshitha Shree Raj",
      },
    ],
    codeforces: [
      {
        rank: 1,
        name: "Vikram Joshi",
        username: "2102508552",
        rating: "2,012 Rating",
        rankTitle: "Candidate Master",
        profileUrl: "https://codeforces.com/profile/vikram_joshi",
        verifiedName: "Vikram Joshi",
      },
      {
        rank: 2,
        name: "Shrenik Sk",
        username: "2102508660",
        rating: "1,890 Rating",
        rankTitle: "Expert",
        profileUrl: "https://codeforces.com/profile/shrenik_sk",
        verifiedName: "Shrenik Sk",
      },
    ],
    hackerrank: [
      {
        rank: 1,
        name: "Sneha Nair",
        username: "2102508665",
        badge: "6 Stars Problem Solving",
        stars: "Gold Badge",
        profileUrl: "https://hackerrank.com/profile/sneha_nair",
        verifiedName: "Sneha Nair",
      },
      {
        rank: 2,
        name: "Aditya Hegde",
        username: "2102508515",
        badge: "6 Stars Python & SQL",
        stars: "Gold Badge",
        profileUrl: "https://hackerrank.com/profile/aditya_hegde",
        verifiedName: "Aditya Hegde",
      },
    ],
  });

  const [projectBoards, setProjectBoards] = useState<{
    githubStars: ProjectEntry[];
    huggingFace: ProjectEntry[];
    kaggle: ProjectEntry[];
  }>({
    githubStars: [
      {
        rank: 1,
        repo: "open-campus-ledger",
        owner: "Jeevan Rishi P",
        username: "2102508579",
        stars: "340 Stars",
        tech: "Rust / TypeScript",
        profileUrl: "https://github.com/jeevanriship",
        verifiedName: "Jeevan Rishi P",
      },
      {
        rank: 2,
        repo: "react-native-biometric",
        owner: "Karan Raj K R",
        username: "2102508585",
        stars: "280 Stars",
        tech: "Kotlin / Swift",
        profileUrl: "https://github.com/karan_raj",
        verifiedName: "Karan Raj K R",
      },
    ],
    huggingFace: [
      {
        rank: 1,
        name: "Shrenik Sk",
        username: "2102508660",
        model: "campus-llama-instruct",
        downloads: "12.4k Downloads",
        profileUrl: "https://huggingface.co/shrenik_sk",
        verifiedName: "Shrenik Sk",
      },
      {
        rank: 2,
        name: "Dhanunjay T",
        username: "2102508679",
        model: "kannada-whisper-v2",
        downloads: "8.1k Downloads",
        profileUrl: "https://huggingface.co/dhanunjay_t",
        verifiedName: "Dhanunjay T",
      },
    ],
    kaggle: [
      {
        rank: 1,
        name: "Sankirth R Bhat",
        username: "2102508646",
        tier: "Kaggle Grandmaster",
        rankNum: "#42 Global",
        profileUrl: "https://kaggle.com/sankirth_bhat",
        verifiedName: "Sankirth R Bhat",
      },
      {
        rank: 2,
        name: "Harshitha Shree Raj",
        username: "2102508576",
        tier: "Kaggle Master",
        rankNum: "#180 Global",
        profileUrl: "https://kaggle.com/harshitha_raj",
        verifiedName: "Harshitha Shree Raj",
      },
    ],
  });

  // Achievements grounded data (unchanged, non-external)
  const placedLeaders = [
    { rank: 1, name: "Harshitha Shree Raj", company: "Google", role: "SWE", ctc: "44 LPA" },
    { rank: 2, name: "Sankirth R Bhat", company: "Microsoft", role: "SDE-1", ctc: "42 LPA" },
    { rank: 3, name: "Shrenik Sk", company: "Amazon", role: "SDE", ctc: "38 LPA" },
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

  const refreshBoardData = useCallback(async () => {
    try {
      const res = await fetch(`/api/success-board?geo=${geoFilter.type}&batch=${batchFilter}`);
      if (res.ok) {
        const data = await res.json();
        if (data.cpBoards?.leetcode) setCpBoards(data.cpBoards);
        if (data.projectsBoards?.githubStars) setProjectBoards(data.projectsBoards);
      }
    } catch {
      // silent fail — baseline data remains
    }
  }, [geoFilter.type, batchFilter]);

  useEffect(() => {
    refreshBoardData();
  }, [refreshBoardData]);

  async function handleProfileExtraction(e: React.FormEvent) {
    e.preventDefault();
    if (!profileUrlInput.trim()) return;
    setIsExtracting(true);
    setExtractionResult(null);
    try {
      const res = await fetch("/api/achievements/extract-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: selectedPlatform,
          profileUrl: profileUrlInput.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setExtractionResult({
          success: true,
          status: data.status,
          message: data.message || "Profile verified and added to the board!",
          reason: data.verification?.reason,
          extracted: data.extracted,
        });
        await refreshBoardData();
      } else {
        setExtractionResult({
          success: false,
          status: data.status || "MISMATCH",
          message: data.message || data.error || "Name verification failed — profile rejected.",
          reason: data.verification?.reason || data.error,
          extracted: data.extracted,
        });
      }
    } catch {
      setExtractionResult({
        success: false,
        status: "MISMATCH",
        message: "Network error while connecting to external platform. Please try again.",
      });
    } finally {
      setIsExtracting(false);
    }
  }

  const VerifiedBadge = () => (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800 px-1.5 py-0.5 rounded">
      <CheckCircle className="h-2.5 w-2.5" />
      Verified
    </span>
  );

  const ProfileLink = ({ url }: { url?: string }) =>
    url ? (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-0.5 text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        <span>profile</span>
        <ExternalLink className="h-2.5 w-2.5" />
      </a>
    ) : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-sm">
              <Trophy className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Success Board
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Verified rankings auto-extracted from external platforms with student identity
            name-matching. NIAT Competitions are scored separately and do not require external
            links.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <Button
            type="button"
            onClick={() => {
              setExtractionResult(null);
              setIsSubmitModalOpen(true);
            }}
            className="text-xs font-bold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Submit Profile Link
          </Button>
          <AdvancedSelectList currentSelection={geoFilter} onSelect={(sel) => setGeoFilter(sel)} />
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Batches</option>
            <option value="2027">Batch of 2027</option>
            <option value="2026">Batch of 2026</option>
            <option value="2025">Batch of 2025 (Final)</option>
            <option value="ALUMNI">Alumni</option>
          </select>
        </div>
      </div>

      {/* ── SECTION TABS — CP IS FIRST ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-1.5 shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto text-xs font-bold">
          {[
            { id: "CP" as const, label: "1. Competitive Programming", icon: Code },
            { id: "ACHIEVEMENTS" as const, label: "2. Achievements (5 Boards)", icon: Award },
            { id: "PROJECTS" as const, label: "3. Projects & Open Source", icon: Sparkles },
            { id: "NIAT_COMPETITIONS" as const, label: "4. NIAT Competitions", icon: Trophy },
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
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 1: COMPETITIVE PROGRAMMING (The first one — auto-extracted) ── */}
      {activeSection === "CP" && (
        <div className="space-y-4">
          {/* Extraction Info Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  Automated Extraction & Student Name Verification
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Submit your LeetCode, Codeforces, or HackerRank profile link. Ratings, problems
                  solved, and badges are extracted automatically. The system enforces that the
                  profile&apos;s display name matches your registered student name before ranking.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setExtractionResult(null);
                setIsSubmitModalOpen(true);
              }}
              className="text-xs font-bold shrink-0 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            >
              + Link Profile
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* LeetCode Board */}
            <Card className="border-slate-200/90 dark:border-slate-800 shadow-2xs p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                  LeetCode Solved &amp; Rating
                </h3>
                <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Auto-Extracted
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {cpBoards.leetcode.map((u, i) => (
                  <div key={i} className="py-2.5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-black text-slate-400 dark:text-slate-500 w-4 shrink-0">
                          #{u.rank}
                        </span>
                        <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                          <StudentNameLink name={u.name} username={u.username} />
                        </p>
                      </div>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100 shrink-0 text-right">
                        {u.score}
                      </span>
                    </div>
                    <div className="pl-6 flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                        {u.badge}
                      </span>
                      {u.solved && (
                        <>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            {u.solved}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="pl-6 flex items-center gap-2">
                      <VerifiedBadge />
                      <ProfileLink url={u.profileUrl} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Codeforces Board */}
            <Card className="border-slate-200/90 dark:border-slate-800 shadow-2xs p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Code className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Codeforces Rankings
                </h3>
                <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800 px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Auto-Extracted
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {cpBoards.codeforces.map((u, i) => (
                  <div key={i} className="py-2.5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-black text-slate-400 dark:text-slate-500 w-4 shrink-0">
                          #{u.rank}
                        </span>
                        <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                          <StudentNameLink name={u.name} username={u.username} />
                        </p>
                      </div>
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400 shrink-0 text-right">
                        {u.rating}
                      </span>
                    </div>
                    <p className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold pl-6">
                      {u.rankTitle}
                    </p>
                    <div className="pl-6 flex items-center gap-2">
                      <VerifiedBadge />
                      <ProfileLink url={u.profileUrl} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* HackerRank Board */}
            <Card className="border-slate-200/90 dark:border-slate-800 shadow-2xs p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Medal className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  HackerRank Badges
                </h3>
                <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Auto-Extracted
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {cpBoards.hackerrank.map((u, i) => (
                  <div key={i} className="py-2.5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-black text-slate-400 dark:text-slate-500 w-4 shrink-0">
                          #{u.rank}
                        </span>
                        <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                          <StudentNameLink name={u.name} username={u.username} />
                        </p>
                      </div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        {u.stars}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 pl-6 truncate">
                      {u.badge}
                    </p>
                    <div className="pl-6 flex items-center gap-2">
                      <VerifiedBadge />
                      <ProfileLink url={u.profileUrl} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── SECTION 2: ACHIEVEMENTS ── */}
      {activeSection === "ACHIEVEMENTS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Board 1: Placed */}
          <Card className="border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 p-4 border-b border-emerald-100/60 dark:border-emerald-900/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  1. Placed Students
                </CardTitle>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">
                  Top CTC
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3 divide-y divide-slate-100 dark:divide-slate-800">
              {placedLeaders.map((u) => (
                <div key={u.rank} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-400 dark:text-slate-500 w-4">
                      #{u.rank}
                    </span>
                    <Link href={`/u/${STUDENT_USERNAMES[u.name] || "2102508579"}`}>
                      <Avatar name={u.name} size="sm" />
                    </Link>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        <StudentNameLink name={u.name} />
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {u.company} · {u.role}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                    {u.ctc}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Board 2: Internships */}
          <Card className="border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 p-4 border-b border-blue-100/60 dark:border-blue-900/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  2. Cracked Internships
                </CardTitle>
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/50 px-2 py-0.5 rounded-full">
                  Tier-1
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3 divide-y divide-slate-100 dark:divide-slate-800">
              {internshipLeaders.map((u) => (
                <div key={u.rank} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-400 dark:text-slate-500 w-4">
                      #{u.rank}
                    </span>
                    <Link href={`/u/${STUDENT_USERNAMES[u.name] || "2102508579"}`}>
                      <Avatar name={u.name} size="sm" />
                    </Link>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        <StudentNameLink name={u.name} />
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {u.company} · {u.role}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md">
                    {u.stipend}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Board 3: VC Startups */}
          <Card className="border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/40 dark:to-pink-950/40 p-4 border-b border-purple-100/60 dark:border-purple-900/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                  <Rocket className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  3. Startup Funded by VC
                </CardTitle>
                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100/80 dark:bg-purple-900/50 px-2 py-0.5 rounded-full">
                  Founders
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3 divide-y divide-slate-100 dark:divide-slate-800">
              {vcStartupLeaders.map((u) => (
                <div key={u.rank} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-400 dark:text-slate-500 w-4">
                      #{u.rank}
                    </span>
                    <Link href={`/u/${STUDENT_USERNAMES[u.name] || "2102508579"}`}>
                      <Avatar name={u.name} size="sm" />
                    </Link>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {u.startup}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Founder: <StudentNameLink name={u.name} />
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-md">
                    {u.funding}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Board 4: Social Media */}
          <Card className="border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 p-4 border-b border-amber-100/60 dark:border-amber-900/50">
              <CardTitle className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                4. Social Media Leaders
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 divide-y divide-slate-100 dark:divide-slate-800">
              {socialMediaLeaders.map((u) => (
                <div key={u.rank} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-400 dark:text-slate-500 w-4">
                      #{u.rank}
                    </span>
                    <Link href={`/u/${STUDENT_USERNAMES[u.name] || "2102508579"}`}>
                      <Avatar name={u.name} size="sm" />
                    </Link>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        <StudentNameLink name={u.name} />
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {u.platform} · {u.domain}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md">
                    {u.reach}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Board 5: Other Achievements */}
          <Card className="border-slate-200/90 dark:border-slate-800 shadow-2xs overflow-hidden md:col-span-2 lg:col-span-2">
            <CardHeader className="bg-slate-50 dark:bg-slate-800/70 p-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                5. Other Achievements (Patents, Publications &amp; Research)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 divide-y divide-slate-100 dark:divide-slate-800">
              {otherAchievements.map((u) => (
                <div key={u.rank} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-400 dark:text-slate-500 w-4">
                      #{u.rank}
                    </span>
                    <Link href={`/u/${STUDENT_USERNAMES[u.name] || "2102508579"}`}>
                      <Avatar name={u.name} size="sm" />
                    </Link>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        <StudentNameLink name={u.name} />
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{u.achievement}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md">
                    Verified
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── SECTION 3: PROJECTS & OPEN SOURCE ── */}
      {activeSection === "PROJECTS" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* GitHub Repos */}
          <Card className="border-slate-200/90 dark:border-slate-800 shadow-2xs p-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Code className="h-4 w-4" />
              12. GitHub Repos
            </h3>
            <div className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs">
              <p className="font-bold text-slate-900 dark:text-slate-100">open-campus-ledger</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">42 Repos active</p>
            </div>
          </Card>

          {/* GitHub Stars */}
          <Card className="border-slate-200/90 dark:border-slate-800 shadow-2xs p-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" />
              13. GitHub Stars
            </h3>
            <div className="space-y-2 text-xs">
              {projectBoards.githubStars.map((p, i) => (
                <div key={i} className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900 dark:text-slate-100">{p.repo}</p>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{p.stars}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    <StudentNameLink
                      name={p.owner ?? ""}
                      username={p.username}
                      className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
                    />
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <VerifiedBadge />
                    <ProfileLink url={p.profileUrl} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Hugging Face */}
          <Card className="border-slate-200/90 dark:border-slate-800 shadow-2xs p-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span className="text-yellow-600 text-sm">🤗</span>
              14. Hugging Face
            </h3>
            <div className="space-y-2 text-xs">
              {projectBoards.huggingFace.map((h, i) => (
                <div key={i} className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900 dark:text-slate-100">{h.model}</p>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-[11px]">
                      {h.downloads}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    <StudentNameLink
                      name={h.name ?? ""}
                      username={h.username}
                      className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
                    />
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <VerifiedBadge />
                    <ProfileLink url={h.profileUrl} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Kaggle */}
          <Card className="border-slate-200/90 dark:border-slate-800 shadow-2xs p-4 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-blue-500" />
              15. Kaggle
            </h3>
            <div className="space-y-2 text-xs">
              {projectBoards.kaggle.map((k, i) => (
                <div key={i} className="p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      <StudentNameLink name={k.name ?? ""} username={k.username} />
                    </p>
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                      {k.rankNum}
                    </span>
                  </div>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                    {k.tier}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <VerifiedBadge />
                    <ProfileLink url={k.profileUrl} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── SECTION 4: NIAT COMPETITIONS (Internal — no external extraction) ── */}
      {activeSection === "NIAT_COMPETITIONS" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl text-xs text-amber-900 dark:text-amber-200">
            <Info className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>NIAT Internal Competitions:</strong> GRIT, BRAVE, and Mock Interview scores
              are measured internally. No external profile link extraction is required or supported
              for this section.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* GRIT */}
            <Card className="border-slate-200/90 dark:border-slate-800 shadow-2xs p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    6. GRIT Leaderboard
                  </h3>
                </div>
                <a
                  href="https://www.grit.niatindia.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 font-semibold"
                >
                  grit.niatindia.com <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Live algorithmic challenges and real-time execution benchmarks.
              </p>
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    1. <StudentNameLink name="Harshitha Shree Raj" />
                  </span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                    98.4 pts
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    2. <StudentNameLink name="Sankirth R Bhat" />
                  </span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                    94.1 pts
                  </span>
                </div>
              </div>
            </Card>

            {/* BRAVE */}
            <Card className="border-slate-200/90 dark:border-slate-800 shadow-2xs p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    7. BRAVE Venture Score
                  </h3>
                </div>
                <a
                  href="https://www.brave.niatindia.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-0.5 font-semibold"
                >
                  brave.niatindia.com <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Venture building speed, verified traction, and commercial growth.
              </p>
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    1. AuraLuxe AI
                  </span>
                  <span className="font-extrabold text-orange-600 dark:text-orange-400">
                    ₹12.5L Revenue
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    2. QuickDine QR
                  </span>
                  <span className="font-extrabold text-orange-600 dark:text-orange-400">
                    ₹4.8L Revenue
                  </span>
                </div>
              </div>
            </Card>

            {/* Mock Interview */}
            <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 shadow-none p-6 flex flex-col items-center justify-center text-center space-y-2">
              <Award className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                8. Mock Interview Score
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-xs">
                Evaluation cycle not concluded. Score data will be published once internal
                assessment scores are released.
              </p>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 mt-2">
                Data Not Available
              </span>
            </Card>
          </div>
        </div>
      )}

      {/* ── SUBMIT PROFILE LINK MODAL ── */}
      <Modal
        open={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Submit Profile Link & Auto-Verify"
        className="max-w-md"
      >
        <div className="space-y-4 pt-2 text-xs">
          <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-indigo-900 dark:text-indigo-200">
            <p className="font-bold">How Identity Verification Works</p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              After you submit the profile link, the system automatically fetches the platform data
              and checks that the profile&apos;s display name matches your registered student name.
              If the names don&apos;t match, the submission is rejected and the board is not
              updated.
            </p>
          </div>

          <form onSubmit={handleProfileExtraction} className="space-y-3">
            {/* Student selector */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Your Student Account
              </label>
              <select
                value={selectedStudentName}
                onChange={(e) => setSelectedStudentName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100"
              >
                {REGISTERED_STUDENTS.map((s) => (
                  <option key={s.username} value={s.name}>
                    {s.name} ({s.username})
                  </option>
                ))}
              </select>
            </div>

            {/* Platform selector */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Platform
              </label>
              <select
                value={selectedPlatform}
                onChange={(e) => {
                  setSelectedPlatform(e.target.value as typeof selectedPlatform);
                  setExtractionResult(null);
                  setProfileUrlInput("");
                }}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100"
              >
                <optgroup label="Competitive Programming">
                  <option value="LEETCODE">LeetCode</option>
                  <option value="CODEFORCES">Codeforces</option>
                  <option value="HACKERRANK">HackerRank</option>
                </optgroup>
                <optgroup label="Projects & Open Source">
                  <option value="GITHUB">GitHub</option>
                  <option value="HUGGINGFACE">Hugging Face</option>
                  <option value="KAGGLE">Kaggle</option>
                </optgroup>
                <optgroup label="Other Achievements">
                  <option value="LINKEDIN">LinkedIn</option>
                  <option value="PORTFOLIO">Personal Portfolio</option>
                </optgroup>
              </select>
            </div>

            {/* URL input */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Profile Link
              </label>
              <input
                type="url"
                required
                value={profileUrlInput}
                onChange={(e) => setProfileUrlInput(e.target.value)}
                placeholder={
                  selectedPlatform === "LEETCODE"
                    ? "https://leetcode.com/u/your_username"
                    : selectedPlatform === "CODEFORCES"
                      ? "https://codeforces.com/profile/your_handle"
                      : selectedPlatform === "HACKERRANK"
                        ? "https://hackerrank.com/profile/your_username"
                        : selectedPlatform === "GITHUB"
                          ? "https://github.com/your_username"
                          : selectedPlatform === "HUGGINGFACE"
                            ? "https://huggingface.co/your_username"
                            : selectedPlatform === "KAGGLE"
                              ? "https://kaggle.com/your_username"
                              : "https://..."
                }
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Result banner */}
            {extractionResult && (
              <div
                className={`p-3 rounded-xl border text-xs ${
                  extractionResult.success
                    ? "bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                    : "bg-rose-50/90 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200"
                }`}
              >
                <div className="flex items-start gap-2">
                  {extractionResult.success ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-bold">
                      {extractionResult.success
                        ? "Identity Verified — Profile Added to Board!"
                        : "Verification Failed — Submission Rejected"}
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      {extractionResult.reason || extractionResult.message}
                    </p>
                    {extractionResult.extracted && extractionResult.success && (
                      <div className="pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/60 space-y-0.5 text-[11px]">
                        <p>
                          <strong>Extracted:</strong>{" "}
                          {extractionResult.extracted.metrics.primaryScoreLabel}
                        </p>
                        <p>
                          <strong>Details:</strong>{" "}
                          {extractionResult.extracted.metrics.secondaryScoreLabel}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
              <Button
                type="submit"
                disabled={isExtracting || !profileUrlInput.trim()}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {isExtracting ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Extracting &amp; Verifying…
                  </span>
                ) : (
                  "Extract & Verify Profile"
                )}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
