"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, X, Users, Compass, FileText, ArrowRight, Sparkles } from "lucide-react";
import { Avatar } from "@stunet/ui";

interface SearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchDrawer({ isOpen, onClose }: SearchDrawerProps) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "PEOPLE" | "POSTS" | "CLUBS">("ALL");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    users: Array<{
      id: string;
      name: string;
      username: string;
      avatarUrl?: string;
      headline?: string;
      campus?: string;
    }>;
    posts: Array<{ id: string; body: string; authorName: string; createdAt: string }>;
    clubs: Array<{ id: string; name: string; slug: string; memberCount: number }>;
  }>({ users: [], posts: [], clubs: [] });

  useEffect(() => {
    if (!query.trim()) {
      setResults({ users: [], posts: [], clubs: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // Fast mock search response with real data patterns
        const mockUsers = [
          {
            id: "alice-1",
            name: "Alice Nair",
            username: "alice_dev",
            headline: "President • NSC | Fullstack Builder",
            campus: "S-VYASA Bengaluru",
          },
          {
            id: "bob-1",
            name: "Bob Krishnan",
            username: "bob_designs",
            headline: "Creative Lead • Gen AI Club",
            campus: "S-VYASA Bengaluru",
          },
          {
            id: "dave-1",
            name: "Dave Patel",
            username: "dave_ml",
            headline: "AI Researcher | Kaggle Grandmaster",
            campus: "Whitefield Tech Hub",
          },
        ].filter(
          (u) =>
            u.name.toLowerCase().includes(query.toLowerCase()) ||
            u.username.toLowerCase().includes(query.toLowerCase()) ||
            u.headline.toLowerCase().includes(query.toLowerCase()),
        );

        const mockClubs = [
          { id: "c-nsgc", name: "NSGC (NxtWave Student Council)", slug: "nsgc", memberCount: 142 },
          { id: "c-ai", name: "Gen AI & ML Club", slug: "gen-ai", memberCount: 230 },
          { id: "c-tech", name: "Advanced Tech Chapter", slug: "advanced-tech", memberCount: 185 },
          { id: "c-arts", name: "Arts & Cultural Guild", slug: "arts", memberCount: 94 },
        ].filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

        setResults({
          users: mockUsers,
          posts: [
            {
              id: "p-1",
              body: "Anyone looking for a frontend developer for the upcoming Hackathon?",
              authorName: "Alice Nair",
              createdAt: "2h ago",
            },
          ].filter((p) => p.body.toLowerCase().includes(query.toLowerCase())),
          clubs: mockClubs,
        });
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 lg:z-30 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 bottom-0 left-0 lg:left-[72px] w-full max-w-sm sm:w-[380px] bg-white border-r border-slate-200 z-50 flex flex-col shadow-2xl transition-transform duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Search className="h-5 w-5 text-indigo-600" />
            <span>Search Platform</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students, skills, clubs, posts…"
              className="w-full pl-9 pr-8 py-2 bg-slate-100 text-slate-900 placeholder-slate-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white border border-transparent focus:border-indigo-500 transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 text-xs">
            {(["ALL", "PEOPLE", "CLUBS", "POSTS"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-full font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab === "ALL"
                  ? "All"
                  : tab === "PEOPLE"
                    ? "Students"
                    : tab === "CLUBS"
                      ? "Clubs"
                      : "Posts"}
              </button>
            ))}
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
              Searching directory…
            </div>
          )}

          {!loading && !query && (
            <div className="py-12 text-center text-slate-400">
              <Sparkles className="h-8 w-8 mx-auto text-indigo-300 mb-2" />
              <p className="text-xs font-medium text-slate-600">Discover StuNet Campus</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Type names like &ldquo;Alice&rdquo;, clubs like &ldquo;AI&rdquo;, or topics
              </p>
            </div>
          )}

          {!loading &&
            query &&
            results.users.length === 0 &&
            results.clubs.length === 0 &&
            results.posts.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                No results found for &ldquo;{query}&rdquo;
              </div>
            )}

          {/* Students Section */}
          {(activeTab === "ALL" || activeTab === "PEOPLE") && results.users.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span>Students</span>
              </div>
              <div className="space-y-1">
                {results.users.map((u) => (
                  <Link
                    key={u.id}
                    href={`/u/${u.username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <Avatar src={u.avatarUrl} name={u.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 truncate">
                          {u.name}
                        </p>
                        <span className="text-[10px] text-slate-400 truncate ml-1">{u.campus}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">@{u.username}</p>
                      {u.headline && (
                        <p className="text-[10px] text-indigo-600 truncate font-medium mt-0.5">
                          {u.headline}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Clubs Section */}
          {(activeTab === "ALL" || activeTab === "CLUBS") && results.clubs.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Compass className="h-3.5 w-3.5" />
                <span>Clubs & Chapters</span>
              </div>
              <div className="space-y-1">
                {results.clubs.map((c) => (
                  <Link
                    key={c.id}
                    href={`/clubs/${c.slug}`}
                    onClick={onClose}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600">
                        {c.name}
                      </p>
                      <p className="text-[10px] text-slate-400">{c.memberCount} Members</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-600" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Posts Section */}
          {(activeTab === "ALL" || activeTab === "POSTS") && results.posts.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                <span>Posts</span>
              </div>
              <div className="space-y-1.5">
                {results.posts.map((p) => (
                  <Link
                    key={p.id}
                    href="/"
                    onClick={onClose}
                    className="block p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 transition-colors"
                  >
                    <p className="text-xs text-slate-800 line-clamp-2">{p.body}</p>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                      <span>{p.authorName}</span>
                      <span>{p.createdAt}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
