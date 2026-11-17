"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Inbox,
  Send,
  Search,
  UserMinus,
  Clock,
  MessageSquare,
  X,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { Avatar, Modal } from "@stunet/ui";
import type { ConnectionItem, ConnectionRequestItem } from "./types";

export interface FollowPersonItem {
  id: string;
  userId: string;
  name: string;
  username: string;
  headline?: string;
  avatarUrl?: string;
  campus?: string;
}

export interface ConnectionsListProps {
  isOpen: boolean;
  onClose: () => void;
  connections: ConnectionItem[];
  followingList: FollowPersonItem[];
  followersList: FollowPersonItem[];
  followingIdSet: Set<string>;
  receivedRequests: ConnectionRequestItem[];
  sentPendingRequests: ConnectionRequestItem[];
  sentRejectedRequests: ConnectionRequestItem[];
  activeTab?: "ALL" | "FOLLOWING" | "FOLLOWERS" | "RECEIVED" | "SENT";
  onRemoveConnection: (connId: string, memberName?: string) => Promise<void>;
  onAcceptRequest: (connId: string) => Promise<void>;
  onDeclineRequest: (connId: string) => Promise<void>;
  onCancelSentRequest: (connId: string) => Promise<void>;
  onToggleFollow: (userId: string, currentlyFollowing: boolean) => Promise<void>;
}

export function ConnectionsList({
  isOpen,
  onClose,
  connections,
  followingList,
  followersList,
  followingIdSet,
  receivedRequests,
  sentPendingRequests,
  sentRejectedRequests,
  activeTab = "ALL",
  onRemoveConnection,
  onAcceptRequest,
  onDeclineRequest,
  onCancelSentRequest,
  onToggleFollow,
}: ConnectionsListProps) {
  const [tab, setTab] = useState<"ALL" | "FOLLOWING" | "FOLLOWERS" | "RECEIVED" | "SENT">(
    activeTab,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [removingConnId, setRemovingConnId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab) {
      setTab(activeTab);
    }
  }, [activeTab]);

  const filteredConnections = connections.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.headline && c.headline.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const handleRemove = async (id: string, name?: string) => {
    setRemovingConnId(id);
    try {
      await onRemoveConnection(id, name);
    } finally {
      setRemovingConnId(null);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Connections & Requests"
      className="max-w-3xl sm:max-w-4xl"
    >
      <div className="space-y-4 pt-2 text-xs">
        {/* Tabs Selector: Connections, Following, Followers, Received Requests, Sent Requests */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setTab("ALL")}
            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === "ALL"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Connections</span>
            <span className="bg-slate-200/80 dark:bg-slate-600 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-full text-[10px] font-mono">
              {connections.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("FOLLOWING")}
            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === "FOLLOWING"
                ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <span>Following</span>
            <span className="bg-slate-200/80 dark:bg-slate-600 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-full text-[10px] font-mono">
              {followingList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("FOLLOWERS")}
            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === "FOLLOWERS"
                ? "bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <span>Followers</span>
            <span className="bg-slate-200/80 dark:bg-slate-600 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-full text-[10px] font-mono">
              {followersList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("RECEIVED")}
            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === "RECEIVED"
                ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <Inbox className="h-3.5 w-3.5" />
            <span>Received</span>
            {receivedRequests.length > 0 ? (
              <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold">
                {receivedRequests.length}
              </span>
            ) : (
              <span className="bg-slate-200/80 dark:bg-slate-600 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-full text-[10px] font-mono">
                0
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab("SENT")}
            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === "SENT"
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>Sent</span>
            <span className="bg-slate-200/80 dark:bg-slate-600 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-full text-[10px] font-mono">
              {sentPendingRequests.length + sentRejectedRequests.length}
            </span>
            {sentRejectedRequests.length > 0 && (
              <span className="bg-rose-500 text-white px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold">
                {sentRejectedRequests.length} rejected
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: ALL CONNECTED MEMBERS */}
        {tab === "ALL" && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                        onClick={() => handleRemove(user.id, user.name)}
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
        )}

        {/* TAB 2: RECEIVED REQUESTS (LINKEDIN STYLE) */}
        {tab === "RECEIVED" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  Invitations
                </span>
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
                      <Link
                        href={`/u/${req.username}`}
                        onClick={onClose}
                        className="shrink-0 group"
                      >
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
        )}

        {/* TAB 3: SENT REQUESTS — TWO SEPARATE COLUMNS */}
        {tab === "SENT" && (
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
        )}

        {/* TAB 4: FOLLOWING */}
        {tab === "FOLLOWING" && (
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
            {followingList.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-500">
                <p className="font-semibold text-slate-600 dark:text-slate-300">
                  Not following anyone yet
                </p>
                <p className="text-[11px] mt-1">
                  Follow classmates, faculty, or alumni to curate your feed by interest without
                  needing two-way approval.
                </p>
              </div>
            ) : (
              followingList.map((member) => (
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
        )}

        {/* TAB 5: FOLLOWERS */}
        {tab === "FOLLOWERS" && (
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
            {followersList.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-500">
                No followers yet.
              </div>
            ) : (
              followersList.map((member) => {
                const amFollowing = followingIdSet.has(member.userId);
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
        )}
      </div>
    </Modal>
  );
}
