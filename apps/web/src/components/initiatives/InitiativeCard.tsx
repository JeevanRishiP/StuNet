"use client";

import React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Building2, Code2, ChevronRight } from "lucide-react";

export interface InitiativeItemData {
  id: string;
  name: string;
  tagline?: string | null;
  logoUrl?: string | null;
  stage?: string;
  verifiedRevenue?: number;
  isRevenueVerified?: boolean;
  githubUrl?: string;
  starsCount?: number;
  primaryLanguage?: string | null;
  followersCount?: number;
  postsCount?: number;
  type: "company" | "project";
  founder?: {
    id?: string;
    displayName: string | null;
    username: string | null;
    avatarUrl?: string | null;
    role?: string;
  } | null;
}

export interface InitiativeCardProps {
  item: InitiativeItemData;
  rankIndex?: number;
  variant?: "ranking" | "network" | "compact";
}

export function InitiativeCard({ item, rankIndex, variant = "ranking" }: InitiativeCardProps) {
  const isComp = item.type === "company";
  const itemUrl = isComp ? `/initiatives/companies/${item.id}` : `/initiatives/projects/${item.id}`;

  return (
    <Link
      href={itemUrl as Route}
      className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs transition-colors group"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {typeof rankIndex === "number" && (
          <span className="text-[10px] font-black text-slate-400 font-mono w-4">
            #{rankIndex + 1}
          </span>
        )}
        <div className="h-8 w-8 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
          {item.logoUrl ? (
            <img src={item.logoUrl} alt={item.name} className="h-full w-full object-cover" />
          ) : isComp ? (
            <Building2 className="h-4 w-4 text-indigo-600" />
          ) : (
            <Code2 className="h-4 w-4 text-emerald-600" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors truncate max-w-[140px]">
              {item.name}
            </span>
            <span
              className={`text-[8px] font-bold px-1 rounded-sm ${
                isComp
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              }`}
            >
              {isComp ? "Co" : "Pr"}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
            {variant === "network"
              ? item.founder
                ? `By @${item.founder.username}`
                : "Campus Venture"
              : isComp
                ? item.isRevenueVerified
                  ? `₹ ${(item.verifiedRevenue || 0).toLocaleString()} / yr`
                  : item.stage || "Startup"
                : `${item.starsCount || 0} ⭐ • ${item.primaryLanguage || "Open Source"}`}
          </p>
        </div>
      </div>

      {variant === "network" ? (
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
      ) : (
        <div className="text-right shrink-0">
          <span className="text-[10px] font-bold text-slate-500">
            {item.followersCount || 0} follows
          </span>
        </div>
      )}
    </Link>
  );
}
