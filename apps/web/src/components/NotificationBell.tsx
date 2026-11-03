"use client";

/**
 * NotificationBell — fetches unread count and shows a dropdown of recent notifications.
 * Polls every 60 s. Clicking "Mark all read" PATCHes /api/notifications.
 */
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Clock } from "lucide-react";
import { Avatar } from "@stunet/ui";

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

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function fetchCount() {
    try {
      const res = await fetch("/api/notifications?unread=true");
      if (res.ok) {
        const d = await res.json();
        setUnreadCount(d.unreadCount ?? 0);
      }
    } catch {
      // silent — network errors shouldn't break the nav
    }
  }

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?unread=false");
      if (res.ok) {
        const d = await res.json();
        setNotifications(d.notifications ?? []);
        setUnreadCount(d.unreadCount ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    setMarking(true);
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } finally {
      setMarking(false);
    }
  }

  async function markOneRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  // Poll every 60 s
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleBellClick() {
    if (!open) fetchNotifications();
    setOpen((o) => !o);
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

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={handleBellClick}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs animate-in zoom-in">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-84 sm:w-96 rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/10 z-50 overflow-hidden animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={marking}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>{marking ? "Marking…" : "Mark all read"}</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-84 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="py-8 text-center text-sm text-slate-400">Loading notifications…</div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="mx-auto h-8 w-8 text-slate-300 stroke-1" />
                <p className="mt-2 text-xs font-medium text-slate-500">No notifications yet</p>
                <p className="text-[11px] text-slate-400">
                  We will notify you when campus activity happens
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) markOneRead(n.id);
                    if (n.actionUrl) window.location.href = n.actionUrl;
                    setOpen(false);
                  }}
                  className={`flex items-start gap-3 p-3.5 cursor-pointer transition-colors ${
                    !n.isRead ? "bg-indigo-50/40 hover:bg-indigo-50/70" : "hover:bg-slate-50"
                  }`}
                >
                  {n.triggeredBy ? (
                    <Avatar
                      src={n.triggeredBy.avatarUrl}
                      name={n.triggeredBy.displayName}
                      size="sm"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shrink-0">
                      <Bell className="h-4 w-4" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900 truncate">{n.title}</p>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
                        <Clock className="h-2.5 w-2.5" />
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    {n.body && (
                      <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{n.body}</p>
                    )}
                  </div>

                  {!n.isRead && (
                    <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0 mt-1" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
