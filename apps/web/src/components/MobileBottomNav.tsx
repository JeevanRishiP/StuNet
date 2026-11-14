"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { Home, Users2, Trophy, Building2, User, Compass } from "lucide-react";
import { Avatar } from "@stunet/ui";

interface MobileBottomNavProps {
  user: {
    id: string;
    username?: string | null;
    avatarUrl?: string | null;
    name?: string | null;
    isGuest?: boolean;
    role?: string;
  };
  unreadCount?: number;
}

export default function MobileBottomNav({ user, unreadCount = 0 }: MobileBottomNavProps) {
  const pathname = usePathname();
  const isGuest = Boolean(user.isGuest || user.role === "GUEST");

  const navItems = isGuest
    ? [
        { href: "/" as Route, label: "Home", icon: Home },
        { href: "/success-board" as Route, label: "Success Board", icon: Trophy },
        { href: "/clubs" as Route, label: "NIAT Clubs", icon: Compass },
        {
          href: "/login" as Route,
          label: "Guest",
          icon: User,
          isProfile: true,
        },
      ]
    : [
        { href: "/" as Route, label: "Home", icon: Home },
        { href: "/network" as Route, label: "Network", icon: Users2 },
        { href: "/success-board" as Route, label: "Success Board", icon: Trophy },
        { href: "/campus" as Route, label: "Campus", icon: Building2 },
        {
          href: `/u/${user.username ?? user.id}` as Route,
          label: "Profile",
          icon: User,
          isProfile: true,
        },
      ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-[680px] mx-auto px-2 h-16 flex items-center justify-around">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href as string);

          if (item.isProfile) {
            return (
              <Link
                key={idx}
                href={item.href}
                className="flex flex-col items-center justify-center flex-1 py-1 relative group"
              >
                <div
                  className={`relative p-0.5 rounded-full transition-transform ${
                    isActive
                      ? "ring-2 ring-indigo-600 dark:ring-indigo-400 scale-105"
                      : "group-hover:scale-105"
                  }`}
                >
                  <Avatar src={user.avatarUrl} name={user.name ?? user.username ?? "U"} size="xs" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-rose-500" />
                  )}
                </div>
                <span
                  className={`text-[10px] font-semibold mt-1 transition-colors ${
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={idx}
              href={item.href}
              onClick={(e) => {
                if (item.href === "/" && pathname === "/") {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent("stunet:reset-feed"));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className="flex flex-col items-center justify-center flex-1 py-1 relative group"
            >
              <div className="relative">
                <Icon
                  className={`h-5 w-5 transition-transform group-hover:scale-110 ${
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] font-semibold mt-1 transition-colors ${
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
