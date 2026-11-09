"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
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
  Calendar,
  BookOpen,
  User,
} from "lucide-react";
import { Avatar } from "@stunet/ui";

interface InstagramLeftRailProps {
  user: {
    id: string;
    name?: string | null;
    username?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    isGuest?: boolean;
    role?: string;
  };
  isCollapsed: boolean;
  isSearchOpen?: boolean;
  isNotificationsOpen?: boolean;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onOpenCreatePost: () => void;
  onCloseDrawers?: () => void;
  unreadCount?: number;
  networkUnreadCount?: number;
}

export default function InstagramLeftRail({
  user,
  isCollapsed,
  isSearchOpen = false,
  isNotificationsOpen = false,
  onOpenSearch,
  onOpenNotifications,
  onOpenCreatePost,
  onCloseDrawers,
  unreadCount = 0,
  networkUnreadCount = 0,
}: InstagramLeftRailProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isGuest = Boolean(user.isGuest || user.role === "GUEST");

  const primaryItems: Array<{
    href?: Route;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    isAction?: boolean;
    isActive?: boolean;
    onClick?: (e?: React.MouseEvent) => void;
    badge?: string;
  }> = isGuest
    ? [
        {
          href: "/" as Route,
          label: "Home",
          icon: Home,
          onClick: (e?: React.MouseEvent) => {
            onCloseDrawers?.();
            if (pathname === "/") {
              e?.preventDefault();
              window.dispatchEvent(new CustomEvent("stunet:reset-feed"));
              window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
              router.push("/");
            }
          },
        },
        {
          label: "Search",
          icon: Search,
          isAction: true,
          isActive: isSearchOpen,
          onClick: onOpenSearch,
        },
        { href: "/success-board" as Route, label: "Success Board", icon: Trophy },
        { href: "/clubs" as Route, label: "NIAT Clubs", icon: Compass },
      ]
    : [
        {
          href: "/" as Route,
          label: "Home",
          icon: Home,
          onClick: (e?: React.MouseEvent) => {
            onCloseDrawers?.();
            if (pathname === "/") {
              e?.preventDefault();
              window.dispatchEvent(new CustomEvent("stunet:reset-feed"));
              window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
              router.push("/");
            }
          },
        },
        {
          label: "Search",
          icon: Search,
          isAction: true,
          isActive: isSearchOpen,
          onClick: onOpenSearch,
        },
        {
          label: "Notifications",
          icon: Bell,
          isAction: true,
          isActive: isNotificationsOpen,
          onClick: onOpenNotifications,
          badge: unreadCount > 0 ? (unreadCount > 9 ? "9+" : String(unreadCount)) : undefined,
        },
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
        {
          label: "Create",
          icon: PlusSquare,
          isAction: true,
          onClick: () => {
            onCloseDrawers?.();
            onOpenCreatePost();
          },
          badge: "+ Post",
        },
      ];

  const secondaryItems = isGuest
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
        { href: "/campus" as Route, label: "My Campus", icon: Building2, isExternal: false },
        { href: "/clubs" as Route, label: "NIAT Clubs", icon: Compass, isExternal: false },
        {
          href: "/marketplace" as Route,
          label: "Market Place (OLX)",
          icon: ShoppingBag,
          isExternal: false,
        },
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

  const profileHref = `/u/${user.username ?? user.id}` as Route;
  const isProfileActive = pathname.startsWith(`/u/${user.username ?? user.id}`);

  return (
    <aside
      className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-50 bg-white border-r border-slate-200 transition-all duration-300 ease-in-out ${
        isCollapsed
          ? "w-[72px]"
          : "w-[72px] hover:w-[244px] hover:shadow-2xl hover:border-slate-300 group/rail"
      }`}
    >
      {/* Top Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-100/60 shrink-0 overflow-hidden">
        <Link
          href="/"
          prefetch={true}
          onClick={(e) => {
            onCloseDrawers?.();
            if (pathname === "/") {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent("stunet:reset-feed"));
              window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
              router.push("/");
            }
          }}
          className="flex items-center gap-3 overflow-hidden group w-full cursor-pointer select-none"
        >
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-base shadow-sm shrink-0 group-hover:scale-105 transition-transform">
            S
          </div>
          <div className="flex flex-col min-w-0 opacity-0 group-hover/rail:opacity-100 w-0 max-w-0 group-hover/rail:w-auto group-hover/rail:max-w-[160px] overflow-hidden whitespace-nowrap transition-all duration-300">
            <span className="text-base font-black tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
              StuNet
            </span>
            <span className="text-[10px] font-semibold text-indigo-600 -mt-1 tracking-wider uppercase">
              NIAT Portal
            </span>
          </div>
        </Link>
      </div>

      {/* Main Navigation Scroll Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-2">
        {/* Primary Group */}
        <div className="space-y-0.5">
          {primaryItems.map((item, idx) => {
            const Icon = item.icon;
            if (item.isAction) {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={item.onClick}
                  title={item.label}
                  className={`w-full flex items-center h-10 px-3 rounded-xl text-xs font-semibold transition-all group/item cursor-pointer select-none ${
                    item.isActive
                      ? "bg-indigo-50 text-indigo-600 font-bold"
                      : item.label === "Create"
                        ? "text-indigo-600 hover:bg-indigo-50/80 font-bold"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="relative shrink-0 flex items-center justify-center">
                    <Icon
                      className={`h-5 w-5 shrink-0 group-hover/item:scale-110 transition-transform ${
                        item.isActive ? "text-indigo-600" : ""
                      }`}
                    />
                    {item.badge && (
                      <span
                        className={`group-hover/rail:hidden absolute -top-1 -right-1 h-2 w-2 rounded-full ring-2 ring-white ${
                          item.label === "Notifications" ? "bg-rose-500" : "bg-indigo-600"
                        }`}
                      />
                    )}
                  </div>
                  <span className="opacity-0 group-hover/rail:opacity-100 w-0 max-w-0 group-hover/rail:w-auto group-hover/rail:max-w-[140px] overflow-hidden whitespace-nowrap transition-all duration-300 group-hover/rail:pl-3.5 truncate flex-1 text-left">
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      className={`hidden group-hover/rail:inline-flex text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ml-1 ${
                        item.label === "Notifications"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
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
                prefetch={true}
                title={item.label}
                onClick={(e) => {
                  onCloseDrawers?.();
                  if (item.onClick) {
                    item.onClick(e);
                  } else if (pathname === targetHref) {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  } else {
                    router.push(targetHref);
                  }
                }}
                className={`w-full flex items-center h-10 px-3 rounded-xl text-xs font-semibold transition-all group/item cursor-pointer select-none ${
                  isActive
                    ? "bg-slate-100 text-indigo-600 font-bold"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className="relative shrink-0 flex items-center justify-center">
                  <Icon
                    className={`h-5 w-5 shrink-0 group-hover/item:scale-110 transition-transform ${
                      isActive
                        ? "text-indigo-600"
                        : "text-slate-500 group-hover/item:text-slate-800"
                    }`}
                  />
                  {item.badge && (
                    <span className="group-hover/rail:hidden absolute -top-1 -right-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                  )}
                </div>
                <span className="opacity-0 group-hover/rail:opacity-100 w-0 max-w-0 group-hover/rail:w-auto group-hover/rail:max-w-[140px] overflow-hidden whitespace-nowrap transition-all duration-300 group-hover/rail:pl-3.5 truncate flex-1 text-left">
                  {item.label}
                </span>
                {item.badge && (
                  <span className="hidden group-hover/rail:inline-flex text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold shrink-0 ml-1">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Separator & Campus Ecosystem Secondary Group */}
        <div className="space-y-0.5 pt-1.5 border-t border-slate-100">
          <div className="opacity-0 group-hover/rail:opacity-100 w-0 max-w-0 group-hover/rail:w-auto group-hover/rail:max-w-[160px] overflow-hidden whitespace-nowrap transition-all duration-300 group-hover/rail:px-3 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Campus Ecosystem
          </div>
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
                  className="w-full flex items-center h-10 px-3 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all group/item cursor-pointer select-none"
                >
                  <Icon className="h-5 w-5 shrink-0 text-slate-400 group-hover/item:text-slate-700 group-hover/item:scale-110 transition-transform" />
                  <span className="opacity-0 group-hover/rail:opacity-100 w-0 max-w-0 group-hover/rail:w-auto group-hover/rail:max-w-[140px] overflow-hidden whitespace-nowrap transition-all duration-300 group-hover/rail:pl-3.5 truncate flex-1 text-left">
                    {item.label}
                  </span>
                  <ExternalLink className="hidden group-hover/rail:inline-block h-3 w-3 text-slate-400 shrink-0 ml-1" />
                </a>
              );
            }

            return (
              <Link
                key={idx}
                href={item.href as Route}
                prefetch={true}
                title={item.label}
                onClick={(e) => {
                  onCloseDrawers?.();
                  if (pathname === (item.href as string)) {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  } else {
                    router.push(item.href as Route);
                  }
                }}
                className={`w-full flex items-center h-10 px-3 rounded-xl text-xs font-semibold transition-all group/item cursor-pointer select-none ${
                  isActive
                    ? "bg-slate-100 text-indigo-600 font-bold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 group-hover/item:scale-110 transition-transform ${
                    isActive ? "text-indigo-600" : "text-slate-400 group-hover/item:text-slate-700"
                  }`}
                />
                <span className="opacity-0 group-hover/rail:opacity-100 w-0 max-w-0 group-hover/rail:w-auto group-hover/rail:max-w-[140px] overflow-hidden whitespace-nowrap transition-all duration-300 group-hover/rail:pl-3.5 truncate flex-1 text-left">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom Pinned Group: Profile, Notifications & Settings */}
      <div className="p-2 border-t border-slate-100/80 space-y-1 relative shrink-0">
        {/* Profile Item with Notifications Trigger docked next to it */}
        <div
          className={`flex items-center rounded-xl transition-all ${
            isProfileActive ? "bg-slate-100" : "hover:bg-slate-50"
          } p-1 gap-1.5`}
        >
          {isGuest ? (
            <Link
              href="/login"
              prefetch={true}
              title="Guest — Click to Sign In"
              className="flex items-center gap-2.5 flex-1 min-w-0 p-1 cursor-pointer select-none"
            >
              <div className="relative shrink-0 flex flex-col items-center">
                <div className="h-8 w-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <span className="text-[8px] font-extrabold text-amber-700 tracking-tight leading-none mt-0.5 group-hover/rail:hidden">
                  GUEST
                </span>
              </div>
              <div className="flex flex-col min-w-0 opacity-0 group-hover/rail:opacity-100 w-0 max-w-0 group-hover/rail:w-auto group-hover/rail:max-w-[120px] overflow-hidden whitespace-nowrap transition-all duration-300">
                <span className="text-xs font-bold text-amber-950 truncate">Guest</span>
                <span className="text-[10px] text-amber-700 font-semibold truncate">Sign In →</span>
              </div>
            </Link>
          ) : (
            <Link
              href={profileHref}
              prefetch={true}
              title="My Profile"
              onClick={(e) => {
                onCloseDrawers?.();
                if (pathname === profileHref) {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else {
                  router.push(profileHref);
                }
              }}
              className="flex items-center gap-2.5 flex-1 min-w-0 p-1 cursor-pointer select-none"
            >
              <div className="relative shrink-0">
                <Avatar
                  src={user.avatarUrl}
                  name={user.name ?? user.username ?? "Student"}
                  size="sm"
                  online={true}
                />
                {unreadCount > 0 && (
                  <span className="group-hover/rail:hidden absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                )}
              </div>
              <div className="flex flex-col min-w-0 opacity-0 group-hover/rail:opacity-100 w-0 max-w-0 group-hover/rail:w-auto group-hover/rail:max-w-[120px] overflow-hidden whitespace-nowrap transition-all duration-300">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {user.name ?? "Student"}
                </span>
                <span className="text-[10px] text-slate-500 truncate">
                  @{user.username ?? "student"}
                </span>
              </div>
            </Link>
          )}
        </div>

        {/* Settings ("More" Instagram-Style Menu) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            title="More Options"
            className="w-full flex items-center h-10 px-3.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer select-none"
          >
            <MoreHorizontal className="h-5 w-5 shrink-0 text-slate-400" />
            <span className="opacity-0 group-hover/rail:opacity-100 w-0 max-w-0 group-hover/rail:w-auto group-hover/rail:max-w-[140px] overflow-hidden whitespace-nowrap transition-all duration-300 group-hover/rail:pl-3.5">
              More / Settings
            </span>
          </button>

          {showMoreMenu && (
            <>
              <div className="fixed inset-0 z-50" onClick={() => setShowMoreMenu(false)} />
              <div className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 w-56 z-50 animate-in fade-in zoom-in-95 duration-100">
                {isGuest ? (
                  <>
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">Guest</p>
                      <p className="text-[11px] text-amber-700 font-medium">Public Guest Mode</p>
                    </div>

                    <Link
                      href="/login"
                      onClick={() => setShowMoreMenu(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>Sign In with Campus Account</span>
                    </Link>

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      type="button"
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Exit Guest Mode</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">{user.name ?? "Student"}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email ?? ""}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        onOpenNotifications();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
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
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
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
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
