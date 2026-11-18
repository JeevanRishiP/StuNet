"use client";

import React from "react";
import Link from "next/link";
import { Inbox, Clock, MessageSquare } from "lucide-react";
import { Avatar } from "@stunet/ui";
import type { ConnectionRequestItem } from "../types";

export interface ReceivedRequestsTabProps {
  receivedRequests: ConnectionRequestItem[];
  onAcceptRequest: (connId: string) => Promise<void>;
  onDeclineRequest: (connId: string) => Promise<void>;
  onClose: () => void;
}

export function ReceivedRequestsTab({
  receivedRequests,
  onAcceptRequest,
  onDeclineRequest,
  onClose,
}: ReceivedRequestsTabProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">Invitations</span>
          <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full">
            {receivedRequests.length}
          </span>
        </div>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">
          Review pending connection requests from campus peers
        </span>
      </div>

      <div className="max-h-[460px] overflow-y-auto space-y-3 pr-1">
        {receivedRequests.length === 0 ? (
          <div className="py-14 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            <Inbox className="h-9 w-9 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
              No pending invitations
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              When other students, faculty, or alumni send you connection invitations, you can
              review and accept them here just like on LinkedIn.
            </p>
          </div>
        ) : (
          receivedRequests.map((req) => (
            <div
              key={req.id}
              className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-600 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              {/* Left: Avatar + Details */}
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <Link href={`/u/${req.username}`} onClick={onClose} className="shrink-0 group">
                  <Avatar name={req.name} src={req.avatarUrl} size="lg" />
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      href={`/u/${req.username}`}
                      onClick={onClose}
                      className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors hover:underline"
                    >
                      {req.name}
                    </Link>
                    <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                      @{req.username}
                    </span>
                  </div>

                  {req.headline && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium line-clamp-2 mt-0.5 leading-snug">
                      {req.headline}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    <span>{req.campus}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                      Received {req.createdAt}
                    </span>
                  </div>

                  {req.message && (
                    <div className="mt-2.5 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 italic flex items-start gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
                      <span className="flex-1">&ldquo;{req.message}&rdquo;</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: LinkedIn-style Reject and Accept Options */}
              <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => onDeclineRequest(req.id)}
                  className="px-4 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-slate-100 font-semibold text-xs transition-all active:scale-95 cursor-pointer"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => onAcceptRequest(req.id)}
                  className="px-5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                >
                  Accept
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
