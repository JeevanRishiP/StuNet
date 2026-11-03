"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Home,
  Search,
  Users2,
  Trophy,
  Building2,
  PlusSquare,
  Compass,
  BarChart3,
  ShoppingBag,
  ExternalLink,
  Bell,
  LogOut,
  ShieldCheck,
  MoreHorizontal,
} from "lucide-react";
import { Avatar } from "@stunet/ui";

interface InstagramLeftRailProps {
  user: {
    id: string;
    name?: string | null;
    username?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
  };
  isCollapsed: boolean;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onOpenCreatePost: () => void;
  unreadCount?: number;
}

export default function InstagramLeftRail({
  user,
  isCollapsed,
  onOpenSearch,
  onOpenNotifications,
  onOpenCreatePost,
  unreadCount = 0,
}: InstagramLeftRailProps) {
  const pathname = usePathname();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const primaryItems = [
    { href: "/" as Route, label: "Home", icon: Home },
    {
      label: "Search",
      icon: Search,
      isAction: true,
      onClick: onOpenSearch,
    },
    { href: "/network" as Route, label: "My Network", icon: Users2 },
    { href: "/success-board" as Route, label: "Success Board", icon: Trophy },
    { href: "/campus" as Route, label: "My Campus", icon: Building2 },
    {
      label: "Create",
      icon: PlusSquare,
      isAction: true,
      onClick: onOpenCreatePost,
      badge: "+ Post",
    },
  ];

  const secondaryItems = [
    { href: "/clubs" as Route, label: "NIAT Clubs", icon: Compass, isExternal: false },
    { href: "/polls" as Route, label: "Poll", icon: BarChart3, isExternal: false },
    {
      href: "/marketplace" as Route,
      label: "Market Place (OLX)",
      icon: ShoppingBag,
      isExternal: false,
    },
    {
      href: "https://insider.niatindia.com",
      label: "NIAT Insider",
      icon: ExternalLink,
      isExternal: true,
    },
  ];

  const profileHref = `/u/${user.username ?? user.id}` as Route;
  const isProfileActive = pathname.startsWith(`/u/${user.username ?? user.id}`);

  return (
    <aside
      className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-[72px]" : "w-[244px]"
      }`}
    >
      {/* Top Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-100/60 shrink-0">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden group w-full">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-base shadow-sm shrink-0 group-hover:scale-105 transition-transform">
            S
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-base font-black tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                StuNet
              </span>
              <span className="text-[10px] font-semibold text-indigo-600 -mt-1 tracking-wider uppercase">
                NIAT Portal
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Main Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
        {/* Primary Group */}
        <div className="space-y-1">
          {primaryItems.map((item, idx) => {
            const Icon = item.icon;
            if (item.isAction) {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={item.onClick}
                  title={item.label}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    item.label === "Create"
                      ? "text-indigo-600 hover:bg-indigo-50/80 font-bold"
                      : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                  } ${isCollapsed ? "justify-center px-0" : ""}`}
                >
                  <Icon className="h-5 w-5 shrink-0 group-hover:scale-110 transition-transform" />
                  {!isCollapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
                  {!isCollapsed && item.badge && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            }

            const isActive = pathname === item.href;
            const targetHref = item.href ?? ("/" as Route);
            return (
              <Link
                key={idx}
                href={targetHref}
                title={item.label}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? "bg-slate-100 text-indigo-600 font-bold"
                    : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                } ${isCollapsed ? "justify-center px-0" : ""}`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 group-hover:scale-110 transition-transform ${
                    isActive ? "text-indigo-600" : "text-slate-500 group-hover:text-slate-800"
                  }`}
                />
                {!isCollapsed && <span className="truncate flex-1">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Separator & Campus Ecosystem Secondary Group */}
        <div className="space-y-1 pt-2 border-t border-slate-100">
          {!isCollapsed && (
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Campus Ecosystem
            </div>
          )}
          {secondaryItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = !item.isExternal && pathname.startsWith(item.href as string);

            if (item.isExternal) {
              return (
                <a
                  key={idx}
                  href={item.href as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={item.label}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 transition-all group ${
                    isCollapsed ? "justify-center px-0" : ""
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-slate-700 group-hover:scale-110 transition-transform" />
                  {!isCollapsed && (
                    <>
                      <span className="truncate flex-1">{item.label}</span>
                      <ExternalLink className="h-3 w-3 text-slate-400" />
                    </>
                  )}
                </a>
              );
            }

            return (
              <Link
                key={idx}
                href={item.href as Route}
                title={item.label}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? "bg-slate-100 text-indigo-600 font-bold"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                } ${isCollapsed ? "justify-center px-0" : ""}`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 group-hover:scale-110 transition-transform ${
                    isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-700"
                  }`}
                />
                {!isCollapsed && <span className="truncate flex-1">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom Pinned Group: Profile, Notifications & Settings */}
      <div className="p-2 border-t border-slate-100/80 space-y-1 relative shrink-0">
        {/* Profile Item with Notifications Trigger docked directly behind/next to it */}
        <div
          className={`flex items-center rounded-xl transition-all ${
            isProfileActive ? "bg-slate-100" : "hover:bg-slate-50"
          } ${isCollapsed ? "justify-center p-1" : "p-1.5 gap-1.5"}`}
        >
          <Link
            href={profileHref}
            title="My Profile"
            className="flex items-center gap-2.5 flex-1 min-w-0 p-1"
          >
            <div className="relative">
              <Avatar
                src={user.avatarUrl}
                name={user.name ?? user.username ?? "Student"}
                size="sm"
                online={true}
              />
              {unreadCount > 0 && isCollapsed && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {user.name ?? "Student"}
                </span>
                <span className="text-[10px] text-slate-500 truncate">
                  @{user.username ?? "student"}
                </span>
              </div>
            )}
          </Link>

          {/* Notifications Trigger docked right behind / next to Profile */}
          {!isCollapsed && (
            <button
              type="button"
              onClick={onOpenNotifications}
              title="Notifications"
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white relative shrink-0 transition-colors shadow-2xs border border-transparent hover:border-slate-200"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Settings ("More" Instagram-Style Menu) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            title="More Options"
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 transition-all ${
              isCollapsed ? "justify-center px-0" : ""
            }`}
          >
            <MoreHorizontal className="h-5 w-5 shrink-0 text-slate-400" />
            {!isCollapsed && <span>More / Settings</span>}
          </button>

          {showMoreMenu && (
            <>
              <div className="fixed inset-0 z-50" onClick={() => setShowMoreMenu(false)} />
              <div
                className={`absolute bottom-full mb-2 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 w-56 z-50 animate-in fade-in zoom-in-95 duration-100 ${
                  isCollapsed ? "left-2" : "left-0"
                }`}
              >
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">{user.name ?? "Student"}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user.email ?? ""}</p>
                </div>

                <button
                  type="button"
                  onClick={onOpenNotifications}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Bell className="h-4 w-4 text-slate-400" />
                  <span>Notifications Panel</span>
                  {unreadCount > 0 && (
                    <span className="ml-auto text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.2 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <Link
                  href={profileHref}
                  onClick={() => setShowMoreMenu(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <ShieldCheck className="h-4 w-4 text-slate-400" />
                  <span>Account Verification</span>
                </Link>

                <div className="my-1 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
