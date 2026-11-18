"use client";

import React from "react";
import Link from "next/link";
import { Search, UserMinus } from "lucide-react";
import { Avatar } from "@stunet/ui";
import type { ConnectionItem } from "../types";

export interface ConnectionsSearchTabProps {
  connections: ConnectionItem[];
  searchQuery: string;
  onChangeSearchQuery: (query: string) => void;
  removingConnId: string | null;
  onRemoveConnection: (id: string, name?: string) => Promise<void>;
  onClose: () => void;
}

export function ConnectionsSearchTab({
  connections,
  searchQuery,
  onChangeSearchQuery,
  removingConnId,
  onRemoveConnection,
  onClose,
}: ConnectionsSearchTabProps) {
  const filteredConnections = connections.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.headline && c.headline.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onChangeSearchQuery(e.target.value)}
          placeholder="Search connected members by name, headline, or username…"
          className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none"
        />
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
        {filteredConnections.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
            No connected members found matching &ldquo;{searchQuery}&rdquo;
          </div>
        ) : (
          filteredConnections.map((user) => (
            <div
              key={user.id}
              className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 rounded-xl transition-colors"
            >
              <Link
                href={`/u/${user.username}`}
                onClick={onClose}
                className="flex items-center gap-3 min-w-0 flex-1 group"
              >
                <Avatar name={user.name} src={user.avatarUrl} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                    {user.name}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                    @{user.username}
                  </p>
                  {user.headline && (
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium truncate mt-0.5">
                      {user.headline}
                    </p>
                  )}
                </div>
              </Link>

              <div className="flex items-center gap-2.5 shrink-0">
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                    Connected {user.connectedSince}
                  </span>
                  <Link
                    href={`/u/${user.username}`}
                    onClick={onClose}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-block mt-0.5"
                  >
                    View Profile →
                  </Link>
                </div>
                <button
                  type="button"
                  disabled={removingConnId === user.id}
                  onClick={() => onRemoveConnection(user.id, user.name)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/60 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs hover:shadow-xs"
                  title={`Remove connection with ${user.name}`}
                >
                  <UserMinus className="h-3.5 w-3.5" />
                  <span>{removingConnId === user.id ? "Removing…" : "Remove"}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
