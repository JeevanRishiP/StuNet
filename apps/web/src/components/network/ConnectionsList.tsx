"use client";

import React, { useState, useEffect } from "react";
import { Users, Inbox, Send } from "lucide-react";
import { Modal } from "@stunet/ui";
import type { ConnectionItem, ConnectionRequestItem } from "./types";
import {
  ConnectionsSearchTab,
  ReceivedRequestsTab,
  SentRequestsTab,
  FollowListsTab,
  type FollowPersonItem,
} from "./connections";

export type { FollowPersonItem };

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
          <ConnectionsSearchTab
            connections={connections}
            searchQuery={searchQuery}
            onChangeSearchQuery={setSearchQuery}
            removingConnId={removingConnId}
            onRemoveConnection={handleRemove}
            onClose={onClose}
          />
        )}

        {/* TAB 2: RECEIVED REQUESTS (LINKEDIN STYLE) */}
        {tab === "RECEIVED" && (
          <ReceivedRequestsTab
            receivedRequests={receivedRequests}
            onAcceptRequest={onAcceptRequest}
            onDeclineRequest={onDeclineRequest}
            onClose={onClose}
          />
        )}

        {/* TAB 3: SENT REQUESTS — TWO SEPARATE COLUMNS */}
        {tab === "SENT" && (
          <SentRequestsTab
            sentPendingRequests={sentPendingRequests}
            sentRejectedRequests={sentRejectedRequests}
            onCancelSentRequest={onCancelSentRequest}
            onClose={onClose}
          />
        )}

        {/* TAB 4: FOLLOWING */}
        {tab === "FOLLOWING" && (
          <FollowListsTab
            type="FOLLOWING"
            list={followingList}
            onToggleFollow={onToggleFollow}
            onClose={onClose}
          />
        )}

        {/* TAB 5: FOLLOWERS */}
        {tab === "FOLLOWERS" && (
          <FollowListsTab
            type="FOLLOWERS"
            list={followersList}
            followingIdSet={followingIdSet}
            onToggleFollow={onToggleFollow}
            onClose={onClose}
          />
        )}
      </div>
    </Modal>
  );
}

export * from "./connections";
