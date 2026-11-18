"use client";

import React from "react";
import Link from "next/link";
import { Avatar } from "@stunet/ui";

export interface FollowPersonItem {
  id: string;
  userId: string;
  name: string;
  username: string;
  headline?: string;
  avatarUrl?: string;
  campus?: string;
}

export interface FollowListsTabProps {
  type: "FOLLOWING" | "FOLLOWERS";
  list: FollowPersonItem[];
  followingIdSet?: Set<string>;
  onToggleFollow: (userId: string, currentlyFollowing: boolean) => Promise<void>;
  onClose: () => void;
}

export function FollowListsTab({
  type,
  list,
  followingIdSet,
  onToggleFollow,
  onClose,
}: FollowListsTabProps) {
  if (type === "FOLLOWING") {
    return (
      <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
        {list.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-500">
            <p className="font-semibold text-slate-600 dark:text-slate-300">
              Not following anyone yet
            </p>
            <p className="text-[11px] mt-1">
              Follow classmates, faculty, or alumni to curate your feed by interest without needing
              two-way approval.
            </p>
          </div>
        ) : (
          list.map((member) => (
            <div key={member.id} className="py-3 flex items-center justify-between gap-3">
              <Link
                href={`/u/${member.username}`}
                onClick={onClose}
                className="flex items-center gap-3 min-w-0 flex-1"
              >
                <Avatar name={member.name} src={member.avatarUrl} size="md" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate hover:underline">
                    {member.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    @{member.username} • {member.campus}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => onToggleFollow(member.userId, true)}
                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
              >
                Unfollow
              </button>
            </div>
          ))
        )}
      </div>
    );
  }

  // type === "FOLLOWERS"
  return (
    <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
      {list.length === 0 ? (
        <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-500">
          No followers yet.
        </div>
      ) : (
        list.map((member) => {
          const amFollowing = followingIdSet ? followingIdSet.has(member.userId) : false;
          return (
            <div key={member.id} className="py-3 flex items-center justify-between gap-3">
              <Link
                href={`/u/${member.username}`}
                onClick={onClose}
                className="flex items-center gap-3 min-w-0 flex-1"
              >
                <Avatar name={member.name} src={member.avatarUrl} size="md" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate hover:underline">
                    {member.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    @{member.username} • {member.campus}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => onToggleFollow(member.userId, amFollowing)}
                className={`px-3 py-1 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer ${
                  amFollowing
                    ? "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300"
                    : "bg-white dark:bg-slate-800 border-sky-600 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40"
                }`}
              >
                {amFollowing ? "Following" : "+ Follow back"}
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
