"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import InstagramLeftRail from "./InstagramLeftRail";
import MobileHeader from "./MobileHeader";
import MobileBottomNav from "./MobileBottomNav";
import SearchDrawer from "./SearchDrawer";
import GlobalNotificationsDrawer from "./GlobalNotificationsDrawer";
import GlobalCreatePostModal from "./GlobalCreatePostModal";

interface AppShellProps {
  user: {
    id: string;
    name?: string | null;
    username?: string | null;
    email?: string | null;
    avatarUrl?: string | null;
    role?: string;
    campusId?: string | null;
    campusName?: string | null;
    isGuest?: boolean;
  };
  children: React.ReactNode;
}

export default function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [networkUnreadCount, setNetworkUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || user.role === "GUEST") return;
    async function fetchUnread() {
      try {
        const res = await fetch("/api/notifications?unread=true");
        if (res.ok) {
          const d = await res.json();
          setUnreadCount(d.unreadCount ?? 0);
          setNetworkUnreadCount(d.networkUnreadCount ?? 0);
        }
      } catch {
        // silent
      }
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);

    function onUpdated() {
      void fetchUnread();
    }
    window.addEventListener("stunet:notifications-updated", onUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener("stunet:notifications-updated", onUpdated);
    };
  }, [user, isNotificationsOpen]);

  // Automatically close any slide-out drawer on page navigation
  useEffect(() => {
    setIsSearchOpen(false);
    setIsNotificationsOpen(false);
  }, [pathname]);

  // When either drawer is open on desktop, collapse the left sidebar to 72px icon-only mode
  const isRailCollapsed = isSearchOpen || isNotificationsOpen;

  function handleToggleSearch() {
    setIsNotificationsOpen(false);
    setIsSearchOpen((prev) => !prev);
  }

  function handleToggleNotifications() {
    setIsSearchOpen(false);
    setIsNotificationsOpen((prev) => !prev);
  }

  function handleCloseDrawers() {
    setIsSearchOpen(false);
    setIsNotificationsOpen(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col antialiased transition-colors duration-150">
      {/* Desktop Left Rail (>= 1024px) */}
      <InstagramLeftRail
        user={user}
        isCollapsed={isRailCollapsed}
        isSearchOpen={isSearchOpen}
        isNotificationsOpen={isNotificationsOpen}
        onOpenSearch={handleToggleSearch}
        onOpenNotifications={handleToggleNotifications}
        onOpenCreatePost={() => {
          if (!user.isGuest && user.role !== "GUEST") {
            setIsCreatePostOpen(true);
          }
        }}
        onCloseDrawers={handleCloseDrawers}
        unreadCount={unreadCount}
        networkUnreadCount={networkUnreadCount}
      />

      {/* Mobile/Tablet Sticky Header (< 1024px) */}
      <MobileHeader
        user={user}
        onOpenSearch={handleToggleSearch}
        onOpenNotifications={handleToggleNotifications}
        unreadCount={unreadCount}
        networkUnreadCount={networkUnreadCount}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 transition-all duration-300 ease-in-out lg:pl-[72px]">
        {user.isGuest && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-orange-500/10 border-b border-amber-300/70 dark:border-amber-700/50 px-4 py-2.5 text-xs text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider shrink-0">
                Guest Mode
              </span>
              <span>
                Exploring StuNet in public Guest mode. Campus clubs, posting, and student polls are
                restricted.
              </span>
            </div>
            <Link
              href="/login"
              className="text-[11px] font-bold text-amber-900 underline hover:text-amber-950 shrink-0"
            >
              Sign In with Campus Account →
            </Link>
          </div>
        )}
        <main className="w-full pb-20 lg:pb-12 min-h-screen">{children}</main>
      </div>

      {/* Mobile/Tablet Fixed Bottom Navigation (< 1024px) */}
      <MobileBottomNav user={user} />

      {/* Slide-Out Search Drawer */}
      <SearchDrawer isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Slide-Out Notifications Drawer */}
      <GlobalNotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* Global New Post Modal (Strictly disabled for Guests) */}
      {!user.isGuest && user.role !== "GUEST" && (
        <GlobalCreatePostModal
          isOpen={isCreatePostOpen}
          onClose={() => setIsCreatePostOpen(false)}
          onPostCreated={() => {
            if (typeof window !== "undefined") {
              window.location.reload();
            }
          }}
        />
      )}
    </div>
  );
}
