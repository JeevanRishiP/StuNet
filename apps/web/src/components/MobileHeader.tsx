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
  Compass,
  BarChart3,
  ShoppingBag,
  ExternalLink,
  LogOut,
  User,
} from "lucide-react";
import { Avatar } from "@stunet/ui";

interface MobileHeaderProps {
  user: {
    id: string;
    name?: string | null;
    username?: string | null;
    avatarUrl?: string | null;
  };
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  unreadCount?: number;
}

export default function MobileHeader({
  user,
  onOpenSearch,
  onOpenNotifications,
  unreadCount = 0,
}: MobileHeaderProps) {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const drawerLinks = [
    { href: "/clubs" as Route, label: "NIAT Clubs", icon: Compass },
    { href: "/polls" as Route, label: "Poll", icon: BarChart3 },
    { href: "/marketplace" as Route, label: "Market Place (OLX)", icon: ShoppingBag },
    {
      href: "https://insider.niatindia.com",
      label: "NIAT Insider",
      icon: ExternalLink,
      isExternal: true,
    },
  ];

  return (
    <>
      <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[680px] mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left: Hamburger + Logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="p-1.5 -ml-1.5 rounded-lg text-slate-700 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs">
                S
              </div>
              <span className="text-base font-black tracking-tight text-slate-900">StuNet</span>
            </Link>
          </div>

          {/* Right: Search & Notifications */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenSearch}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={onOpenNotifications}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 relative transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500" />
              )}
            </button>
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

          <div className="fixed top-0 bottom-0 left-0 w-72 bg-white z-50 shadow-2xl flex flex-col lg:hidden animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar
                  src={user.avatarUrl}
                  name={user.name ?? user.username ?? "Student"}
                  size="sm"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {user.name ?? "Student"}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    @{user.username ?? "student"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Links */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Campus Ecosystem
              </div>

              {drawerLinks.map((item, idx) => {
                const Icon = item.icon;
                if (item.isExternal) {
                  return (
                    <a
                      key={idx}
                      href={item.href as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsDrawerOpen(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-slate-400" />
                        <span>{item.label}</span>
                      </div>
                      <ExternalLink className="h-3 w-3 text-slate-400" />
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
                        ? "bg-indigo-50 text-indigo-600 font-bold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <div className="my-2 border-t border-slate-100" />

              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Account
              </div>

              <Link
                href={`/u/${user.username ?? user.id}` as Route}
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <User className="h-4 w-4 text-slate-400" />
                <span>My Profile</span>
              </Link>
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50"
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
