"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import {
  GraduationCap,
  Home,
  Users,
  Compass,
  ShoppingBag,
  Building2,
  Search,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import NotificationBell from "./NotificationBell";
import { Avatar } from "@stunet/ui";

interface NavUser {
  id?: string | null;
  name?: string | null;
  username?: string | null;
  image?: string | null;
}

export default function AppNav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { href: "/", label: "Feed", icon: Home },
    { href: "/network", label: "Network", icon: Users },
    { href: "/clubs", label: "Clubs", icon: Compass },
    { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
    { href: "/campus", label: "Campus Hub", icon: Building2 },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Campus */}
        <div className="flex items-center gap-6">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                StuNet
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Student Community
              </span>
            </div>
          </Link>

          {/* Campus Tag */}
          <div className="hidden md:flex items-center gap-1.5 rounded-full bg-indigo-50/80 border border-indigo-100/80 px-2.5 py-1 text-xs font-medium text-indigo-700">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
            <span>NIAT Campus</span>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="hidden lg:flex items-center flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search posts, clubs, students, notes…"
              className="w-full rounded-full border border-slate-200 bg-slate-50/70 py-2 pl-10 pr-12 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
              <kbd>⌘</kbd>
              <kbd>K</kbd>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href as Route}
                className={`relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-semibold shadow-xs"
                    : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : "text-slate-500"}`} />
                <span className="hidden sm:inline">{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-indigo-600 sm:hidden" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Tray */}
        <div className="flex items-center gap-2 sm:gap-3 pl-2">
          <NotificationBell />

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-full p-1 hover:bg-slate-100 transition-colors focus:outline-none"
              aria-label="User menu"
            >
              <Avatar
                src={user.image}
                name={user.name ?? user.username ?? "Student"}
                size="sm"
                online={true}
              />
              <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-slate-400" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-xl shadow-slate-900/10 z-50 animate-in fade-in zoom-in-95">
                <div className="border-b border-slate-100 px-3 py-2.5">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {user.name ?? "Student"}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">@{user.username ?? "user"}</p>
                </div>

                <div className="py-1">
                  <Link
                    href={`/u/${user.username ?? user.id}` as Route}
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    href="/network"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                  >
                    <Users className="h-4 w-4" />
                    <span>My Network</span>
                  </Link>

                  <Link
                    href="/campus"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Campus Alerts & Exams</span>
                  </Link>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
