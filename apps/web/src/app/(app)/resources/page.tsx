"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Code,
  FileText,
  Newspaper,
  Plus,
  ExternalLink,
  Search,
  Bookmark,
} from "lucide-react";
import { Button, Card, Modal } from "@stunet/ui";

interface ResourceItem {
  id: string;
  category: "GITHUB_REPO" | "BLOG" | "RESEARCH_PAPER" | "NEWS_ARTICLE";
  title: string;
  url?: string | null;
  description?: string | null;
  createdAt: string;
  creator: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
    role: string;
  };
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<
    "ALL" | "GITHUB_REPO" | "BLOG" | "RESEARCH_PAPER" | "NEWS_ARTICLE"
  >("ALL");

  // Create Resource Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<
    "GITHUB_REPO" | "BLOG" | "RESEARCH_PAPER" | "NEWS_ARTICLE"
  >("GITHUB_REPO");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetchResources();
  }, [activeCategory, search]);

  async function fetchResources() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeCategory !== "ALL") params.append("category", activeCategory);
      if (search.trim()) params.append("search", search.trim());
      const res = await fetch(`/api/resources?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setResources(data.items ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch resources", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateResource(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          url: url.trim() || undefined,
          description: description.trim() || undefined,
        }),
      });

      if (res.ok) {
        setCreateModalOpen(false);
        setTitle("");
        setUrl("");
        setDescription("");
        fetchResources();
      } else {
        const d = await res.json();
        setFormError(d.error ?? "Failed to publish resource.");
      }
    } catch {
      setFormError("Network error publishing resource.");
    } finally {
      setSubmitting(false);
    }
  }

  const categoryMeta: Record<
    string,
    {
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      color: string;
      bg: string;
      border: string;
    }
  > = {
    GITHUB_REPO: {
      label: "GitHub Repos",
      icon: Code,
      color: "text-slate-900",
      bg: "bg-slate-100",
      border: "border-slate-300",
    },
    BLOG: {
      label: "Engineering Blogs",
      icon: FileText,
      color: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-200",
    },
    RESEARCH_PAPER: {
      label: "Research Papers",
      icon: BookOpen,
      color: "text-purple-700",
      bg: "bg-purple-50",
      border: "border-purple-200",
    },
    NEWS_ARTICLE: {
      label: "News & Articles",
      icon: Newspaper,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    },
  };

  return (
    <div className="max-w-[935px] mx-auto px-4 py-6 space-y-5">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Useful Resources</h1>
              <p className="text-xs text-slate-500">
                Curated technical repositories, system architecture blogs, research papers, and
                news.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-2xs shrink-0 self-start sm:self-auto font-bold py-2.5 px-4"
        >
          <Plus className="h-4 w-4" />
          <span>+ Add Resource</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs text-xs">
        {/* Categories */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {(["ALL", "GITHUB_REPO", "BLOG", "RESEARCH_PAPER", "NEWS_ARTICLE"] as const).map(
            (cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full font-bold transition-all whitespace-nowrap ${
                  activeCategory === cat
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat === "ALL" ? "All Resources" : (categoryMeta[cat]?.label ?? cat)}
              </button>
            ),
          )}
        </div>

        {/* Search Input */}
        <div className="relative shrink-0 sm:w-64">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles, repos…"
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
          />
        </div>
      </div>

      {/* Resources Feed */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading resources…</div>
      ) : resources.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-2">
          <Bookmark className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-800">No resources found in this category</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Share an insightful paper, open-source library, or engineering blog with fellow
            students.
          </p>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white mt-3"
          >
            Add the First Resource
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((item) => {
            const meta = categoryMeta[item.category] ?? {
              label: item.category,
              icon: BookOpen,
              color: "text-slate-700",
              bg: "bg-slate-50",
              border: "border-slate-200",
            };
            const Icon = meta.icon;

            return (
              <Card
                key={item.id}
                className="border-slate-200/90 shadow-2xs p-5 space-y-3 hover:border-slate-300 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${meta.bg} ${meta.color} ${meta.border}`}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{meta.label}</span>
                    </span>

                    <span className="text-[11px] text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-emerald-600 hover:underline inline-flex items-center gap-1.5"
                      >
                        <span>{item.title}</span>
                        <ExternalLink className="h-3.5 w-3.5 opacity-60 shrink-0" />
                      </a>
                    ) : (
                      item.title
                    )}
                  </h3>

                  {item.description && (
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-[10px] font-bold">
                      {item.creator.avatarUrl ? (
                        <img
                          src={item.creator.avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        item.creator.displayName[0]
                      )}
                    </div>
                    <span className="font-medium text-slate-600">{item.creator.displayName}</span>
                  </div>

                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <span>Read Resource</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Resource Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add Useful Resource"
        className="max-w-md"
      >
        <form onSubmit={handleCreateResource} className="space-y-3.5 pt-2 text-xs">
          {formError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium">
              {formError}
            </div>
          )}

          <div>
            <label className="font-bold text-slate-700 block mb-1">Title / Headline</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Designing Data-Intensive Applications Summary"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Category</label>
            <select
              value={category}
              onChange={(e) =>
                setCategory(
                  e.target.value as "GITHUB_REPO" | "BLOG" | "RESEARCH_PAPER" | "NEWS_ARTICLE",
                )
              }
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
            >
              <option value="GITHUB_REPO">GitHub Repository</option>
              <option value="BLOG">Engineering Blog</option>
              <option value="RESEARCH_PAPER">Research Paper</option>
              <option value="NEWS_ARTICLE">News & Announcement Article</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Resource URL (optional)</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why is this resource valuable? Key takeaways or chapters…"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {submitting ? "Publishing…" : "Publish Resource"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
