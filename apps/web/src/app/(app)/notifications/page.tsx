"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Bell, Check } from "lucide-react";
import { Button, Card } from "@stunet/ui";

interface NotificationItem {
  id: string;
  section: "NETWORK" | "CAMPUS" | "GENERAL";
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  actorName?: string;
  actionUrl?: string;
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

export default function NotificationsPage() {
  const [activeSection, setActiveSection] = useState<"ALL" | "NETWORK" | "CAMPUS">("ALL");

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadNotifications() {
    try {
      const res = await fetch("/api/notifications?unread=false");
      if (res.ok) {
        const data = await res.json();
        const apiNotifs = data.notifications ?? [];
        if (apiNotifs.length > 0) {
          const mapped: NotificationItem[] = apiNotifs.map(
            (n: {
              id: string;
              type: string;
              title: string;
              body?: string;
              actionUrl?: string;
              isRead: boolean;
              createdAt: string;
              triggeredBy?: { displayName?: string };
            }) => {
              const isCampus =
                n.type.includes("CAMPUS") ||
                n.type.includes("ALERT") ||
                n.type.includes("ACADEMIC");
              return {
                id: n.id,
                section: isCampus ? "CAMPUS" : "NETWORK",
                title: n.title,
                message: n.body || "Notification details.",
                time: timeAgo(n.createdAt),
                isRead: n.isRead,
                actorName: n.triggeredBy?.displayName,
                actionUrl: n.actionUrl,
              };
            },
          );
          setNotifications(mapped);
          return;
        }
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
    function onUpdated() {
      void loadNotifications();
    }
    window.addEventListener("stunet:notifications-updated", onUpdated);
    return () => window.removeEventListener("stunet:notifications-updated", onUpdated);
  }, []);

  const filtered = notifications.filter((n) => {
    if (activeSection === "NETWORK") return n.section === "NETWORK";
    if (activeSection === "CAMPUS") return n.section === "CAMPUS";
    return true;
  });

  async function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("stunet:notifications-updated"));
      }
    } catch {
      // silent
    }
  }

  return (
    <div className="max-w-[720px] mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 dark:border-slate-800 p-6 rounded-3xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-sm">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Notifications
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Campus academic alerts, network collaboration updates, and club notices.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={markAllAsRead}
          className="text-xs font-bold gap-1"
        >
          <Check className="h-3.5 w-3.5" />
          <span>Mark all read</span>
        </Button>
      </div>

      {/* Sections: All • Network & Group • Campus */}
      <div className="p-1.5 bg-white dark:bg-slate-900 dark:border-slate-800 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-1 text-sm font-black">
        {[
          { id: "ALL" as const, label: "All" },
          { id: "NETWORK" as const, label: "Network & Group" },
          { id: "CAMPUS" as const, label: "Campus" },
        ].map((sec) => (
          <button
            key={sec.id}
            type="button"
            onClick={() => setActiveSection(sec.id)}
            className={`flex-1 py-2 px-3 rounded-xl transition-all text-center ${
              activeSection === sec.id
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            }`}
          >
            {sec.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {loading && notifications.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            Loading notifications…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            No notifications in this section.
          </div>
        ) : (
          filtered.map((item) => (
            <Card
              key={item.id}
              className={`border-slate-200/90 dark:border-slate-800 shadow-2xs p-4 rounded-2xl transition-colors ${
                !item.isRead
                  ? "bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-200/70 dark:border-indigo-900/40"
                  : "bg-white dark:bg-slate-900"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        item.section === "CAMPUS"
                          ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                          : "bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                      }`}
                    >
                      {item.section === "CAMPUS" ? "Campus" : "Network"}
                    </span>
                    <span className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                      {item.title}
                    </span>
                    {!item.isRead && (
                      <span className="h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-950" />
                    )}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                    {item.message}
                  </p>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block pt-1">
                    {item.time}
                  </span>
                </div>

                {item.actionUrl && (
                  <Link
                    href={item.actionUrl as Route}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                  >
                    View →
                  </Link>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
