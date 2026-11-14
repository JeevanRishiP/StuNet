"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  Bell,
  X,
  UserPlus,
  Users,
  MessageSquare,
  AlertTriangle,
  Calendar,
  Check,
  ExternalLink,
} from "lucide-react";

interface GlobalNotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
  triggeredBy: {
    displayName: string;
    username: string;
    avatarUrl: string | null;
  } | null;
}

export default function GlobalNotificationsDrawer({
  isOpen,
  onClose,
}: GlobalNotificationsDrawerProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?unread=false");
      if (res.ok) {
        const d = await res.json();
        setNotifications(d.notifications ?? []);
        setUnreadCount(d.unreadCount ?? 0);
      }
    } catch {
      // silent network catch
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      void fetchNotifications();
    }
  }, [isOpen]);

  // Keep in sync with app-wide notification updates
  useEffect(() => {
    function onUpdated() {
      void fetchNotifications();
    }
    window.addEventListener("stunet:notifications-updated", onUpdated);
    return () => window.removeEventListener("stunet:notifications-updated", onUpdated);
  }, []);

  async function markAllRead() {
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("stunet:notifications-updated"));
      }
    } catch {
      // silent
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("stunet:notifications-updated"));
      }
    } catch {
      // silent
    }
  }

  async function handleAcceptConnection(notificationId: string, senderUsername?: string) {
    setActingId(notificationId);
    try {
      const res = await fetch("/api/connections?status=PENDING");
      if (res.ok) {
        const conns = await res.json();
        const targetConn = conns.find(
          (c: { direction: string; person?: { username?: string } }) =>
            c.direction === "received" &&
            (!senderUsername || c.person?.username === senderUsername),
        );
        if (targetConn) {
          await fetch(`/api/connections/${targetConn.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "ACCEPTED" }),
          });
        }
      }
      await handleMarkRead(notificationId);
      await fetchNotifications();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("stunet:notifications-updated"));
      }
    } catch {
      // silent
    } finally {
      setActingId(null);
    }
  }

  async function handleDeclineConnection(notificationId: string, senderUsername?: string) {
    setActingId(notificationId);
    try {
      const res = await fetch("/api/connections?status=PENDING");
      if (res.ok) {
        const conns = await res.json();
        const targetConn = conns.find(
          (c: { direction: string; person?: { username?: string } }) =>
            c.direction === "received" &&
            (!senderUsername || c.person?.username === senderUsername),
        );
        if (targetConn) {
          await fetch(`/api/connections/${targetConn.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "DECLINED" }),
          });
        }
      }
      await handleMarkRead(notificationId);
      await fetchNotifications();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("stunet:notifications-updated"));
      }
    } catch {
      // silent
    } finally {
      setActingId(null);
    }
  }

  function extractGroupId(actionUrl: string | null): string | null {
    if (!actionUrl) return null;
    const match =
      actionUrl.match(/joinGroup=([a-zA-Z0-9]+)/) || actionUrl.match(/groupId=([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  function parseGroupRequestParams(actionUrl: string | null): {
    groupId: string | null;
    requestId: string | null;
  } {
    if (!actionUrl) return { groupId: null, requestId: null };
    const groupMatch = actionUrl.match(/groupId=([a-zA-Z0-9]+)/);
    const reqMatch = actionUrl.match(/requestId=([a-zA-Z0-9]+)/);
    return {
      groupId: groupMatch ? groupMatch[1] : null,
      requestId: reqMatch ? reqMatch[1] : null,
    };
  }

  async function handleAcceptGroupInvite(notificationId: string, actionUrl: string | null) {
    const groupId = extractGroupId(actionUrl);
    setActingId(notificationId);
    try {
      if (groupId) {
        await fetch(`/api/groups/${groupId}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromInvite: true }),
        });
      }
      await handleMarkRead(notificationId);
      await fetchNotifications();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("stunet:notifications-updated"));
      }
    } catch {
      // silent
    } finally {
      setActingId(null);
    }
  }

  async function handleAcceptGroupJoinRequest(notificationId: string, actionUrl: string | null) {
    const { groupId, requestId } = parseGroupRequestParams(actionUrl);
    setActingId(notificationId);
    try {
      if (groupId && requestId) {
        await fetch(`/api/groups/${groupId}/requests/${requestId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "APPROVED" }),
        });
      }
      await handleMarkRead(notificationId);
      await fetchNotifications();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("stunet:notifications-updated"));
      }
    } catch {
      // silent
    } finally {
      setActingId(null);
    }
  }

  async function handleDeclineGroupJoinRequest(notificationId: string, actionUrl: string | null) {
    const { groupId, requestId } = parseGroupRequestParams(actionUrl);
    setActingId(notificationId);
    try {
      if (groupId && requestId) {
        await fetch(`/api/groups/${groupId}/requests/${requestId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "REJECTED" }),
        });
      }
      await handleMarkRead(notificationId);
      await fetchNotifications();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("stunet:notifications-updated"));
      }
    } catch {
      // silent
    } finally {
      setActingId(null);
    }
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40 lg:z-30 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 bottom-0 left-0 lg:left-[72px] w-full max-w-sm sm:w-[380px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 flex flex-col shadow-2xl transition-transform duration-200 text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-slate-800"
              >
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {loading && notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading notifications…</div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Bell className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                No notifications yet
              </p>
              <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto">
                Connection requests, campus updates, and group activities will appear here.
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const titleLower = item.title.toLowerCase();
              const isConnReq = item.type === "CONNECTION_REQUEST";
              const isGroupReq = item.type === "GROUP_JOIN_REQUEST";

              // Only genuine incoming invitation to join a group shows action buttons
              const isIncomingGroupInvite =
                (item.type === "GROUP_INVITE" || item.type === "CLUB_INVITE") &&
                (titleLower === "group invitation" ||
                  titleLower === "club invitation" ||
                  (item.body?.toLowerCase().includes("invited you to join") ?? false)) &&
                !titleLower.includes("accepted") &&
                !titleLower.includes("approved") &&
                !titleLower.includes("joined") &&
                !titleLower.includes("declined") &&
                !titleLower.includes("rejected");

              const isAlert = item.type === "CAMPUS_ALERT";
              const isClub = item.type === "CLUB_EVENT";
              const isAccepted = item.type === "CONNECTION_ACCEPTED";

              const Icon =
                isIncomingGroupInvite || isGroupReq || item.type.includes("GROUP")
                  ? Users
                  : isConnReq || isAccepted
                    ? UserPlus
                    : isAlert
                      ? AlertTriangle
                      : isClub
                        ? Calendar
                        : MessageSquare;

              const iconColor = isAlert
                ? "text-amber-600 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800"
                : isIncomingGroupInvite || isGroupReq || item.type.includes("GROUP")
                  ? "text-purple-600 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800"
                  : isConnReq
                    ? "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800"
                    : isAccepted
                      ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800"
                      : "text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700";

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all ${
                    item.isRead
                      ? "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-80"
                      : "bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-100/80 dark:border-indigo-900/50 shadow-xs"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-8 w-8 rounded-full border flex items-center justify-center shrink-0 ${iconColor}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {item.title}
                        </p>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {timeAgo(item.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                        {item.body || "Campus activity notification."}
                      </p>

                      {/* 1. Connection Request Actions (Only when UNREAD) */}
                      {isConnReq && !item.isRead && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <button
                            type="button"
                            disabled={actingId === item.id}
                            onClick={() =>
                              handleAcceptConnection(item.id, item.triggeredBy?.username)
                            }
                            className="px-2.5 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <Check className="h-3 w-3" />
                            <span>{actingId === item.id ? "Connecting…" : "Accept"}</span>
                          </button>
                          <button
                            type="button"
                            disabled={actingId === item.id}
                            onClick={() =>
                              handleDeclineConnection(item.id, item.triggeredBy?.username)
                            }
                            className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            Decline
                          </button>
                          <Link
                            href="/network"
                            onClick={() => {
                              handleMarkRead(item.id);
                              onClose();
                            }}
                            className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:underline"
                          >
                            View in Network
                          </Link>
                        </div>
                      )}

                      {/* Connection already accepted badge */}
                      {isConnReq && item.isRead && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Connected
                          </span>
                        </div>
                      )}

                      {/* 2. Group Join Request Actions (For Owner when UNREAD) */}
                      {isGroupReq && !item.isRead && (
                        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            disabled={actingId === item.id}
                            onClick={() => handleAcceptGroupJoinRequest(item.id, item.actionUrl)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <Check className="h-3 w-3" />
                            <span>{actingId === item.id ? "Admitting…" : "Accept & Admit"}</span>
                          </button>
                          <button
                            type="button"
                            disabled={actingId === item.id}
                            onClick={() => handleDeclineGroupJoinRequest(item.id, item.actionUrl)}
                            className="px-2 py-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                          >
                            Decline
                          </button>
                          <Link
                            href="/network"
                            onClick={() => {
                              handleMarkRead(item.id);
                              onClose();
                            }}
                            className="text-[11px] font-semibold text-indigo-600 hover:underline"
                          >
                            View Groups
                          </Link>
                        </div>
                      )}

                      {/* 3. Real Group Invitation Actions (Only for UNREAD incoming invites) */}
                      {isIncomingGroupInvite && !item.isRead && (
                        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            disabled={actingId === item.id}
                            onClick={() => handleAcceptGroupInvite(item.id, item.actionUrl)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <Check className="h-3 w-3" />
                            <span>{actingId === item.id ? "Joining…" : "Join Group"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkRead(item.id)}
                            className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            Decline
                          </button>
                          <Link
                            href="/network"
                            onClick={() => {
                              handleMarkRead(item.id);
                              onClose();
                            }}
                            className="text-[11px] font-semibold text-indigo-600 hover:underline"
                          >
                            View Groups
                          </Link>
                        </div>
                      )}

                      {/* 4. Informational Group Notifications (Accepted, Approved, Joined) */}
                      {!isIncomingGroupInvite && !isGroupReq && item.type.includes("GROUP") && (
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <Link
                            href="/network"
                            onClick={() => {
                              handleMarkRead(item.id);
                              onClose();
                            }}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                          >
                            <span>View Groups</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                          {!item.isRead && (
                            <button
                              type="button"
                              onClick={() => handleMarkRead(item.id)}
                              className="text-[10px] text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-100"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      )}

                      {/* 5. Generic Other Notifications with actionUrl */}
                      {!isConnReq &&
                        !isGroupReq &&
                        !item.type.includes("GROUP") &&
                        item.actionUrl && (
                          <div className="mt-2 flex items-center gap-2">
                            <Link
                              href={item.actionUrl as Route}
                              onClick={() => {
                                handleMarkRead(item.id);
                                onClose();
                              }}
                              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
                            >
                              <span>View details</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </Link>
                          </div>
                        )}
                    </div>

                    {!item.isRead && (
                      <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <Link
            href={"/network" as Route}
            onClick={onClose}
            className="w-full flex items-center justify-center py-2 px-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-white border border-indigo-200/80 rounded-xl hover:bg-indigo-50/50 transition-colors shadow-xs"
          >
            Manage Network & Connections
          </Link>
        </div>
      </div>
    </>
  );
}
