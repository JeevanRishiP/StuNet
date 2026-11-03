"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Bell, X, UserPlus, Heart, MessageSquare, AlertTriangle, Calendar } from "lucide-react";

interface GlobalNotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NotificationItem {
  id: string;
  type: "CONNECTION_REQUEST" | "REACTION" | "COMMENT" | "CAMPUS_ALERT" | "CLUB_EVENT";
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  avatarUrl?: string;
  actorName?: string;
  actionUrl?: string;
}

export default function GlobalNotificationsDrawer({
  isOpen,
  onClose,
}: GlobalNotificationsDrawerProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "n-1",
      type: "CONNECTION_REQUEST",
      title: "Connection Request",
      message: "Bob Krishnan wants to connect with you",
      time: "10m ago",
      isRead: false,
      actorName: "Bob Krishnan",
      actionUrl: "/network",
    },
    {
      id: "n-2",
      type: "CAMPUS_ALERT",
      title: "Academic Deadline",
      message: "CIA 2 English — Submission date extended by 1 day (New date: Nov 15)",
      time: "1h ago",
      isRead: false,
      actionUrl: "/campus",
    },
    {
      id: "n-3",
      type: "REACTION",
      title: "Post Reaction",
      message: "Dave Patel liked your project update",
      time: "3h ago",
      isRead: true,
      actorName: "Dave Patel",
      actionUrl: "/",
    },
    {
      id: "n-4",
      type: "CLUB_EVENT",
      title: "Clubs Live Today",
      message: "Arts Club meetup today at 3:00 PM • Room 3, 1st Floor",
      time: "5h ago",
      isRead: true,
      actionUrl: "/clubs/arts",
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  function handleAction(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
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
      <div className="fixed top-0 bottom-0 left-0 lg:left-[72px] w-full max-w-sm sm:w-[380px] bg-white border-r border-slate-200 z-50 flex flex-col shadow-2xl transition-transform duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50"
              >
                Mark all read
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {notifications.map((item) => {
            const Icon =
              item.type === "CONNECTION_REQUEST"
                ? UserPlus
                : item.type === "CAMPUS_ALERT"
                  ? AlertTriangle
                  : item.type === "CLUB_EVENT"
                    ? Calendar
                    : item.type === "REACTION"
                      ? Heart
                      : MessageSquare;

            const iconColor =
              item.type === "CAMPUS_ALERT"
                ? "text-amber-600 bg-amber-50 border-amber-200"
                : item.type === "CONNECTION_REQUEST"
                  ? "text-indigo-600 bg-indigo-50 border-indigo-200"
                  : item.type === "CLUB_EVENT"
                    ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                    : "text-rose-600 bg-rose-50 border-rose-200";

            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-all ${
                  item.isRead
                    ? "bg-white border-slate-100 opacity-80"
                    : "bg-indigo-50/40 border-indigo-100/80 shadow-xs"
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
                      <p className="text-xs font-semibold text-slate-900 truncate">{item.title}</p>
                      <span className="text-[10px] text-slate-400 shrink-0">{item.time}</span>
                    </div>

                    <p className="text-xs text-slate-600 mt-0.5 leading-snug">{item.message}</p>

                    {item.actionUrl && (
                      <div className="mt-2 flex items-center gap-2">
                        <Link
                          href={item.actionUrl as Route}
                          onClick={() => {
                            handleAction(item.id);
                            onClose();
                          }}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                        >
                          View details →
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
          })}
        </div>
      </div>
    </>
  );
}
