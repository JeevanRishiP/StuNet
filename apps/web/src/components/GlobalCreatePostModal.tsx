"use client";

import { useState } from "react";
import { Send, Globe, Users, Shield, Tag, GraduationCap, Building2, Award } from "lucide-react";
import { Button, Modal } from "@stunet/ui";

interface GlobalCreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
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
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetScope, setTargetScope] = useState<"ALL" | "CONNECTED">("ALL");
  const [targetRoles, setTargetRoles] = useState<string[]>(["STUDENT", "FACULTY", "ALUMNI"]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
          isAnonymous,
          tags: tagsArray,
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

        {/* Target User: All or Connected Only */}
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1.5">Target User</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTargetScope("ALL")}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all flex items-center justify-center gap-1.5 ${
                targetScope === "ALL"
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
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
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Connected Only</span>
            </button>
          </div>
        </div>

        {/* Target Roles: Students or Faculty or Alumni */}
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1.5">
            Target Roles{" "}
            <span className="font-normal text-slate-500">(Who can view this post)</span>
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
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title / Subject */}
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1">Title / Subject</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Study Group Session, Project Collaboration, Campus Update"
            className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
          />
        </div>

        {/* Content */}
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1">Content</label>
          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              isAnonymous
                ? "Writing anonymously — your name and avatar will be hidden, and your post will be labeled generically..."
                : "Share details, requirements, questions, or updates with your community..."
            }
            className="w-full p-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
          />
        </div>

        {/* Tags with Trending Suggestions */}
        <div>
          <label className="text-xs font-bold text-slate-800 block mb-1 flex items-center gap-1">
            <Tag className="h-3 w-3 text-slate-500" />
            <span>Tags</span>
            <span className="font-normal text-slate-500">(comma or space separated)</span>
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="#ai #placement #webdev"
            className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
          />

          {/* Trending Suggestions */}
          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            <span className="text-[10px] text-slate-400 font-semibold">Trending tags:</span>
            {TRENDING_TAG_SUGGESTIONS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleAddTagSuggestion(tag)}
                className="text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 px-2 py-0.5 rounded-full transition-colors font-mono"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Anonymity Checkbox */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="h-4 w-4 text-indigo-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-800">Anonymous Post</p>
              <p className="text-[11px] text-slate-500">
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
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
