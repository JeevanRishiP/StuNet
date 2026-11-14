"use client";

import Link from "next/link";
import type { Route } from "next";
import { Clock, Flag } from "lucide-react";
import { Avatar } from "@stunet/ui";

interface PollCreatorHeaderProps {
  authorName: string;
  authorUsername?: string | null;
  authorAvatarUrl?: string | null;
  authorRole?: string;
  authorCampus?: { id?: string; name?: string } | null;
  createdAt?: string;
  isAnonymous?: boolean;
  rightBadge?: React.ReactNode;
  onReport?: () => void;
  className?: string;
}

function formatTimeAgo(isoString?: string) {
  if (!isoString) return "Recently";
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(isoString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

export default function PollCreatorHeader({
  authorName,
  authorUsername,
  authorAvatarUrl,
  authorRole = "STUDENT",
  authorCampus,
  createdAt,
  isAnonymous = false,
  rightBadge,
  onReport,
  className = "",
}: PollCreatorHeaderProps) {
  const profileHref =
    isAnonymous || !authorUsername ? ("#" as Route) : (`/u/${authorUsername}` as Route);

  const roleLabel =
    authorRole === "FACULTY"
      ? "Faculty"
      : authorRole === "ALUMNI"
        ? "Alumni"
        : authorRole === "CAMPUS_MANAGER" || authorRole === "SUPER_ADMIN"
          ? "Campus Admin"
          : "Student";

  return (
    <div
      className={`flex items-start justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800/80 ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Link href={profileHref} className="shrink-0">
          <Avatar src={isAnonymous ? null : authorAvatarUrl} name={authorName} size="sm" />
        </Link>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={profileHref}
              className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate"
            >
              {authorName}
            </Link>

            <span className="text-[9px] font-semibold px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {roleLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
            {!isAnonymous && authorUsername && <span>@{authorUsername}</span>}
            {!isAnonymous && authorCampus?.name && (
              <>
                <span>•</span>
                <span className="truncate max-w-[130px]">{authorCampus.name}</span>
              </>
            )}
            {createdAt && (
              <>
                <span>•</span>
                <span className="flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5 text-slate-400" />
                  {formatTimeAgo(createdAt)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {rightBadge}
        {onReport && (
          <button
            type="button"
            onClick={onReport}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            title="Report this poll"
          >
            <Flag className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
