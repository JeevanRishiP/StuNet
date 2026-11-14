"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Menu,
  X,
  Search,
  Bell,
  Home,
  Users2,
  Trophy,
  Calendar,
  BookOpen,
  Compass,
  BarChart3,
  ShoppingBag,
  Building2,
  ExternalLink,
  LogOut,
  User,
} from "lucide-react";
import { Avatar } from "@stunet/ui";
import { ThemeToggle } from "./ThemeToggle";

interface MobileHeaderProps {
  user: {
    id: string;
    name?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
    isGuest?: boolean;
    role?: string;
  };
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  unreadCount?: number;
  networkUnreadCount?: number;
}

export default function MobileHeader({
  user,
  onOpenSearch,
  onOpenNotifications,
  unreadCount = 0,
  networkUnreadCount = 0,
}: MobileHeaderProps) {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isGuest = Boolean(user.isGuest || user.role === "GUEST");

  const primaryLinks: Array<{
    href: Route;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = isGuest
    ? [
        { href: "/" as Route, label: "Home", icon: Home },
        { href: "/success-board" as Route, label: "Success Board", icon: Trophy },
        { href: "/clubs" as Route, label: "NIAT Clubs", icon: Compass },
      ]
    : [
        { href: "/" as Route, label: "Home", icon: Home },
        {
          href: "/network" as Route,
          label: "My Network",
          icon: Users2,
          badge:
            networkUnreadCount > 0
              ? networkUnreadCount > 9
                ? "9+"
                : String(networkUnreadCount)
              : undefined,
        },
        { href: "/success-board" as Route, label: "Success Board", icon: Trophy },
        { href: "/events" as Route, label: "Events", icon: Calendar },
        { href: "/resources" as Route, label: "Useful Resources", icon: BookOpen },
        { href: "/polls" as Route, label: "Poll", icon: BarChart3 },
      ];

  const campusLinks = isGuest
    ? [
        {
          href: "https://www.niatinsider.com",
          label: "NIAT Insider",
          icon: ExternalLink,
          isExternal: true,
        },
        {
          href: "https://niat-diaries.vercel.app",
          label: "NIAT Events",
          icon: ExternalLink,
          isExternal: true,
        },
      ]
    : [
        { href: "/campus" as Route, label: "My Campus", icon: Building2 },
        { href: "/clubs" as Route, label: "NIAT Clubs", icon: Compass },
        { href: "/marketplace" as Route, label: "Market Place (OLX)", icon: ShoppingBag },
        {
          href: "https://www.niatinsider.com",
          label: "NIAT Insider",
          icon: ExternalLink,
          isExternal: true,
        },
        {
          href: "https://niat-diaries.vercel.app",
          label: "NIAT Events",
          icon: ExternalLink,
          isExternal: true,
        },
      ];

  return (
    <>
      <header className="lg:hidden sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-[680px] mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: Hamburger + Logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="p-1.5 -ml-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs">
                S
              </div>
              <span className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100">
                StuNet
              </span>
            </Link>
          </div>

          {/* Right: Theme Toggle, Search & Notifications */}
          <div className="flex items-center gap-1.5">
            <ThemeToggle className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" />

            <button
              type="button"
              onClick={onOpenSearch}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            {!isGuest && (
              <button
                type="button"
                onClick={onOpenNotifications}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 relative transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500" />
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Slide-Out Left Sidebar Drawer for Mobile & Tablet */}
      {isDrawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 lg:hidden transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          <div className="fixed top-0 bottom-0 left-0 w-72 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 z-50 shadow-2xl flex flex-col lg:hidden animate-in slide-in-from-left duration-200 border-r border-slate-200 dark:border-slate-800">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              {isGuest ? (
                <Link
                  href="/login"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex items-center gap-2.5"
                >
                  <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-950 border border-amber-300 dark:border-amber-700 flex items-center justify-center text-amber-800 dark:text-amber-300 shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-950 dark:text-amber-200 truncate">
                      Guest
                    </p>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                      Sign In →
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="flex items-center gap-2.5">
                  <Avatar
                    src={user.avatarUrl}
                    name={user.name ?? user.username ?? "Student"}
                    size="sm"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {user.name ?? "Student"}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      @{user.username ?? "student"}
                    </p>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Theme Selector inside Drawer */}
            <ThemeToggle variant="dropdown-item" />

            {/* Drawer Links */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Main Menu
              </div>

              {primaryLinks.map((item, idx) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href as string);

                return (
                  <Link
                    key={idx}
                    href={item.href}
                    onClick={(e) => {
                      setIsDrawerOpen(false);
                      if (item.href === "/" && pathname === "/") {
                        e.preventDefault();
                        window.dispatchEvent(new CustomEvent("stunet:reset-feed"));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold ${
                      isActive
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`h-4 w-4 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded font-bold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}

              <div className="my-2 border-t border-slate-100 dark:border-slate-800" />

              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Campus Ecosystem
              </div>

              {campusLinks.map((item, idx) => {
                const Icon = item.icon;
                if (item.isExternal) {
                  return (
                    <a
                      key={idx}
                      href={item.href as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsDrawerOpen(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                        <span>{item.label}</span>
                      </div>
                      <ExternalLink className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                    </a>
                  );
                }

                const isActive = pathname.startsWith(item.href as string);
                return (
                  <Link
                    key={idx}
                    href={item.href as Route}
                    onClick={() => setIsDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                      isActive
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <div className="my-2 border-t border-slate-100 dark:border-slate-800" />

              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Account
              </div>

              <Link
                href={`/u/${user.username ?? user.id}` as Route}
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <User className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                <span>My Profile</span>
              </Link>
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
