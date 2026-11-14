"use client";

import { useState } from "react";
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

export default function NotificationsPage() {
  const [activeSection, setActiveSection] = useState<"ALL" | "NETWORK" | "CAMPUS">("ALL");

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "n-1",
      section: "CAMPUS",
      title: "CIA 2 English",
      message: "Submission Date Extended by 1 day (New date: Nov 15)",
      time: "10m ago",
      isRead: false,
      actionUrl: "/campus",
    },
    {
      id: "n-2",
      section: "NETWORK",
      title: "Harshitha Shree Raj (NSGC)",
      message: "Posted a new hackathon team-up invitation for SIH 2026",
      time: "25m ago",
      isRead: false,
      actorName: "Harshitha Shree Raj",
      actionUrl: "/network",
    },
    {
      id: "n-3",
      section: "CAMPUS",
      title: "Arts Club",
      message: "Live Showcase Today 3:00 PM in Room 3 First Floor",
      time: "1h ago",
      isRead: false,
      actionUrl: "/clubs/arts",
    },
    {
      id: "n-4",
      section: "NETWORK",
      title: "Sankirth R Bhat",
      message: "Accepted your connection request",
      time: "3h ago",
      isRead: true,
      actorName: "Sankirth R Bhat",
      actionUrl: "/u/2102508646",
    },
    {
      id: "n-5",
      section: "NETWORK",
      title: "Shrenik Sk",
      message: "Liked your open-source StuNet engine project post",
      time: "5h ago",
      isRead: true,
      actorName: "Shrenik Sk",
      actionUrl: "/",
    },
  ]);

  const filtered = notifications.filter((n) => {
    if (activeSection === "NETWORK") return n.section === "NETWORK";
    if (activeSection === "CAMPUS") return n.section === "CAMPUS";
    return true;
  });

  function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
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
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
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
      <div className="p-1.5 bg-white dark:bg-slate-900 dark:border-slate-800 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-1 text-xs font-bold">
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
        {filtered.map((item) => (
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
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
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
        ))}
      </div>
    </div>
  );
}
