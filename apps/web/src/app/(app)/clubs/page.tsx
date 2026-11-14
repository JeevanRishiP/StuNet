"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Compass, Building2, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@stunet/ui";

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

interface OfficialClubBase {
  slug: string;
  name: string;
  tagline: string;
  category: string;
  gradient: string;
}

const OFFICIAL_CLUBS: OfficialClubBase[] = [
  {
    slug: "nsgc",
    name: "NSGC (NxtWave Student General Council)",
    tagline: "The central student governing body representing student voice and campus governance.",
    category: "Governance & Leadership",
    gradient: "from-indigo-600 via-indigo-700 to-purple-800",
  },
  {
    slug: "advanced-tech",
    name: "Advanced Tech Club",
    tagline:
      "Systems programming, distributed computing, cloud architectures and open-source tooling.",
    category: "Technology",
    gradient: "from-blue-600 to-cyan-700",
  },
  {
    slug: "arts",
    name: "Arts Club",
    tagline:
      "Visual arts, digital design, photography, theatrical performances and creative expressions.",
    category: "Cultural & Creative",
    gradient: "from-purple-600 to-pink-600",
  },
  {
    slug: "sports",
    name: "Sports Club",
    tagline:
      "Campus sports leagues, competitive esports tournaments, athletic meets and fitness drives.",
    category: "Athletics",
    gradient: "from-emerald-600 to-teal-700",
  },
  {
    slug: "edu",
    name: "EDU Club (Entrepreneur Club)",
    tagline:
      "Venture incubation, founder speaker sessions, pitch deck roasts and seed grant preparation.",
    category: "Entrepreneurship",
    gradient: "from-amber-600 to-orange-700",
  },
  {
    slug: "gen-ai",
    name: "Gen AI Club",
    tagline:
      "LLM fine-tuning, autonomous agents, diffusion models, and generative computing hackathons.",
    category: "Artificial Intelligence",
    gradient: "from-violet-600 to-indigo-800",
  },
  {
    slug: "media",
    name: "Media Club",
    tagline:
      "Campus newsletter journalism, podcast production, video documentaries and public relations.",
    category: "Media & Journalism",
    gradient: "from-rose-600 to-pink-700",
  },
];

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

function ClubsPageContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const isGuest = Boolean(session?.user?.isGuest || session?.user?.role === "GUEST");

  const [campuses, setCampuses] = useState<CampusItem[]>([DEFAULT_SVYASA_CAMPUS]);
  const [selectedCampus, setSelectedCampus] = useState<CampusItem>(DEFAULT_SVYASA_CAMPUS);

  // Fetch all campuses from API
  useEffect(() => {
    async function fetchCampuses() {
      try {
        const res = await fetch("/api/campuses");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.campuses) && data.campuses.length > 0) {
            setCampuses(data.campuses);

            // Select campus from URL ?campus= if present, else user's campus or S-VYASA default
            const urlCampusSlug = searchParams.get("campus");
            let initialCampus = DEFAULT_SVYASA_CAMPUS;

            if (urlCampusSlug) {
              const fromUrl = data.campuses.find(
                (c: CampusItem) => c.slug === urlCampusSlug || c.id === urlCampusSlug,
              );
              if (fromUrl) initialCampus = fromUrl;
            } else if (!isGuest && session?.user?.campusId) {
              const fromUser = data.campuses.find(
                (c: CampusItem) => c.id === session.user.campusId,
              );
              if (fromUser) initialCampus = fromUser;
            } else {
              const svyasa = data.campuses.find(
                (c: CampusItem) => c.slug === "niat-s-vyasa-bangalore",
              );
              if (svyasa) initialCampus = svyasa;
            }

            setSelectedCampus(initialCampus);
          }
        }
      } catch {
        // fallback to default
      }
    }
    void fetchCampuses();
  }, [searchParams, isGuest, session?.user?.campusId]);

  // Handler when college is changed in filter
  function handleCampusChange(campusIdOrSlug: string) {
    const match = campuses.find((c) => c.id === campusIdOrSlug || c.slug === campusIdOrSlug);
    if (!match) return;

    setSelectedCampus(match);

    // Update URL query parameter without full reload so page state is shareable & persistent
    const url = new URL(window.location.href);
    url.searchParams.set("campus", match.slug);
    window.history.replaceState({}, "", url.toString());
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Banner with Simple College / Campus Selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-sm">
              <Compass className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              NIAT Official Clubs
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Every campus hosts all 7 official NIAT clubs. Showing active campus leadership and
            activities.
          </p>
        </div>

        {/* ── SIMPLE COLLEGE LIST FILTER (Used for Both Guest and Authenticated Users) ── */}
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <div className="relative flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/90 dark:hover:bg-slate-700/90 border border-slate-200/90 dark:border-slate-700 hover:border-indigo-400 rounded-2xl px-3.5 py-2 shadow-2xs transition-all">
            <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="flex flex-col text-left">
              <label
                htmlFor="simple-college-select"
                className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400 cursor-pointer"
              >
                Select College / Campus
              </label>
              <div className="relative flex items-center">
                <select
                  id="simple-college-select"
                  value={selectedCampus.id}
                  onChange={(e) => handleCampusChange(e.target.value)}
                  className="appearance-none bg-transparent text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer pr-6 max-w-[240px] sm:max-w-[320px] truncate"
                >
                  {campuses.map((camp) => (
                    <option
                      key={camp.id}
                      value={camp.id}
                      className="text-slate-900 dark:text-slate-100 dark:bg-slate-800 font-semibold py-1"
                    >
                      {camp.name} ({camp.city})
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 pointer-events-none absolute right-0 shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 7 Official Clubs Bento Grid — Fully dynamic to selected college */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {OFFICIAL_CLUBS.map((club) => {
          const president = getClubPresidentForCampus(club.slug, selectedCampus);

          return (
            <Link
              key={club.slug}
              href={`/clubs/${club.slug}?campus=${selectedCampus.slug}` as Route}
              className="group block h-full"
            >
              <Card className="overflow-hidden border-slate-200/90 dark:border-slate-800 dark:bg-slate-900 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 h-full flex flex-col justify-between rounded-3xl">
                {/* Banner Header with Gradient */}
                <div
                  className={`h-24 bg-gradient-to-r ${club.gradient} relative flex items-end p-3.5`}
                >
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:8px_8px]" />
                  <span className="relative z-10 rounded-full bg-black/40 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                    {club.category}
                  </span>
                </div>

                <CardContent className="p-5 pt-3 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {club.name}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                      {club.tagline}
                    </p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block">
                        President
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {president.name}
                      </span>
                    </div>

                    <div className="pt-1.5 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 dark:text-slate-500 font-medium">Campus</span>
                      <span
                        className="font-bold text-indigo-600 dark:text-indigo-400 truncate max-w-[220px]"
                        title={selectedCampus.name}
                      >
                        {selectedCampus.name}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function ClubsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto p-6 text-slate-400 text-xs">Loading campus clubs…</div>
      }
    >
      <ClubsPageContent />
    </Suspense>
  );
}
