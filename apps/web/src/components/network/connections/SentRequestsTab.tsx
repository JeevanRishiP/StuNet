"use client";

import React from "react";
import Link from "next/link";
import { Send, Clock, X, XCircle, CheckCircle2 } from "lucide-react";
import { Avatar } from "@stunet/ui";
import type { ConnectionRequestItem } from "../types";

export interface SentRequestsTabProps {
  sentPendingRequests: ConnectionRequestItem[];
  sentRejectedRequests: ConnectionRequestItem[];
  onCancelSentRequest: (connId: string) => Promise<void>;
  onClose: () => void;
}

export function SentRequestsTab({
  sentPendingRequests,
  sentRejectedRequests,
  onCancelSentRequest,
  onClose,
}: SentRequestsTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* COLUMN 1: NEW SENT REQUESTS (PENDING APPROVAL) */}
        <div className="space-y-3 bg-slate-50/60 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-amber-500" />
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-slate-100">
                New Sent Requests
              </h3>
              <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full">
                {sentPendingRequests.length}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              Awaiting Response
            </span>
          </div>

          <div className="max-h-[420px] overflow-y-auto space-y-2.5 pr-1">
            {sentPendingRequests.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
                <Send className="h-7 w-7 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">
                  No pending sent requests
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Invitations you send that are waiting for response will appear here.
                </p>
              </div>
            ) : (
              sentPendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-600 rounded-xl shadow-2xs transition-all space-y-2.5"
                >
                  <div className="flex items-start gap-2.5">
                    <Link href={`/u/${req.username}`} onClick={onClose} className="shrink-0">
                      <Avatar name={req.name} src={req.avatarUrl} size="md" />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/u/${req.username}`}
                        onClick={onClose}
                        className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 truncate block hover:underline"
                      >
                        {req.name}
                      </Link>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                        @{req.username}
                      </span>
                      {req.headline && (
                        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium truncate mt-0.5">
                          {req.headline}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {req.campus} • Sent {req.createdAt}
                      </p>
                      {req.message && (
                        <p className="text-[10px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700 rounded-lg p-1.5 mt-1.5 italic">
                          &ldquo;{req.message}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      Pending
                    </span>
                    <button
                      type="button"
                      onClick={() => onCancelSentRequest(req.id)}
                      className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-700 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-semibold text-[11px] flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                      <span>Withdraw</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 2: REJECTED REQUESTS */}
        <div className="space-y-3 bg-slate-50/60 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-rose-500" />
              <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-slate-100">
                Rejected Requests
              </h3>
              <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full">
                {sentRejectedRequests.length}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              Declined by Recipient
            </span>
          </div>

          <div className="max-h-[420px] overflow-y-auto space-y-2.5 pr-1">
            {sentRejectedRequests.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
                <CheckCircle2 className="h-7 w-7 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="font-semibold text-slate-600 dark:text-slate-300">
                  No rejected requests
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  None of your outgoing requests have been rejected.
                </p>
              </div>
            ) : (
              sentRejectedRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 bg-white dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-700 rounded-xl shadow-2xs transition-all space-y-2.5"
                >
                  <div className="flex items-start gap-2.5">
                    <Link href={`/u/${req.username}`} onClick={onClose} className="shrink-0">
                      <Avatar name={req.name} src={req.avatarUrl} size="md" />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/u/${req.username}`}
                        onClick={onClose}
                        className="text-xs font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 truncate block hover:underline"
                      >
                        {req.name}
                      </Link>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                        @{req.username}
                      </span>
                      {req.headline && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {req.headline}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {req.campus} • Sent {req.createdAt}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700">
                    <span className="text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <XCircle className="h-2.5 w-2.5" />
                      Declined
                    </span>
                    <button
                      type="button"
                      onClick={() => onCancelSentRequest(req.id)}
                      title="Dismiss this rejected request"
                      className="px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold text-[11px] flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                    >
                      <span>Dismiss</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
