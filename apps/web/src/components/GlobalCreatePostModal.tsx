"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Send,
  Globe,
  Users,
  Shield,
  Tag,
  GraduationCap,
  Building2,
  Award,
  Rocket,
  Code2,
} from "lucide-react";
import { Button, Modal } from "@stunet/ui";

interface GlobalCreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

interface InitiativeOption {
  id: string;
  name: string;
  role?: string;
  type: "company" | "project";
}

const TRENDING_TAG_SUGGESTIONS = [
  "ai",
  "placement",
  "webdev",
  "nxtwave",
  "project",
  "internship",
  "research",
  "study",
];

export default function GlobalCreatePostModal({
  isOpen,
  onClose,
  onPostCreated,
}: GlobalCreatePostModalProps) {
  const { data: session } = useSession();
  const isGuest = !session?.user || Boolean(session.user.isGuest || session.user.role === "GUEST");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetScope, setTargetScope] = useState<"ALL" | "CONNECTED">("ALL");
  const [targetRoles, setTargetRoles] = useState<string[]>(["STUDENT", "FACULTY", "ALUMNI"]);
  const [batch, setBatch] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initiatives user can post on behalf of
  const [initiativeOptions, setInitiativeOptions] = useState<InitiativeOption[]>([]);
  const [postAs, setPostAs] = useState<string>("PERSONAL");

  useEffect(() => {
    if (isOpen && !isGuest) {
      fetch("/api/initiatives/user-roles")
        .then((res) => (res.ok ? res.json() : { companies: [], projects: [] }))
        .then((data) => {
          const options: InitiativeOption[] = [];
          if (Array.isArray(data.companies)) {
            for (const c of data.companies) {
              options.push({
                id: c.id,
                name: c.name,
                role: c.role === "FOUNDER" ? "Founder" : "Co-Founder",
                type: "company",
              });
            }
          }
          if (Array.isArray(data.projects)) {
            for (const p of data.projects) {
              options.push({
                id: p.id,
                name: p.name,
                role: "Maintainer",
                type: "project",
              });
            }
          }
          setInitiativeOptions(options);
        })
        .catch(() => {});
    }
  }, [isOpen, isGuest]);

  if (!isOpen || isGuest) return null;

  function handleAddTagSuggestion(tag: string) {
    const formatted = `#${tag}`;
    if (!tagsInput.includes(formatted)) {
      setTagsInput((prev) => (prev ? `${prev} ${formatted}` : formatted));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && !title.trim()) return;

    setPosting(true);
    setError(null);

    const tagsArray = tagsInput
      .split(/[\s,#]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const fullBody = title.trim() ? `# ${title.trim()}\n\n${content.trim()}` : content.trim();

    let companyId: string | undefined = undefined;
    let openSourceProjectId: string | undefined = undefined;

    if (postAs.startsWith("company-")) {
      companyId = postAs.replace("company-", "");
    } else if (postAs.startsWith("project-")) {
      openSourceProjectId = postAs.replace("project-", "");
    }

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: fullBody,
          visibility: targetScope === "CONNECTED" ? "CONNECTIONS" : "PUBLIC",
          type: "TEXT",
          targetConnectionScope: targetScope,
          targetRoles,
          batch: batch.trim() || undefined,
          isAnonymous: companyId || openSourceProjectId ? false : isAnonymous,
          tags: tagsArray,
          companyId,
          openSourceProjectId,
        }),
      });

      if (res.status === 429) {
        setError("You are posting too quickly. Please wait a moment.");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to publish post. Please try again.");
        return;
      }

      setTitle("");
      setContent("");
      setTagsInput("");
      setIsAnonymous(false);
      setTargetRoles(["STUDENT", "FACULTY", "ALUMNI"]);
      setTargetScope("ALL");
      setPostAs("PERSONAL");
      onClose();
      if (onPostCreated) onPostCreated();
    } catch {
      setError("Network error while publishing post.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="New Post Form" className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        {/* Post As: Personal vs Company vs Open Source Project */}
        {initiativeOptions.length > 0 && (
          <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5 flex items-center gap-1.5">
              <Rocket className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Post Identity (Post As)</span>
            </label>
            <select
              value={postAs}
              onChange={(e) => setPostAs(e.target.value)}
              className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 dark:text-slate-100"
            >
              <option value="PERSONAL">👤 Personal ({session?.user?.name ?? "Myself"})</option>
              {initiativeOptions.map((opt) => (
                <option key={`${opt.type}-${opt.id}`} value={`${opt.type}-${opt.id}`}>
                  {opt.type === "company" ? "🏢 Startup: " : "💻 Open Source: "}
                  {opt.name} ({opt.role})
                </option>
              ))}
            </select>
            {postAs !== "PERSONAL" && (
              <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium mt-1.5">
                Posting as verified initiative. This post will carry the entity badge and be boosted
                to followers.
              </p>
            )}
          </div>
        )}

        {/* Target User: All or Connected Only */}
        <div>
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
            Target User
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTargetScope("ALL")}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all flex items-center justify-center gap-1.5 ${
                targetScope === "ALL"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750"
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>All Users</span>
            </button>
            <button
              type="button"
              onClick={() => setTargetScope("CONNECTED")}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all flex items-center justify-center gap-1.5 ${
                targetScope === "CONNECTED"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Connected Only</span>
            </button>
          </div>
        </div>

        {/* Target Roles: Students or Faculty or Alumni */}
        <div>
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
            Target Roles{" "}
            <span className="font-normal text-slate-500 dark:text-slate-400">
              (Who can view this post)
            </span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { role: "STUDENT", label: "Students", icon: GraduationCap },
              { role: "FACULTY", label: "Faculty", icon: Building2 },
              { role: "ALUMNI", label: "Alumni", icon: Award },
            ].map((r) => {
              const isSelected = targetRoles.includes(r.role);
              const Icon = r.icon;
              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      if (targetRoles.length > 1) {
                        setTargetRoles(targetRoles.filter((x) => x !== r.role));
                      }
                    } else {
                      setTargetRoles([...targetRoles, r.role]);
                    }
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? "bg-slate-900 dark:bg-indigo-600 text-white border-slate-900 dark:border-indigo-600 shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
            {targetScope === "ALL" && targetRoles.length === 3
              ? "Visible to Students, Faculty, Alumni, and public Guests."
              : "Private audience: Only visible to the selected role(s) and scope (hidden from Guests and unselected roles)."}
          </p>
        </div>

        {/* Title / Subject */}
        <div>
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
            Title / Subject
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Study Group Session, Project Collaboration, Campus Update"
            className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Batch */}
        <div>
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
            Batch (Optional)
          </label>
          <input
            type="text"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            placeholder="e.g. 2024, Batch 2024 (leave blank for your default batch)"
            className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Content */}
        <div>
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
            Content
          </label>
          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              isAnonymous
                ? "Writing anonymously — your name and avatar will be hidden, and your post will be labeled generically..."
                : "Share details, requirements, questions, or updates with your community..."
            }
            className="w-full p-3 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Tags with Trending Suggestions */}
        <div>
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1 flex items-center gap-1">
            <Tag className="h-3 w-3 text-slate-500 dark:text-slate-400" />
            <span>Tags</span>
            <span className="font-normal text-slate-500 dark:text-slate-400">
              (comma or space separated)
            </span>
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="#ai #placement #webdev"
            className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-900 dark:text-slate-100"
          />

          {/* Trending Suggestions */}
          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
              Trending tags:
            </span>
            {TRENDING_TAG_SUGGESTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleAddTagSuggestion(tag)}
                className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full transition-colors font-mono"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Anonymity Checkbox */}
        {postAs === "PERSONAL" && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Anonymous Post
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Just labels as Student or Alumni or Faculty in post instead of your name.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={posting}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={posting || (!content.trim() && !title.trim())}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 px-4"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{posting ? "Publishing…" : "Publish Post"}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
