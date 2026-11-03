"use client";

import { useState } from "react";
import { Send, Globe, Users, School } from "lucide-react";
import { Button, Modal } from "@stunet/ui";

interface GlobalCreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

export default function GlobalCreatePostModal({
  isOpen,
  onClose,
  onPostCreated,
}: GlobalCreatePostModalProps) {
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<"GENERAL" | "HACKATHON" | "PROJECT">("GENERAL");
  const [visibility, setVisibility] = useState<"PUBLIC" | "CONNECTIONS" | "CAMPUS">("PUBLIC");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setPosting(true);
    setError(null);

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: content.trim(),
          visibility,
          type: "TEXT",
          category,
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

      setContent("");
      onClose();
      if (onPostCreated) onPostCreated();
    } catch {
      setError("Network error while publishing post.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Create New Post" className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        {/* Purpose / Category Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1.5">Post Category</label>
          <div className="flex items-center gap-2">
            {[
              { id: "GENERAL" as const, label: "General Discussion" },
              { id: "HACKATHON" as const, label: "Hackathon / Competition" },
              { id: "PROJECT" as const, label: "Project & Collaboration" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  category === cat.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visibility Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1.5">
            Audience Visibility
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "PUBLIC" as const, label: "Everyone (Public)", icon: Globe },
              { id: "CAMPUS" as const, label: "My Campus Only", icon: School },
              { id: "CONNECTIONS" as const, label: "Connected Only", icon: Users },
            ].map((vis) => {
              const Icon = vis.icon;
              return (
                <button
                  key={vis.id}
                  type="button"
                  onClick={() => setVisibility(vis.id)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                    visibility === vis.id
                      ? "border-indigo-600 bg-indigo-50/60 text-indigo-700 font-semibold shadow-xs"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4 mb-1" />
                  <span className="text-[11px] leading-tight">{vis.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Text Input */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1.5">Post Content</label>
          <textarea
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's happening on campus? Share opportunities, hackathons, or project milestones…"
            className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
          />
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
            disabled={posting || !content.trim()}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{posting ? "Publishing…" : "Post"}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
